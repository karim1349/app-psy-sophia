"""
Test cases for User model.

Tests model creation, validation, properties, and business logic.
"""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone

from ..factories import UserFactory

UserModel = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    """Test User model functionality."""

    def test_user_creation_with_valid_data(self) -> None:
        """Test user creation with valid data."""
        user = UserFactory()

        assert user.email is not None
        assert user.username is not None
        assert user.is_active is False  # Default for new users
        assert user.email_verification_token is None
        assert user.email_verification_token_expires_at is None

    def test_user_creation_requires_password(self) -> None:
        """Test user creation requires password."""
        with pytest.raises(ValueError):
            UserModel.objects.create_user(
                email="test@example.com", username="testuser", password=""
            )

    def test_email_uniqueness(self) -> None:
        """Test email uniqueness constraint."""
        user1 = UserFactory()

        with pytest.raises(IntegrityError):
            UserFactory(email=user1.email)

    def test_email_case_insensitive_uniqueness(self) -> None:
        """Test email uniqueness is case insensitive."""
        # Create first user to test uniqueness
        _ = UserFactory(email="test@example.com")

        with pytest.raises(IntegrityError):
            UserFactory(email="TEST@EXAMPLE.COM")

    def test_account_age_property(self) -> None:
        """Test account_age property calculation."""
        user = UserFactory()

        # Account should be very new
        assert user.account_age.days == 0

    def test_is_new_account_property(self) -> None:
        """Test is_new_account property."""
        user = UserFactory()

        # New account should be considered new
        assert user.is_new_account is True

    def test_generate_verification_token(self) -> None:
        """Test verification token generation."""
        user = UserFactory()

        token = user.generate_verification_token()

        assert token is not None
        assert len(token) == 6  # 6-digit code
        assert token.isdigit()
        assert user.email_verification_token == token
        assert user.email_verification_token_expires_at is not None

    def test_verify_email_valid_token(self) -> None:
        """Test email verification with valid token."""
        user = UserFactory()

        token = user.generate_verification_token()
        result = user.verify_email(token)

        assert result is True
        assert user.email_verification_token is None
        assert user.email_verification_token_expires_at is None

    def test_verify_email_invalid_token(self) -> None:
        """Test email verification with invalid token."""
        user = UserFactory()

        user.generate_verification_token()
        result = user.verify_email("000000")

        assert result is False

    def test_verify_email_expired_token(self) -> None:
        """Test email verification with expired token."""
        user = UserFactory()
        token = user.generate_verification_token()
        # Manually expire the token
        user.email_verification_token_expires_at = timezone.now() - timedelta(hours=1)
        user.save()

        result = user.verify_email(token)
        assert result is False

    def test_verify_email_already_verified(self) -> None:
        """Test email verification when already verified."""
        user = UserFactory(is_active=True)

        result = user.verify_email("123456")
        assert result is False

    def test_user_manager_create_user(self) -> None:
        """Test UserManager create_user method."""
        user = UserFactory()

        assert user.email is not None
        assert user.username is not None
        assert user.check_password("testpass123")
        assert user.is_active is False
