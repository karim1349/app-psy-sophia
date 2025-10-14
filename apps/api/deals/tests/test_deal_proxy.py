"""
Tests for DealProxy business logic.

Comprehensive tests for all DealProxy methods with proper validation
and error handling testing.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from users.factories import UserFactory

from ..factories import DealCategoryFactory, DealFactory, VoteFactory
from ..models import Deal, Vote
from ..proxy.deal_proxy import DealProxy


@pytest.mark.django_db
class TestDealProxy:
    """Test DealProxy business logic."""

    def __init__(self) -> None:
        """Initialize test class."""
        super().__init__()
        self.proxy = DealProxy()

    def test_get_by_id_existing(self) -> None:
        """Test getting deal by existing ID."""
        deal = DealFactory()
        result = self.proxy.get_by_id(deal.id)

        assert result is not None
        assert result.id == deal.id

    def test_get_by_id_non_existing(self) -> None:
        """Test getting deal by non-existing ID."""
        result = self.proxy.get_by_id(99999)
        assert result is None

    def test_get_active_deals(self) -> None:
        """Test getting active deals."""
        DealFactory.create_batch(3, status="active")
        DealFactory(status="expired")

        result = self.proxy.get_active_deals()
        assert result.count() == 3

    def test_get_deals_by_category(self) -> None:
        """Test getting deals by category."""
        category = DealCategoryFactory()
        DealFactory.create_batch(2, category=category)
        DealFactory()  # Different category

        result = self.proxy.get_deals_by_category(category.id)
        assert result.count() == 2

    def test_get_deals_by_merchant(self) -> None:
        """Test getting deals by merchant."""
        DealFactory.create_batch(2, merchant="Test Store")
        DealFactory(merchant="Other Store")

        result = self.proxy.get_deals_by_merchant("Test Store")
        assert result.count() == 2

    def test_get_deals_by_city(self) -> None:
        """Test getting deals by city."""
        DealFactory.create_batch(2, city="Casablanca")
        DealFactory(city="Rabat")

        result = self.proxy.get_deals_by_city("Casablanca")
        assert result.count() == 2

    def test_get_hot_deals(self) -> None:
        """Test getting hot deals."""
        # Create deals with recent votes
        deal1 = DealFactory()
        deal2 = DealFactory()
        deal3 = DealFactory()

        # Add votes to make deals hot
        VoteFactory.create_batch(6, deal=deal1, vote_type="up")
        VoteFactory.create_batch(5, deal=deal2, vote_type="up")
        VoteFactory.create_batch(2, deal=deal3, vote_type="up")

        result = self.proxy.get_hot_deals()
        # Only deals with 5+ net votes should be included
        assert result.count() == 2

    def test_get_top_deals(self) -> None:
        """Test getting top deals."""
        deal1 = DealFactory()
        deal2 = DealFactory()

        # Add votes to make deals top-rated
        VoteFactory.create_batch(5, deal=deal1, vote_type="up")
        VoteFactory.create_batch(2, deal=deal2, vote_type="up")

        result = self.proxy.get_top_deals()
        assert result.count() == 2

    def test_create_deal_valid_online(self) -> None:
        """Test creating valid online deal."""
        user = UserFactory()
        category = DealCategoryFactory()

        deal = self.proxy.create_deal(
            title="Test Online Deal",
            description="This is a test online deal",
            current_price=99.99,
            merchant="Test Store",
            category=category,
            author=user,
            channel="online",
            url="https://example.com/deal",
            proof_url="https://example.com/proof.jpg",
        )

        assert deal.title == "Test Online Deal"
        assert deal.channel == "online"
        assert deal.url == "https://example.com/deal"
        assert deal.author == user

    def test_create_deal_valid_in_store(self) -> None:
        """Test creating valid in-store deal."""
        user = UserFactory()
        category = DealCategoryFactory()

        deal = self.proxy.create_deal(
            title="Test In-Store Deal",
            description="This is a test in-store deal",
            current_price=99.99,
            merchant="Test Store",
            category=category,
            author=user,
            channel="in_store",
            city="Casablanca",
            proof_url="https://example.com/proof.jpg",
        )

        assert deal.title == "Test In-Store Deal"
        assert deal.channel == "in_store"
        assert deal.city == "Casablanca"

    def test_create_deal_online_missing_url(self) -> None:
        """Test creating online deal without URL."""
        user = UserFactory()
        category = DealCategoryFactory()

        with pytest.raises(ValidationError, match="URL is required for online deals"):
            self.proxy.create_deal(
                title="Test Deal",
                description="Test description",
                current_price=99.99,
                merchant="Test Store",
                category=category,
                author=user,
                channel="online",
                proof_url="https://example.com/proof.jpg",
            )

    def test_create_deal_in_store_missing_city(self) -> None:
        """Test creating in-store deal without city."""
        user = UserFactory()
        category = DealCategoryFactory()

        with pytest.raises(
            ValidationError, match="City is required for in-store deals"
        ):
            self.proxy.create_deal(
                title="Test Deal",
                description="Test description",
                current_price=99.99,
                merchant="Test Store",
                category=category,
                author=user,
                channel="in_store",
                proof_url="https://example.com/proof.jpg",
            )

    def test_create_deal_missing_proof(self) -> None:
        """Test creating deal without any proof."""
        user = UserFactory()
        category = DealCategoryFactory()

        with pytest.raises(ValidationError, match="At least one proof"):
            self.proxy.create_deal(
                title="Test Deal",
                description="Test description",
                current_price=99.99,
                merchant="Test Store",
                category=category,
                author=user,
                channel="online",
                url="https://example.com/deal",
            )

    def test_create_deal_invalid_price(self) -> None:
        """Test creating deal with invalid price."""
        user = UserFactory()
        category = DealCategoryFactory()

        with pytest.raises(
            ValidationError, match="Current price must be greater than 0"
        ):
            self.proxy.create_deal(
                title="Test Deal",
                description="Test description",
                current_price=0,
                merchant="Test Store",
                category=category,
                author=user,
                channel="online",
                url="https://example.com/deal",
                proof_url="https://example.com/proof.jpg",
            )

    def test_create_deal_invalid_original_price(self) -> None:
        """Test creating deal with invalid original price."""
        user = UserFactory()
        category = DealCategoryFactory()

        with pytest.raises(
            ValidationError, match="Original price must be higher than current price"
        ):
            self.proxy.create_deal(
                title="Test Deal",
                description="Test description",
                current_price=100.0,
                original_price=80.0,  # Lower than current price
                merchant="Test Store",
                category=category,
                author=user,
                channel="online",
                url="https://example.com/deal",
                proof_url="https://example.com/proof.jpg",
            )

    def test_create_deal_duplicate_title(self) -> None:
        """Test creating deal with duplicate title by same author."""
        user = UserFactory()
        category = DealCategoryFactory()

        # Create first deal
        self.proxy.create_deal(
            title="Duplicate Title",
            description="First deal",
            current_price=99.99,
            merchant="Test Store",
            category=category,
            author=user,
            channel="online",
            url="https://example.com/deal1",
            proof_url="https://example.com/proof.jpg",
        )

        # Try to create duplicate
        with pytest.raises(
            ValidationError, match="already have an active deal with this title"
        ):
            self.proxy.create_deal(
                title="Duplicate Title",
                description="Second deal",
                current_price=79.99,
                merchant="Test Store",
                category=category,
                author=user,
                channel="online",
                url="https://example.com/deal2",
                proof_url="https://example.com/proof.jpg",
            )

    def test_update_deal_by_author(self) -> None:
        """Test updating deal by author."""
        user = UserFactory()
        deal = DealFactory(author=user)

        result = self.proxy.update_deal(
            deal=deal, user=user, title="Updated Title", current_price=79.99
        )

        assert result.title == "Updated Title"
        assert result.current_price == Decimal("79.99")

    def test_update_deal_by_non_author(self) -> None:
        """Test updating deal by non-author."""
        author = UserFactory()
        other_user = UserFactory()
        deal = DealFactory(author=author)

        with pytest.raises(ValidationError, match="Only the author or staff"):
            self.proxy.update_deal(deal=deal, user=other_user, title="Updated Title")

    def test_update_deal_by_staff(self) -> None:
        """Test updating deal by staff member."""
        author = UserFactory()
        staff_user = UserFactory(is_staff=True)
        deal = DealFactory(author=author)

        result = self.proxy.update_deal(
            deal=deal, user=staff_user, title="Updated by Staff"
        )

        assert result.title == "Updated by Staff"

    def test_vote_on_deal_upvote(self) -> None:
        """Test upvoting a deal."""
        deal = DealFactory()
        user = UserFactory()

        result = self.proxy.vote_on_deal(deal, user, "up")

        assert result["user_vote"] == "up"
        assert result["vote_count"] == 1
        assert Vote.objects.filter(deal=deal, user=user).exists()

    def test_vote_on_deal_downvote_with_reason(self) -> None:
        """Test downvoting a deal with reason."""
        deal = DealFactory()
        user = UserFactory()

        result = self.proxy.vote_on_deal(deal, user, "down", "Price is wrong")

        assert result["user_vote"] == "down"
        assert result["vote_count"] == -1

        vote = Vote.objects.get(deal=deal, user=user)
        assert vote.reason == "Price is wrong"

    def test_vote_on_deal_downvote_without_reason(self) -> None:
        """Test downvoting without reason."""
        deal = DealFactory()
        user = UserFactory()

        with pytest.raises(ValidationError, match="Reason is required for downvotes"):
            self.proxy.vote_on_deal(deal, user, "down")

    def test_vote_on_deal_invalid_type(self) -> None:
        """Test voting with invalid vote type."""
        deal = DealFactory()
        user = UserFactory()

        with pytest.raises(ValidationError, match="Vote type must be 'up' or 'down'"):
            self.proxy.vote_on_deal(deal, user, "invalid")

    def test_vote_on_deal_change_vote(self) -> None:
        """Test changing vote from up to down."""
        deal = DealFactory()
        user = UserFactory()

        # First vote up
        self.proxy.vote_on_deal(deal, user, "up")

        # Change to down
        result = self.proxy.vote_on_deal(deal, user, "down", "Changed my mind")

        assert result["user_vote"] == "down"
        assert result["vote_count"] == -1

    def test_vote_on_deal_remove_vote(self) -> None:
        """Test removing vote by voting same type again."""
        deal = DealFactory()
        user = UserFactory()

        # First vote up
        self.proxy.vote_on_deal(deal, user, "up")

        # Vote up again to remove
        result = self.proxy.vote_on_deal(deal, user, "up")

        assert result["user_vote"] is None
        assert result["vote_count"] == 0
        assert not Vote.objects.filter(deal=deal, user=user).exists()

    def test_deactivate_deal_by_author(self) -> None:
        """Test deactivating deal by author."""
        user = UserFactory()
        deal = DealFactory(author=user)

        result = self.proxy.deactivate_deal(deal, user)

        assert result.status == "expired"

    def test_deactivate_deal_by_non_author(self) -> None:
        """Test deactivating deal by non-author."""
        author = UserFactory()
        other_user = UserFactory()
        deal = DealFactory(author=author)

        with pytest.raises(ValidationError, match="Only the author or staff"):
            self.proxy.deactivate_deal(deal, other_user)

    def test_deactivate_deal_by_staff(self) -> None:
        """Test deactivating deal by staff member."""
        author = UserFactory()
        staff_user = UserFactory(is_staff=True)
        deal = DealFactory(author=author)

        result = self.proxy.deactivate_deal(deal, staff_user)

        assert result.status == "expired"

    def test_get_deal_vote_count(self) -> None:
        """Test getting vote count for a deal."""
        deal = DealFactory()

        VoteFactory.create_batch(3, deal=deal, vote_type="up")
        VoteFactory.create_batch(1, deal=deal, vote_type="down")

        result = self.proxy.get_deal_vote_count(deal)
        assert result == 2  # 3 up - 1 down

    def test_get_user_vote(self) -> None:
        """Test getting user's vote on a deal."""
        deal = DealFactory()
        user = UserFactory()

        # No vote initially
        result = self.proxy.get_user_vote(deal, user)
        assert result is None

        # After voting
        VoteFactory(deal=deal, user=user, vote_type="up")
        result = self.proxy.get_user_vote(deal, user)
        assert result == "up"

    def test_search_deals(self) -> None:
        """Test searching deals with various filters."""
        category = DealCategoryFactory()

        DealFactory(
            title="iPhone Deal",
            description="Great phone",
            category=category,
            channel="online",
            url="https://example.com",
        )
        DealFactory(
            title="Android Phone",
            description="Another phone",
            merchant="TechStore",
            category=DealCategoryFactory(),
            channel="online",
            url="https://example.com",
        )
        DealFactory(
            title="Laptop Sale",
            description="Computer deal",
            city="Casablanca",
            category=DealCategoryFactory(),
            channel="in_store",
        )

        # Search by query
        result = self.proxy.search_deals("phone")
        assert result.count() == 2

        # Search by category
        result = self.proxy.search_deals("", category_id=category.id)
        assert result.count() == 1

        # Search by merchant
        result = self.proxy.search_deals("", merchant="TechStore")
        assert result.count() == 1

        # Search by city
        result = self.proxy.search_deals("", city="Casablanca")
        assert result.count() == 1

    def test_search_deals_with_price_filters(self) -> None:
        """Test searching deals with price filters."""
        DealFactory(current_price=Decimal("50.00"))
        DealFactory(current_price=Decimal("100.00"))
        DealFactory(current_price=Decimal("150.00"))

        # Min price filter
        result = self.proxy.search_deals("", min_price=75.0)
        assert result.count() == 2

        # Max price filter
        result = self.proxy.search_deals("", max_price=125.0)
        assert result.count() == 2

        # Price range filter
        result = self.proxy.search_deals("", min_price=75.0, max_price=125.0)
        assert result.count() == 1

    def test_expire_old_deals(self) -> None:
        """Test expiring deals that have passed their expiration date."""
        past_date = timezone.now() - timedelta(hours=1)
        future_date = timezone.now() + timedelta(hours=1)

        # Create deals with future expiration dates first, then update them
        expired_deal1 = DealFactory(expires_at=future_date, status="active")
        expired_deal2 = DealFactory(expires_at=future_date, status="active")
        active_deal = DealFactory(expires_at=future_date, status="active")
        no_expiry_deal = DealFactory(expires_at=None, status="active")

        # Update first two deals with past expiration dates without triggering save()
        Deal.objects.filter(id__in=[expired_deal1.id, expired_deal2.id]).update(
            expires_at=past_date
        )

        result = self.proxy.expire_old_deals()

        assert result == 2  # Two deals should be expired

        # Verify deals are expired
        expired_deal1.refresh_from_db()
        expired_deal2.refresh_from_db()
        active_deal.refresh_from_db()
        no_expiry_deal.refresh_from_db()

        assert expired_deal1.status == "expired"
        assert expired_deal2.status == "expired"
        assert active_deal.status == "active"
        assert no_expiry_deal.status == "active"
