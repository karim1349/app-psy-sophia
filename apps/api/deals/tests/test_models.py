"""
Tests for deal models.

Comprehensive tests for all models with proper validation
and business logic testing.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.db import IntegrityError
from django.utils import timezone

from users.factories import UserFactory

from ..factories import (
    CommentFactory,
    DealCategoryFactory,
    DealFactory,
    InStoreDealFactory,
    OnlineDealFactory,
    VoteFactory,
)


@pytest.mark.django_db
class TestDealCategoryModel:
    """Test DealCategory model functionality."""

    def test_category_creation_with_valid_data(self) -> None:
        """Test category creation with valid data."""
        category = DealCategoryFactory()

        assert category.name is not None
        assert category.slug is not None
        assert category.is_active is True
        assert str(category) == category.name

    def test_category_slug_generation(self) -> None:
        """Test automatic slug generation."""
        category = DealCategoryFactory(name="Test Category")
        assert category.slug == "test-category"

    def test_category_unique_name(self) -> None:
        """Test that category names must be unique."""
        DealCategoryFactory(name="Electronics")

        with pytest.raises(IntegrityError):
            DealCategoryFactory(name="Electronics")

    def test_category_unique_slug(self) -> None:
        """Test that category slugs must be unique."""
        DealCategoryFactory(slug="electronics")

        with pytest.raises(IntegrityError):
            DealCategoryFactory(slug="electronics")


@pytest.mark.django_db
class TestDealModel:
    """Test Deal model functionality."""

    def test_deal_creation_with_valid_data(self) -> None:
        """Test deal creation with valid data."""
        deal = DealFactory()

        assert deal.title is not None
        assert deal.author is not None
        assert deal.category is not None
        assert deal.status == "active"
        assert str(deal) == deal.title

    def test_discount_percentage_calculation(self) -> None:
        """Test discount percentage calculation."""
        deal = DealFactory(
            current_price=Decimal("80.00"), original_price=Decimal("100.00")
        )

        assert deal.discount_percentage == 20.0

    def test_discount_percentage_no_original_price(self) -> None:
        """Test discount percentage when no original price."""
        deal = DealFactory(current_price=Decimal("80.00"), original_price=None)

        assert deal.discount_percentage == 0.0

    def test_discount_percentage_invalid_prices(self) -> None:
        """Test discount percentage with invalid price combination."""
        deal = DealFactory(
            current_price=Decimal("100.00"), original_price=Decimal("80.00")
        )

        assert deal.discount_percentage == 0.0

    def test_is_expired_property_with_status(self) -> None:
        """Test is_expired property when status is expired."""
        deal = DealFactory(status="expired")
        assert deal.is_expired is True

    def test_is_expired_property_with_date(self) -> None:
        """Test is_expired property when expires_at is in the past."""
        past_date = timezone.now() - timedelta(days=1)
        deal = DealFactory(expires_at=past_date)
        assert deal.is_expired is True

    def test_is_expired_property_active(self) -> None:
        """Test is_expired property for active deal."""
        future_date = timezone.now() + timedelta(days=1)
        deal = DealFactory(status="active", expires_at=future_date)
        assert deal.is_expired is False

    def test_online_deal_validation(self) -> None:
        """Test that online deals have URL."""
        deal = OnlineDealFactory()
        assert deal.channel == "online"
        assert deal.url is not None
        assert deal.url != ""

    def test_in_store_deal_validation(self) -> None:
        """Test that in-store deals have city."""
        deal = InStoreDealFactory()
        assert deal.channel == "in_store"
        assert deal.city is not None
        assert deal.city != ""

    def test_deal_auto_expiration_on_save(self) -> None:
        """Test that deals are auto-expired when expires_at is past."""
        past_date = timezone.now() - timedelta(hours=1)
        deal = DealFactory(expires_at=past_date, status="active")

        # Save should trigger auto-expiration
        deal.save()
        deal.refresh_from_db()

        assert deal.status == "expired"


@pytest.mark.django_db
class TestVoteModel:
    """Test Vote model functionality."""

    def test_vote_creation_with_valid_data(self) -> None:
        """Test vote creation with valid data."""
        vote = VoteFactory()

        assert vote.deal is not None
        assert vote.user is not None
        assert vote.vote_type in ["up", "down"]

    def test_vote_unique_constraint(self) -> None:
        """Test that users can only vote once per deal."""
        deal = DealFactory()
        user = UserFactory()

        VoteFactory(deal=deal, user=user, vote_type="up")

        with pytest.raises(IntegrityError):
            VoteFactory(deal=deal, user=user, vote_type="down")

    def test_vote_string_representation(self) -> None:
        """Test vote string representation."""
        vote = VoteFactory(vote_type="up")
        expected = f"{vote.user.username} upvoted {vote.deal.title}"
        assert str(vote) == expected

    def test_downvote_with_reason(self) -> None:
        """Test downvote creation with reason."""
        vote = VoteFactory(vote_type="down", reason="Price is wrong")
        assert vote.reason == "Price is wrong"

    def test_upvote_without_reason(self) -> None:
        """Test upvote creation without reason."""
        vote = VoteFactory(vote_type="up")
        assert vote.reason == ""


@pytest.mark.django_db
class TestCommentModel:
    """Test Comment model functionality."""

    def test_comment_creation_with_valid_data(self) -> None:
        """Test comment creation with valid data."""
        comment = CommentFactory()

        assert comment.deal is not None
        assert comment.user is not None
        assert comment.content is not None
        assert comment.parent is None
        assert comment.is_edited is False

    def test_comment_string_representation(self) -> None:
        """Test comment string representation."""
        comment = CommentFactory()
        expected = f"Comment by {comment.user.username} on {comment.deal.title}"
        assert str(comment) == expected

    def test_comment_reply_creation(self) -> None:
        """Test creating a reply to a comment."""
        parent_comment = CommentFactory()
        reply = CommentFactory(deal=parent_comment.deal, parent=parent_comment)

        assert reply.parent == parent_comment
        assert reply.deal == parent_comment.deal

    def test_comment_edit_tracking(self) -> None:
        """Test that comment edits are tracked."""
        comment = CommentFactory(content="Original content")

        # Simulate edit
        comment.content = "Edited content"
        comment.save()

        assert comment.is_edited is True

    def test_comment_no_edit_tracking_on_creation(self) -> None:
        """Test that new comments don't trigger edit tracking."""
        comment = CommentFactory()
        assert comment.is_edited is False

    def test_comment_content_length_validation(self) -> None:
        """Test comment content length constraints."""
        # This would be enforced at the serializer/form level
        # The model itself allows longer content
        long_content = "x" * 600
        comment = CommentFactory(content=long_content)
        assert len(comment.content) == 600
