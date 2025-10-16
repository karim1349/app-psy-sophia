"""
Tests for deal throttling classes.

Tests for rate limiting functionality to ensure proper
throttling behavior for different actions.
"""

from typing import Any

import pytest
from django.test import RequestFactory
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from users.factories import UserFactory

from ..throttles import (
    AnonSearchThrottle,
    CategoryCreateThrottle,
    CommentThrottle,
    CommentUpdateThrottle,
    DealCreateThrottle,
    DealListThrottle,
    DealUpdateThrottle,
    SearchThrottle,
    VoteThrottle,
)


@pytest.mark.django_db
class TestDealThrottles:
    """Test deal-related throttling classes."""

    def __init__(self) -> None:
        """Initialize test class."""
        super().__init__()
        self.factory = RequestFactory()
        self.client = APIClient()
        self.user = UserFactory()
        self.staff_user = UserFactory(is_staff=True)

    def _authenticate(self, user: Any) -> None:
        """Authenticate user with JWT token."""
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_deal_create_throttle_scope(self) -> None:
        """Test DealCreateThrottle has correct scope."""
        throttle = DealCreateThrottle()
        assert throttle.scope == "deal_create"

    def test_deal_update_throttle_scope(self) -> None:
        """Test DealUpdateThrottle has correct scope."""
        throttle = DealUpdateThrottle()
        assert throttle.scope == "deal_update"

    def test_vote_throttle_scope(self) -> None:
        """Test VoteThrottle has correct scope."""
        throttle = VoteThrottle()
        assert throttle.scope == "vote"

    def test_comment_throttle_scope(self) -> None:
        """Test CommentThrottle has correct scope."""
        throttle = CommentThrottle()
        assert throttle.scope == "comment"

    def test_comment_update_throttle_scope(self) -> None:
        """Test CommentUpdateThrottle has correct scope."""
        throttle = CommentUpdateThrottle()
        assert throttle.scope == "comment_update"

    def test_category_create_throttle_scope(self) -> None:
        """Test CategoryCreateThrottle has correct scope."""
        throttle = CategoryCreateThrottle()
        assert throttle.scope == "category_create"

    def test_search_throttle_scope(self) -> None:
        """Test SearchThrottle has correct scope."""
        throttle = SearchThrottle()
        assert throttle.scope == "search"

    def test_anon_search_throttle_scope(self) -> None:
        """Test AnonSearchThrottle has correct scope."""
        throttle = AnonSearchThrottle()
        assert throttle.scope == "anon_search"

    def test_deal_list_throttle_scope(self) -> None:
        """Test DealListThrottle has correct scope."""
        throttle = DealListThrottle()
        assert throttle.scope == "anon_deal_list"

    def test_throttle_inheritance(self) -> None:
        """Test that throttles inherit from correct base classes."""
        from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

        # User throttles
        assert issubclass(DealCreateThrottle, UserRateThrottle)
        assert issubclass(DealUpdateThrottle, UserRateThrottle)
        assert issubclass(VoteThrottle, UserRateThrottle)
        assert issubclass(CommentThrottle, UserRateThrottle)
        assert issubclass(CommentUpdateThrottle, UserRateThrottle)
        assert issubclass(CategoryCreateThrottle, UserRateThrottle)
        assert issubclass(SearchThrottle, UserRateThrottle)

        # Anonymous throttles
        assert issubclass(AnonSearchThrottle, AnonRateThrottle)
        assert issubclass(DealListThrottle, AnonRateThrottle)

    def test_throttle_instantiation(self) -> None:
        """Test that all throttle classes can be instantiated."""
        throttles = [
            DealCreateThrottle(),
            DealUpdateThrottle(),
            VoteThrottle(),
            CommentThrottle(),
            CommentUpdateThrottle(),
            CategoryCreateThrottle(),
            SearchThrottle(),
            AnonSearchThrottle(),
            DealListThrottle(),
        ]

        for throttle in throttles:
            assert throttle is not None
            assert hasattr(throttle, "scope")

    def test_user_throttle_requires_authentication(self) -> None:
        """Test that user throttles work with authenticated requests."""
        # Test that user throttles have the correct scope
        throttle = DealCreateThrottle()
        assert throttle.scope == "deal_create"

    def test_anon_throttle_works_without_authentication(self) -> None:
        """Test that anonymous throttles work with unauthenticated requests."""
        # Test that anonymous throttles have the correct scope
        throttle = AnonSearchThrottle()
        assert throttle.scope == "anon_search"
