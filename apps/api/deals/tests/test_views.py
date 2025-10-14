"""
Tests for deal views.

Comprehensive tests for all ViewSets with proper authentication,
permissions, and API functionality testing.
"""

from decimal import Decimal
from typing import TYPE_CHECKING

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from users.factories import UserFactory

from ..factories import CommentFactory, DealCategoryFactory, DealFactory
from ..proxy.comment_proxy import CommentProxy

if TYPE_CHECKING:
    from users.models import User
else:
    User = get_user_model()


@pytest.mark.django_db
class TestDealViewSet:
    """Test DealViewSet functionality."""

    def setup_method(self) -> None:
        """Set up test client and authentication."""
        self.client = APIClient()
        self.user = UserFactory(is_active=True)
        self.staff_user = UserFactory(is_staff=True, is_active=True)

    def _authenticate(self, user: User) -> None:
        """Authenticate user with JWT token."""
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_deal_list_unauthenticated(self) -> None:
        """Test deal listing without authentication."""
        # Create 3 new deals
        deals = DealFactory.create_batch(3)

        response = self.client.get(reverse("deals:deal-list"))
        assert response.status_code == status.HTTP_200_OK

        # Should have at least the 3 deals we created
        assert len(response.data["results"]) >= 3

        # Verify our created deals are in the response
        deal_ids = [deal.id for deal in deals]
        response_ids = [item["id"] for item in response.data["results"]]
        for deal_id in deal_ids:
            assert deal_id in response_ids

    def test_deal_list_authenticated(self) -> None:
        """Test deal listing with authentication."""
        self._authenticate(self.user)
        # Create 3 new deals
        deals = DealFactory.create_batch(3)

        response = self.client.get(reverse("deals:deal-list"))
        assert response.status_code == status.HTTP_200_OK

        # Should have at least the 3 deals we created
        assert len(response.data["results"]) >= 3

        # Verify our created deals are in the response
        deal_ids = [deal.id for deal in deals]
        response_ids = [item["id"] for item in response.data["results"]]
        for deal_id in deal_ids:
            assert deal_id in response_ids

    def test_deal_list_filtering_by_category(self) -> None:
        """Test deal filtering by category."""
        category1 = DealCategoryFactory()
        category2 = DealCategoryFactory()

        DealFactory.create_batch(2, category=category1)
        DealFactory.create_batch(1, category=category2)

        response = self.client.get(
            reverse("deals:deal-list"), {"category": category1.id}
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

    def test_deal_list_filtering_by_merchant(self) -> None:
        """Test deal filtering by merchant."""
        DealFactory.create_batch(2, merchant="Test Store")
        DealFactory.create_batch(1, merchant="Other Store")

        response = self.client.get(
            reverse("deals:deal-list"), {"merchant": "Test Store"}
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

    def test_deal_list_filtering_by_city(self) -> None:
        """Test deal filtering by city."""
        DealFactory.create_batch(2, city="Casablanca")
        DealFactory.create_batch(1, city="Rabat")

        response = self.client.get(reverse("deals:deal-list"), {"city": "Casablanca"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

    def test_deal_list_price_filtering(self) -> None:
        """Test deal filtering by price range."""
        DealFactory(current_price=Decimal("50.00"))
        DealFactory(current_price=Decimal("100.00"))
        DealFactory(current_price=Decimal("150.00"))

        response = self.client.get(
            reverse("deals:deal-list"), {"min_price": "75", "max_price": "125"}
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_deal_retrieve_unauthenticated(self) -> None:
        """Test deal retrieval without authentication."""
        deal = DealFactory()

        response = self.client.get(reverse("deals:deal-detail", kwargs={"pk": deal.id}))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == deal.id

    def test_deal_create_authenticated(self) -> None:
        """Test deal creation with authentication."""
        self._authenticate(self.user)
        category = DealCategoryFactory()

        data = {
            "title": "New Test Deal",
            "description": "This is a test deal description",
            "current_price": "99.99",
            "original_price": "149.99",
            "merchant": "Test Store",
            "category": category.id,
            "channel": "online",
            "url": "https://example.com/deal",
            "proof_url": "https://example.com/proof.jpg",
        }

        response = self.client.post(reverse("deals:deal-list"), data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "New Test Deal"
        assert response.data["author"]["id"] == self.user.id

    def test_deal_create_unauthenticated(self) -> None:
        """Test deal creation without authentication."""
        category = DealCategoryFactory()

        data = {
            "title": "New Test Deal",
            "description": "This is a test deal description",
            "current_price": "99.99",
            "merchant": "Test Store",
            "category": category.id,
            "channel": "online",
            "url": "https://example.com/deal",
            "proof_url": "https://example.com/proof.jpg",
        }

        response = self.client.post(reverse("deals:deal-list"), data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_deal_update_by_author(self) -> None:
        """Test deal update by author."""
        deal = DealFactory(author=self.user)
        self._authenticate(self.user)

        data = {"title": "Updated Deal Title"}

        response = self.client.patch(
            reverse("deals:deal-detail", kwargs={"pk": deal.id}), data
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Updated Deal Title"

    def test_deal_update_by_non_author(self) -> None:
        """Test deal update by non-author."""
        other_user = UserFactory(is_active=True)
        deal = DealFactory(author=other_user)
        self._authenticate(self.user)

        data = {"title": "Updated Deal Title"}

        response = self.client.patch(
            reverse("deals:deal-detail", kwargs={"pk": deal.id}), data
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_deal_update_by_staff(self) -> None:
        """Test deal update by staff member."""
        deal = DealFactory()
        self._authenticate(self.staff_user)

        data = {"title": "Updated by Staff"}

        response = self.client.patch(
            reverse("deals:deal-detail", kwargs={"pk": deal.id}), data
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Updated by Staff"

    def test_deal_vote_authenticated(self) -> None:
        """Test voting on deal with authentication."""
        deal = DealFactory()
        self._authenticate(self.user)

        data = {"vote_type": "up"}

        response = self.client.post(
            reverse("deals:deal-vote", kwargs={"pk": deal.id}), data
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["user_vote"] == "up"

    def test_deal_vote_unauthenticated(self) -> None:
        """Test voting without authentication."""
        deal = DealFactory()

        data = {"vote_type": "up"}

        response = self.client.post(
            reverse("deals:deal-vote", kwargs={"pk": deal.id}), data
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_deal_vote_on_own_deal(self) -> None:
        """Test voting on own deal (should be forbidden)."""
        deal = DealFactory(author=self.user)
        self._authenticate(self.user)

        data = {"vote_type": "up"}

        response = self.client.post(
            reverse("deals:deal-vote", kwargs={"pk": deal.id}), data
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_deal_downvote_with_reason(self) -> None:
        """Test downvoting with reason."""
        deal = DealFactory()
        self._authenticate(self.user)

        data = {"vote_type": "down", "reason": "Price is incorrect"}

        response = self.client.post(
            reverse("deals:deal-vote", kwargs={"pk": deal.id}), data
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["user_vote"] == "down"

    def test_deal_downvote_without_reason(self) -> None:
        """Test downvoting without reason."""
        deal = DealFactory()
        self._authenticate(self.user)

        data = {"vote_type": "down"}

        response = self.client.post(
            reverse("deals:deal-vote", kwargs={"pk": deal.id}), data
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_deal_hot_endpoint(self) -> None:
        """Test hot deals endpoint."""
        DealFactory.create_batch(3)

        response = self.client.get(reverse("deals:deal-hot"))
        assert response.status_code == status.HTTP_200_OK

    def test_deal_top_endpoint(self) -> None:
        """Test top deals endpoint."""
        DealFactory.create_batch(3)

        response = self.client.get(reverse("deals:deal-top"))
        assert response.status_code == status.HTTP_200_OK

    def test_deal_search_endpoint(self) -> None:
        """Test deal search endpoint."""
        DealFactory(title="iPhone Deal")
        DealFactory(title="Android Phone")
        DealFactory(title="Laptop Sale")

        self._authenticate(self.user)
        response = self.client.get(reverse("deals:deal-search"), {"q": "phone"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

    def test_deal_comments_endpoint(self) -> None:
        """Test deal comments endpoint."""
        deal = DealFactory()
        CommentFactory.create_batch(3, deal=deal)

        response = self.client.get(
            reverse("deals:deal-comments", kwargs={"pk": deal.id})
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["comments"]) == 3

    def test_deal_add_comment_authenticated(self) -> None:
        """Test adding comment to deal."""
        deal = DealFactory()
        self._authenticate(self.user)

        data = {"content": "This is a great deal!"}

        response = self.client.post(
            reverse("deals:deal-add-comment", kwargs={"pk": deal.id}), data
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["content"] == "This is a great deal!"

    def test_deal_add_comment_unauthenticated(self) -> None:
        """Test adding comment without authentication."""
        deal = DealFactory()

        data = {"content": "This is a great deal!"}

        response = self.client.post(
            reverse("deals:deal-add-comment", kwargs={"pk": deal.id}), data
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_deal_deactivate_by_author(self) -> None:
        """Test deal deactivation by author."""
        deal = DealFactory(author=self.user)
        self._authenticate(self.user)

        response = self.client.post(
            reverse("deals:deal-deactivate", kwargs={"pk": deal.id})
        )
        assert response.status_code == status.HTTP_200_OK

        deal.refresh_from_db()
        assert deal.status == "expired"


@pytest.mark.django_db
class TestDealCategoryViewSet:
    """Test DealCategoryViewSet functionality."""

    def setup_method(self) -> None:
        """Set up test client and authentication."""
        self.client = APIClient()
        self.user = UserFactory(is_active=True)
        self.staff_user = UserFactory(is_staff=True, is_active=True)

    def _authenticate(self, user: User) -> None:
        """Authenticate user with JWT token."""
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_category_list_unauthenticated(self) -> None:
        """Test category listing without authentication."""
        # Create 3 categories
        categories = DealCategoryFactory.create_batch(3)

        response = self.client.get(reverse("deals:category-list"))
        assert response.status_code == status.HTTP_200_OK

        # Should have at least the 3 categories we created
        assert len(response.data["results"]) >= 3

        # Verify our created categories are in the response
        category_ids = [category.id for category in categories]
        response_ids = [item["id"] for item in response.data["results"]]
        for category_id in category_ids:
            assert category_id in response_ids

    def test_category_retrieve_unauthenticated(self) -> None:
        """Test category retrieval without authentication."""
        category = DealCategoryFactory()

        response = self.client.get(
            reverse("deals:category-detail", kwargs={"pk": category.id})
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == category.id

    def test_category_create_by_staff(self) -> None:
        """Test category creation by staff."""
        self._authenticate(self.staff_user)

        data = {"name": "New Category", "icon": "test-icon", "color": "#FF5722"}

        response = self.client.post(reverse("deals:category-list"), data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Category"

    def test_category_create_by_non_staff(self) -> None:
        """Test category creation by non-staff user."""
        self._authenticate(self.user)

        data = {"name": "New Category", "icon": "test-icon", "color": "#FF5722"}

        response = self.client.post(reverse("deals:category-list"), data)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_category_popular_endpoint(self) -> None:
        """Test popular categories endpoint."""
        category1 = DealCategoryFactory()
        category2 = DealCategoryFactory()

        # Create deals to make categories popular
        DealFactory.create_batch(3, category=category1)
        DealFactory.create_batch(1, category=category2)

        response = self.client.get(reverse("deals:category-popular"))
        assert response.status_code == status.HTTP_200_OK
        # Should have at least the 2 categories we created with deals
        assert len(response.data) >= 2

        # Verify our created categories are in the response
        category_ids = [category1.id, category2.id]
        response_ids = [item["id"] for item in response.data]
        for category_id in category_ids:
            assert category_id in response_ids


@pytest.mark.django_db
class TestCommentViewSet:
    """Test CommentViewSet functionality."""

    def setup_method(self) -> None:
        """Set up test client and authentication."""
        self.client = APIClient()
        self.user = UserFactory(is_active=True)
        self.staff_user = UserFactory(is_staff=True, is_active=True)

    def _authenticate(self, user: User) -> None:
        """Authenticate user with JWT token."""
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_comment_retrieve_unauthenticated(self) -> None:
        """Test comment retrieval without authentication."""
        comment = CommentFactory()

        response = self.client.get(
            reverse("deals:comment-detail", kwargs={"pk": comment.id})
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == comment.id

    def test_comment_update_by_author(self) -> None:
        """Test comment update by author."""
        comment = CommentFactory(user=self.user)
        self._authenticate(self.user)

        data = {"content": "Updated comment content"}

        response = self.client.patch(
            reverse("deals:comment-detail", kwargs={"pk": comment.id}), data
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["content"] == "Updated comment content"
        assert response.data["is_edited"] is True

    def test_comment_update_by_non_author(self) -> None:
        """Test comment update by non-author."""
        other_user = UserFactory(is_active=True)
        comment = CommentFactory(user=other_user)
        self._authenticate(self.user)

        data = {"content": "Updated comment content"}

        response = self.client.patch(
            reverse("deals:comment-detail", kwargs={"pk": comment.id}), data
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_comment_update_by_staff(self) -> None:
        """Test comment update by staff member."""
        comment = CommentFactory()
        self._authenticate(self.staff_user)

        data = {"content": "Updated by staff"}

        response = self.client.patch(
            reverse("deals:comment-detail", kwargs={"pk": comment.id}), data
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["content"] == "Updated by staff"

    def test_comment_delete_by_author(self) -> None:
        """Test comment deletion by author."""
        comment = CommentFactory(user=self.user)
        self._authenticate(self.user)

        response = self.client.delete(
            reverse("deals:comment-detail", kwargs={"pk": comment.id})
        )
        assert response.status_code == status.HTTP_200_OK

        # Verify comment is deleted
        assert not CommentProxy().get_by_id(comment.id)

    def test_comment_delete_by_non_author(self) -> None:
        """Test comment deletion by non-author."""
        other_user = UserFactory(is_active=True)
        comment = CommentFactory(user=other_user)
        self._authenticate(self.user)

        response = self.client.delete(
            reverse("deals:comment-detail", kwargs={"pk": comment.id})
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
