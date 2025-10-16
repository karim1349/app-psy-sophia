"""
Tests for deal serializers.

Comprehensive tests for all serializers with validation
and business logic testing.
"""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

from users.factories import UserFactory

from ..factories import CommentFactory, DealCategoryFactory, DealFactory
from ..serializers import (
    CommentCreateSerializer,
    CommentUpdateSerializer,
    DealCategoryCreateSerializer,
    DealCategorySerializer,
    DealCreateSerializer,
    DealSerializer,
    VoteCreateSerializer,
)

User = get_user_model()


@pytest.mark.django_db
class TestDealCategorySerializer:
    """Test DealCategorySerializer functionality."""

    def test_category_serialization(self) -> None:
        """Test category serialization."""
        category = DealCategoryFactory()
        serializer = DealCategorySerializer(category)

        data = serializer.data
        assert data["id"] == category.id
        assert data["name"] == category.name
        assert data["slug"] == category.slug
        assert "deal_count" in data

    def test_category_create_serializer_valid_data(self) -> None:
        """Test category creation with valid data."""
        user = UserFactory(is_staff=True)
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = user

        data = {"name": "Electronics", "icon": "laptop", "color": "#FF5722"}

        serializer = DealCategoryCreateSerializer(
            data=data, context={"request": request}
        )
        assert serializer.is_valid()

        category = serializer.save()
        assert category.name == "Electronics"
        assert category.icon == "laptop"
        assert category.color == "#FF5722"


@pytest.mark.django_db
class TestDealSerializer:
    """Test DealSerializer functionality."""

    def test_deal_serialization(self) -> None:
        """Test deal serialization with all fields."""
        deal = DealFactory()
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = UserFactory()

        serializer = DealSerializer(deal, context={"request": request})

        data = serializer.data
        assert data["id"] == deal.id
        assert data["title"] == deal.title
        assert data["current_price"] == str(deal.current_price)
        assert data["discount_percentage"] == deal.discount_percentage
        assert "vote_count" in data
        assert "comment_count" in data
        assert "user_vote" in data

    def test_deal_serialization_with_discount(self) -> None:
        """Test deal serialization with discount calculation."""
        deal = DealFactory(
            current_price=Decimal("80.00"), original_price=Decimal("100.00")
        )

        serializer = DealSerializer(deal)
        data = serializer.data

        assert data["discount_percentage"] == 20.0


@pytest.mark.django_db
class TestDealCreateSerializer:
    """Test DealCreateSerializer functionality."""

    def test_valid_online_deal_creation(self) -> None:
        """Test creating valid online deal."""
        user = UserFactory()
        category = DealCategoryFactory()
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = user

        data = {
            "title": "Great Online Deal",
            "description": "This is a great deal online",
            "current_price": "99.99",
            "original_price": "149.99",
            "currency": "MAD",
            "merchant": "Test Store",
            "category": category.id,
            "channel": "online",
            "url": "https://example.com/deal",
            "proof_url": "https://example.com/proof.jpg",
        }

        serializer = DealCreateSerializer(data=data, context={"request": request})
        assert serializer.is_valid()

        deal = serializer.save()
        assert deal.title == "Great Online Deal"
        assert deal.channel == "online"
        assert deal.url == "https://example.com/deal"
        assert deal.author == user

    def test_valid_in_store_deal_creation(self) -> None:
        """Test creating valid in-store deal."""
        user = UserFactory()
        category = DealCategoryFactory()
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = user

        data = {
            "title": "Great In-Store Deal",
            "description": "This is a great deal in store",
            "current_price": "99.99",
            "merchant": "Test Store",
            "category": category.id,
            "channel": "in_store",
            "city": "Casablanca",
            "proof_url": "https://example.com/proof.jpg",
        }

        serializer = DealCreateSerializer(data=data, context={"request": request})
        assert serializer.is_valid()

        deal = serializer.save()
        assert deal.channel == "in_store"
        assert deal.city == "Casablanca"

    def test_online_deal_missing_url(self) -> None:
        """Test online deal validation without URL."""
        category = DealCategoryFactory()

        data = {
            "title": "Online Deal",
            "description": "This is an online deal",
            "current_price": "99.99",
            "merchant": "Test Store",
            "category": category.id,
            "channel": "online",
            "proof_url": "https://example.com/proof.jpg",
            # Missing URL
        }

        serializer = DealCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "url" in serializer.errors

    def test_in_store_deal_missing_city(self) -> None:
        """Test in-store deal validation without city."""
        category = DealCategoryFactory()

        data = {
            "title": "In-Store Deal",
            "description": "This is an in-store deal",
            "current_price": "99.99",
            "merchant": "Test Store",
            "category": category.id,
            "channel": "in_store",
            "proof_url": "https://example.com/proof.jpg",
            # Missing city
        }

        serializer = DealCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "city" in serializer.errors

    def test_deal_missing_proof(self) -> None:
        """Test deal validation without any proof."""
        category = DealCategoryFactory()

        data = {
            "title": "Deal Without Proof",
            "description": "This deal has no proof",
            "current_price": "99.99",
            "merchant": "Test Store",
            "category": category.id,
            "channel": "online",
            "url": "https://example.com/deal",
            # Missing image and proof_url
        }

        serializer = DealCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "deals.validation.proofRequired" in str(serializer.errors)

    def test_invalid_price_combination(self) -> None:
        """Test validation with invalid price combination."""
        category = DealCategoryFactory()

        data = {
            "title": "Invalid Price Deal",
            "description": "This deal has invalid prices",
            "current_price": "149.99",
            "original_price": "99.99",  # Lower than current price
            "merchant": "Test Store",
            "category": category.id,
            "channel": "online",
            "url": "https://example.com/deal",
            "proof_url": "https://example.com/proof.jpg",
        }

        serializer = DealCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "original_price" in serializer.errors

    def test_title_too_short(self) -> None:
        """Test title length validation."""
        category = DealCategoryFactory()

        data = {
            "title": "Hi",  # Too short
            "description": "This is a valid description",
            "current_price": "99.99",
            "merchant": "Test Store",
            "category": category.id,
            "channel": "online",
            "url": "https://example.com/deal",
            "proof_url": "https://example.com/proof.jpg",
        }

        serializer = DealCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "title" in serializer.errors

    def test_description_too_short(self) -> None:
        """Test description length validation."""
        category = DealCategoryFactory()

        data = {
            "title": "Valid Title",
            "description": "Short",  # Too short
            "current_price": "99.99",
            "merchant": "Test Store",
            "category": category.id,
            "channel": "online",
            "url": "https://example.com/deal",
            "proof_url": "https://example.com/proof.jpg",
        }

        serializer = DealCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "description" in serializer.errors


@pytest.mark.django_db
class TestVoteCreateSerializer:
    """Test VoteCreateSerializer functionality."""

    def test_valid_upvote(self) -> None:
        """Test valid upvote creation."""
        data = {"vote_type": "up"}

        serializer = VoteCreateSerializer(data=data)
        assert serializer.is_valid()

    def test_valid_downvote_with_reason(self) -> None:
        """Test valid downvote with reason."""
        data = {"vote_type": "down", "reason": "Price is incorrect"}

        serializer = VoteCreateSerializer(data=data)
        assert serializer.is_valid()

    def test_downvote_without_reason(self) -> None:
        """Test downvote validation without reason."""
        data = {"vote_type": "down"}

        serializer = VoteCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "reason" in serializer.errors

    def test_invalid_vote_type(self) -> None:
        """Test invalid vote type."""
        data = {"vote_type": "invalid"}

        serializer = VoteCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "vote_type" in serializer.errors


@pytest.mark.django_db
class TestCommentCreateSerializer:
    """Test CommentCreateSerializer functionality."""

    def test_valid_comment_creation(self) -> None:
        """Test valid comment creation."""
        deal = DealFactory()
        user = UserFactory()
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = user

        data = {"content": "This is a great deal!"}

        serializer = CommentCreateSerializer(
            data=data, context={"request": request, "deal": deal}
        )
        assert serializer.is_valid()

        comment = serializer.save()
        assert comment.content == "This is a great deal!"
        assert comment.user == user
        assert comment.deal == deal

    def test_comment_content_too_short(self) -> None:
        """Test comment content validation."""
        data = {"content": ""}

        serializer = CommentCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "content" in serializer.errors

    def test_comment_content_too_long(self) -> None:
        """Test comment content length validation."""
        data = {"content": "x" * 501}  # Too long

        serializer = CommentCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "content" in serializer.errors

    def test_comment_reply_creation(self) -> None:
        """Test creating a reply to a comment."""
        parent_comment = CommentFactory()
        user = UserFactory()
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = user

        data = {"content": "This is a reply", "parent": parent_comment.id}

        serializer = CommentCreateSerializer(
            data=data, context={"request": request, "deal": parent_comment.deal}
        )
        assert serializer.is_valid()

        reply = serializer.save()
        assert reply.parent == parent_comment
        assert reply.deal == parent_comment.deal


@pytest.mark.django_db
class TestCommentUpdateSerializer:
    """Test CommentUpdateSerializer functionality."""

    def test_valid_comment_update(self) -> None:
        """Test valid comment update."""
        comment = CommentFactory()
        user = comment.user
        factory = APIRequestFactory()
        request = factory.patch("/")
        request.user = user

        data = {"content": "Updated comment content"}

        serializer = CommentUpdateSerializer(
            comment, data=data, context={"request": request}
        )
        assert serializer.is_valid()

        updated_comment = serializer.save()
        assert updated_comment.content == "Updated comment content"
        assert updated_comment.is_edited is True

    def test_comment_update_empty_content(self) -> None:
        """Test comment update with empty content."""
        comment = CommentFactory()

        data = {"content": ""}

        serializer = CommentUpdateSerializer(comment, data=data)
        assert not serializer.is_valid()
        assert "content" in serializer.errors
