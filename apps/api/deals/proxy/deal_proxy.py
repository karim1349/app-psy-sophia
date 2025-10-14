"""
Business logic layer for Deal model operations.

Contains all business logic for deal management, validation,
and complex operations following the proxy pattern.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Dict, Optional

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q, QuerySet
from django.utils import timezone

from ..models import Deal, DealCategory, Vote

if TYPE_CHECKING:
    from users.models import User
else:
    User = get_user_model()


class DealProxy:
    """Business logic layer for Deal model operations."""

    def __init__(self) -> None:
        self.model = Deal

    def get_by_id(self, deal_id: int) -> Optional[Deal]:
        """Get deal by ID."""
        try:
            return (
                self.model.objects.select_related("author", "category")
                .prefetch_related("votes", "comments")
                .get(id=deal_id)
            )
        except self.model.DoesNotExist:
            return None

    def get_active_deals(self) -> QuerySet[Deal]:
        """Get all active deals with optimized queries."""
        return (
            self.model.objects.filter(status="active")
            .select_related("author", "category")
            .prefetch_related("votes", "comments")
            .order_by("-created_at")
        )

    def get_deals_by_category(self, category_id: int) -> QuerySet[Deal]:
        """Get active deals by category."""
        return self.get_active_deals().filter(category_id=category_id)

    def get_deals_by_merchant(self, merchant: str) -> QuerySet[Deal]:
        """Get active deals by merchant."""
        return self.get_active_deals().filter(merchant__icontains=merchant)

    def get_deals_by_city(self, city: str) -> QuerySet[Deal]:
        """Get active deals by city."""
        return self.get_active_deals().filter(city__icontains=city)

    def get_hot_deals(self, hours: int = 24) -> QuerySet[Deal]:
        """
        Get hot deals based on recent voting activity.

        Args:
            hours: Time window for calculating hotness (default 24 hours)
        """
        cutoff_time = timezone.now() - timedelta(hours=hours)

        return (
            self.get_active_deals()
            .annotate(
                hot_score=Count(
                    "votes",
                    filter=Q(votes__vote_type="up", votes__created_at__gte=cutoff_time),
                )
                - Count(
                    "votes",
                    filter=Q(
                        votes__vote_type="down", votes__created_at__gte=cutoff_time
                    ),
                )
            )
            .filter(hot_score__gte=5)
            .order_by("-hot_score", "-created_at")
        )

    def get_top_deals(self, days: int = 30) -> QuerySet[Deal]:
        """
        Get top-rated deals based on all-time voting.

        Args:
            days: Time window for calculating top score (default 30 days)
        """
        cutoff_time = timezone.now() - timedelta(days=days)

        return (
            self.get_active_deals()
            .filter(created_at__gte=cutoff_time)
            .annotate(
                top_score=Count("votes", filter=Q(votes__vote_type="up"))
                - Count("votes", filter=Q(votes__vote_type="down"))
            )
            .order_by("-top_score", "-created_at")
        )

    @transaction.atomic
    def create_deal(
        self,
        title: str,
        description: str,
        current_price: float,
        merchant: str,
        category: DealCategory,
        author: User,
        channel: str,
        city: str = "",
        url: str = "",
        original_price: Optional[float] = None,
        image: Optional[Any] = None,
        proof_url: str = "",
        expires_at: Optional[datetime] = None,
    ) -> Deal:
        """
        Create a new deal with validation.

        Args:
            title: Deal title
            description: Deal description
            current_price: Current deal price
            merchant: Merchant name
            category: Deal category
            author: User creating the deal
            channel: 'online' or 'in_store'
            city: City (required for in_store)
            url: Deal URL (required for online)
            original_price: Original price (optional)
            image: Deal image (optional)
            proof_url: Proof URL (optional)
            expires_at: Expiration datetime (optional)

        Returns:
            Deal: Created deal instance

        Raises:
            ValidationError: If validation fails
        """
        # Validate channel-specific requirements
        if channel == "online" and not url:
            raise ValidationError("URL is required for online deals.")

        if channel == "in_store" and not city:
            raise ValidationError("City is required for in-store deals.")

        # Validate prices
        if current_price <= 0:
            raise ValidationError("Current price must be greater than 0.")

        if original_price and original_price <= current_price:
            raise ValidationError("Original price must be higher than current price.")

        # Check for duplicate deals (same title by same author)
        if self.model.objects.filter(
            title__iexact=title, author=author, status="active"
        ).exists():
            raise ValidationError("You already have an active deal with this title.")

        # Require at least one proof (image or proof_url)
        if not image and not proof_url:
            raise ValidationError("At least one proof (image or URL) is required.")

        # Create the deal
        deal = self.model.objects.create(
            title=title,
            description=description,
            current_price=current_price,
            original_price=original_price,
            merchant=merchant,
            category=category,
            author=author,
            channel=channel,
            city=city,
            url=url,
            image=image,
            proof_url=proof_url,
            expires_at=expires_at,
        )

        return deal

    @transaction.atomic
    def update_deal(self, deal: Deal, user: User, **update_fields: Any) -> Deal:
        """
        Update a deal with validation.

        Args:
            deal: Deal to update
            user: User requesting the update
            **update_fields: Fields to update

        Returns:
            Deal: Updated deal instance

        Raises:
            ValidationError: If validation fails
        """
        # Only author or staff can update
        if deal.author != user and not user.is_staff:
            raise ValidationError("Only the author or staff can update this deal.")

        # Validate price updates
        if "current_price" in update_fields:
            current_price = Decimal(str(update_fields["current_price"]))
            if current_price <= 0:
                raise ValidationError("Current price must be greater than 0.")
            update_fields["current_price"] = current_price

        if "original_price" in update_fields:
            original_price = Decimal(str(update_fields["original_price"]))
            current_price = update_fields.get("current_price", deal.current_price)
            if original_price and original_price <= current_price:
                raise ValidationError(
                    "Original price must be higher than current price."
                )
            update_fields["original_price"] = original_price

        # Update fields
        for field, value in update_fields.items():
            if hasattr(deal, field):
                setattr(deal, field, value)

        deal.save()
        return deal

    def deactivate_deal(self, deal: Deal, user: User) -> Deal:
        """
        Deactivate a deal (set status to expired).

        Args:
            deal: Deal to deactivate
            user: User requesting deactivation

        Returns:
            Deal: Updated deal instance

        Raises:
            ValidationError: If user doesn't have permission
        """
        if deal.author != user and not user.is_staff:
            raise ValidationError("Only the author or staff can deactivate this deal.")

        deal.status = "expired"
        deal.save(update_fields=["status", "updated_at"])
        return deal

    def vote_on_deal(
        self, deal: Deal, user: User, vote_type: str, reason: str = ""
    ) -> Dict[str, Any]:
        """
        Vote on a deal (upvote or downvote).

        Args:
            deal: Deal to vote on
            user: User casting the vote
            vote_type: 'up' or 'down'
            reason: Optional reason for downvote

        Returns:
            Dict with vote information and updated counts

        Raises:
            ValidationError: If validation fails
        """
        if vote_type not in ["up", "down"]:
            raise ValidationError("Vote type must be 'up' or 'down'.")

        if vote_type == "down" and not reason:
            raise ValidationError("Reason is required for downvotes.")

        # Check if user already voted
        existing_vote = Vote.objects.filter(deal=deal, user=user).first()

        if existing_vote:
            if existing_vote.vote_type == vote_type:
                # Same vote type - remove vote
                existing_vote.delete()
                vote = None
            else:
                # Different vote type - update vote
                existing_vote.vote_type = vote_type
                existing_vote.reason = reason
                existing_vote.save()
                vote = existing_vote
        else:
            # New vote
            vote = Vote.objects.create(
                deal=deal, user=user, vote_type=vote_type, reason=reason
            )

        # Calculate updated vote count
        vote_count = (
            deal.votes.filter(vote_type="up").count()
            - deal.votes.filter(vote_type="down").count()
        )

        return {
            "vote": vote,
            "vote_count": vote_count,
            "user_vote": vote.vote_type if vote else None,
        }

    def get_deal_vote_count(self, deal: Deal) -> int:
        """Get net vote count for a deal."""
        return (
            deal.votes.filter(vote_type="up").count()
            - deal.votes.filter(vote_type="down").count()
        )

    def get_user_vote(self, deal: Deal, user: User) -> Optional[str]:
        """Get user's vote on a deal."""
        vote = deal.votes.filter(user=user).first()
        return vote.vote_type if vote else None

    def search_deals(
        self,
        query: str,
        category_id: Optional[int] = None,
        merchant: Optional[str] = None,
        city: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
    ) -> QuerySet[Deal]:
        """
        Search deals with filters.

        Args:
            query: Search query for title/description
            category_id: Filter by category
            merchant: Filter by merchant
            city: Filter by city
            min_price: Minimum price filter
            max_price: Maximum price filter

        Returns:
            QuerySet of matching deals
        """
        queryset = self.get_active_deals()

        if query:
            queryset = queryset.filter(
                Q(title__icontains=query) | Q(description__icontains=query)
            )

        if category_id:
            queryset = queryset.filter(category_id=category_id)

        if merchant:
            queryset = queryset.filter(merchant__icontains=merchant)

        if city:
            queryset = queryset.filter(city__icontains=city)

        if min_price is not None:
            queryset = queryset.filter(current_price__gte=min_price)

        if max_price is not None:
            queryset = queryset.filter(current_price__lte=max_price)

        return queryset

    def expire_old_deals(self) -> int:
        """
        Expire deals that have passed their expiration date.

        Returns:
            Number of deals expired
        """
        expired_count = self.model.objects.filter(
            status="active", expires_at__lte=timezone.now()
        ).update(status="expired")

        return expired_count
