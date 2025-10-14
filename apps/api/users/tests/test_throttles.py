"""
Tests for custom throttle classes.

Following TDD methodology - these tests are written BEFORE the throttles exist.
"""

from typing import cast

import pytest
from django.contrib.auth.models import AnonymousUser
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from ..throttles import LoginThrottle, PasswordResetThrottle, RegisterThrottle


@pytest.mark.django_db
class TestRegisterThrottle:
    """Tests for RegisterThrottle - 5 requests per hour."""

    def test_throttle_allows_first_request(self) -> None:
        """Test that first request is allowed."""
        throttle = RegisterThrottle()
        factory = APIRequestFactory()
        request = factory.post("/api/auth/register")
        request.user = AnonymousUser()

        # First request should be allowed
        assert throttle.allow_request(request, cast(APIView, None)) is True

    def test_throttle_rate_is_5_per_hour(self) -> None:
        """Test throttle rate is configured to 5/hour."""
        throttle = RegisterThrottle()
        # The rate should be 5/hour
        assert "5" in throttle.rate

    def test_throttle_blocks_after_limit(self) -> None:
        """Test that requests are blocked after rate limit."""
        throttle = RegisterThrottle()
        factory = APIRequestFactory()
        request = factory.post("/api/auth/register")
        request.user = AnonymousUser()
        request.META["REMOTE_ADDR"] = "192.168.1.1"

        # Make requests up to the limit
        for i in range(5):
            allowed = throttle.allow_request(request, cast(APIView, None))
            if i < 5:
                assert allowed is True, f"Request {i+1} should be allowed"

        # Next request should be throttled
        assert throttle.allow_request(request, cast(APIView, None)) is False

    def test_throttle_wait_time_provided(self) -> None:
        """Test that wait time is provided when throttled."""
        throttle = RegisterThrottle()
        factory = APIRequestFactory()
        request = factory.post("/api/auth/register")
        request.user = AnonymousUser()
        request.META["REMOTE_ADDR"] = "192.168.1.2"

        # Exceed the limit
        for _ in range(6):
            throttle.allow_request(request, cast(APIView, None))

        # Should provide wait time
        wait_time = throttle.wait()
        assert wait_time is not None
        assert wait_time > 0


@pytest.mark.django_db
class TestLoginThrottle:
    """Tests for LoginThrottle - 10 requests per hour."""

    def test_throttle_allows_first_request(self) -> None:
        """Test that first request is allowed."""
        throttle = LoginThrottle()
        factory = APIRequestFactory()
        request = factory.post("/api/auth/login")
        request.user = AnonymousUser()

        # First request should be allowed
        assert throttle.allow_request(request, cast(APIView, None)) is True

    def test_throttle_rate_is_10_per_hour(self) -> None:
        """Test throttle rate is configured to 10/hour."""
        throttle = LoginThrottle()
        # The rate should be 10/hour
        assert "10" in throttle.rate

    def test_throttle_blocks_after_limit(self) -> None:
        """Test that requests are blocked after rate limit."""
        throttle = LoginThrottle()
        factory = APIRequestFactory()
        request = factory.post("/api/auth/login")
        request.user = AnonymousUser()
        request.META["REMOTE_ADDR"] = "192.168.1.3"

        # Make requests up to the limit
        for i in range(10):
            allowed = throttle.allow_request(request, cast(APIView, None))
            assert allowed is True, f"Request {i+1} should be allowed"

        # Next request should be throttled
        assert throttle.allow_request(request, cast(APIView, None)) is False


@pytest.mark.django_db
class TestPasswordResetThrottle:
    """Tests for PasswordResetThrottle - 3 requests per hour."""

    def test_throttle_allows_first_request(self) -> None:
        """Test that first request is allowed."""
        throttle = PasswordResetThrottle()
        factory = APIRequestFactory()
        request = factory.post("/api/auth/password/forgot")
        request.user = AnonymousUser()

        # First request should be allowed
        assert throttle.allow_request(request, cast(APIView, None)) is True

    def test_throttle_rate_is_3_per_hour(self) -> None:
        """Test throttle rate is configured to 3/hour."""
        throttle = PasswordResetThrottle()
        # The rate should be 3/hour
        assert "3" in throttle.rate

    def test_throttle_blocks_after_limit(self) -> None:
        """Test that requests are blocked after rate limit."""
        throttle = PasswordResetThrottle()
        factory = APIRequestFactory()
        request = factory.post("/api/auth/password/forgot")
        request.user = AnonymousUser()
        request.META["REMOTE_ADDR"] = "192.168.1.4"

        # Make requests up to the limit
        for i in range(3):
            allowed = throttle.allow_request(request, cast(APIView, None))
            assert allowed is True, f"Request {i+1} should be allowed"

        # Next request should be throttled
        assert throttle.allow_request(request, cast(APIView, None)) is False

    def test_throttle_applies_per_ip(self) -> None:
        """Test that throttle is applied per IP address."""
        throttle1 = PasswordResetThrottle()
        throttle2 = PasswordResetThrottle()
        factory = APIRequestFactory()

        # First IP
        request1 = factory.post("/api/auth/password/forgot")
        request1.user = AnonymousUser()
        request1.META["REMOTE_ADDR"] = "192.168.1.5"

        # Second IP
        request2 = factory.post("/api/auth/password/forgot")
        request2.user = AnonymousUser()
        request2.META["REMOTE_ADDR"] = "192.168.1.6"

        # Exhaust first IP
        for _ in range(3):
            throttle1.allow_request(request1, cast(APIView, None))

        # First IP should be throttled
        assert throttle1.allow_request(request1, cast(APIView, None)) is False

        # Second IP should still be allowed
        assert throttle2.allow_request(request2, cast(APIView, None)) is True
