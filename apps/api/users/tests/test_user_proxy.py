"""
Test cases for UserProxy.

Tests proxy methods, business logic, and data operations.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from ..proxy.user_proxy import UserProxy

UserModel = get_user_model()


@pytest.mark.django_db
class TestUserProxy:
    """Test UserProxy functionality."""

    def __init__(self) -> None:
        """Set up test data."""
        self.proxy = UserProxy()

    def test_get_by_id_existing(self) -> None:
        """Test getting user by ID when user exists."""
        user = UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )

        result = self.proxy.get_by_id(user.id)
        assert result == user

    def test_get_by_id_nonexistent(self) -> None:
        """Test getting user by ID when user doesn't exist."""
        result = self.proxy.get_by_id(999)
        assert result is None

    def test_get_user_by_email_existing(self) -> None:
        """Test getting user by email when user exists."""
        user = UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )

        result = self.proxy.get_user_by_email("test@example.com")
        assert result == user

    def test_get_user_by_email_case_insensitive(self) -> None:
        """Test getting user by email with case insensitivity."""
        user = UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )

        result = self.proxy.get_user_by_email("TEST@EXAMPLE.COM")
        assert result and result.pk == user.pk

    def test_get_user_by_email_nonexistent(self) -> None:
        """Test getting user by email when user doesn't exist."""
        result = self.proxy.get_user_by_email("nonexistent@example.com")
        assert result is None

    def test_get_user_by_username_existing(self) -> None:
        """Test getting user by username when user exists."""
        user = UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )

        result = self.proxy.get_user_by_username("testuser")
        assert result == user

    def test_get_user_by_username_nonexistent(self) -> None:
        """Test getting user by username when user doesn't exist."""
        result = self.proxy.get_user_by_username("nonexistentuser")
        assert result is None

    def test_create_user_valid_data(self) -> None:
        """Test creating user with valid data."""
        data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "testpass123",
        }

        user = self.proxy.register_user(data)
        assert user.email == "test@example.com"
        assert user.username == "testuser"

    def test_create_user_duplicate_email(self) -> None:
        """Test creating user with duplicate email."""
        UserModel.objects.create_user(
            email="existing@example.com",
            username="existinguser",
            password="testpass123",
        )

        data = {
            "email": "existing@example.com",
            "username": "newuser",
            "password": "testpass123",
        }

        with pytest.raises(ValidationError):
            self.proxy.register_user(data)

    def test_create_user_duplicate_username(self) -> None:
        """Test creating user with duplicate username."""
        UserModel.objects.create_user(
            email="existing@example.com",
            username="existinguser",
            password="testpass123",
        )

        data = {
            "email": "new@example.com",
            "username": "existinguser",
            "password": "testpass123",
        }

        with pytest.raises(ValidationError):
            self.proxy.register_user(data)

    def test_create_user_weak_password(self) -> None:
        """Test creating user with weak password."""
        data = {"email": "test@example.com", "username": "testuser", "password": "123"}

        with pytest.raises(ValidationError) as exc_info:
            self.proxy.register_user(data)
        assert "This password is too short" in str(exc_info.value)

    def test_create_user_invalid_username_format(self) -> None:
        """Test creating user with invalid username format."""
        data = {
            "email": "test@example.com",
            "username": "ab",  # Too short
            "password": "testpass123",
        }

        with pytest.raises(ValidationError):
            self.proxy.register_user(data)

    def test_update_user_valid_data(self) -> None:
        """Test updating user with valid data."""
        user = UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )

        data = {"username": "updateduser"}

        updated_user = self.proxy.update_user_profile(user, data)
        assert updated_user.username == "updateduser"

    def test_update_user_duplicate_email(self) -> None:
        """Test updating user but with a duplicate email."""
        user = UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )
        UserModel.objects.create_user(
            email="duplicate@example.com",
            username="anotheruser",
            password="testpass123",
        )

        data = {"email": "duplicate@example.com"}

        with pytest.raises(ValidationError):
            self.proxy.update_user_profile(user, data)

    def test_update_user_duplicate_username(self) -> None:
        """Test updating user but with a duplicate username."""
        user = UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )
        UserModel.objects.create_user(
            email="another@example.com",
            username="duplicateuser",
            password="testpass123",
        )

        data = {"username": "duplicateuser"}

        with pytest.raises(ValidationError):
            self.proxy.update_user_profile(user, data)

    def test_activate_user(self) -> None:
        """Test activating user."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=False,
        )

        self.proxy.activate_user(user)
        user.refresh_from_db()
        assert user.is_active is True

    def test_deactivate_user(self) -> None:
        """Test deactivating user."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        self.proxy.deactivate_user(user)
        user.refresh_from_db()
        assert user.is_active is False

    def test_delete_user(self) -> None:
        """Test deleting user."""
        user = UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )

        user_id = user.id
        self.proxy.delete_user(user)
        assert not UserModel.objects.filter(id=user_id).exists()

    def test_list_active_users(self) -> None:
        """Test listing active users."""
        UserModel.objects.create_user(
            email="active1@example.com",
            username="active1",
            password="testpass123",
            is_active=True,
        )

        UserModel.objects.create_user(
            email="inactive@example.com",
            username="inactive",
            password="testpass123",
            is_active=False,
        )

        UserModel.objects.create_user(
            email="active2@example.com",
            username="active2",
            password="testpass123",
            is_active=True,
        )

        active_users = self.proxy.list_active_users()
        assert len(active_users) == 2
        assert all(user.is_active for user in active_users)

    def test_list_users_by_creation_date(self) -> None:
        """Test listing users ordered by creation date."""
        user1 = UserModel.objects.create_user(
            email="test1@example.com", username="testuser1", password="testpass1"
        )
        user2 = UserModel.objects.create_user(
            email="test2@example.com", username="testuser2", password="testpass2"
        )

        # Ensure users are sorted in the correct order
        users = self.proxy.list_users_by_creation_date(start_date=None, end_date=None)
        assert list(users) == [user1, user2]

    def test_authenticate_user_valid_credentials(self) -> None:
        """Test authenticating user with valid credentials."""
        user = UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )

        authenticated_user = self.proxy.authenticate_user(
            "test@example.com", "testpass123"
        )
        assert authenticated_user == user

    def test_authenticate_user_invalid_credentials(self) -> None:
        """Test authenticating user with invalid credentials."""
        UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )

        with pytest.raises(ValidationError):
            self.proxy.authenticate_user("test@example.com", "wrongpassword")

    def test_authenticate_user_nonexistent_user(self) -> None:
        """Test authenticating nonexistent user."""
        with pytest.raises(ValidationError):
            self.proxy.authenticate_user("nonexistent@example.com", "testpass123")

    def test_register_user(self) -> None:
        """Test registering a user successfully."""
        data = {
            "email": "newregister@example.com",
            "username": "newregister",
            "password": "testpass123",
        }

        user = self.proxy.register_user(data)
        assert user.email == "newregister@example.com"
        assert user.username == "newregister"

    def test_generate_tokens(self) -> None:
        """Test generating tokens for a user."""
        user = UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )

        tokens = self.proxy.generate_tokens(user)
        assert "refresh" in tokens
        assert "access" in tokens

    def test_verify_email(self) -> None:
        """Test verifying email using a valid code."""
        user = UserModel.objects.create_user(
            email="valid@example.com", username="validuser", password="testpass123"
        )
        user.generate_verification_token()

        verified_user = self.proxy.verify_email(
            email="valid@example.com",
            code=user.email_verification_token or "",
        )
        assert verified_user.is_active

    def test_verify_email_invalid_code(self) -> None:
        """Test verifying email with an invalid code."""
        user = UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )
        user.generate_verification_token()

        with pytest.raises(ValidationError):
            self.proxy.verify_email("test@example.com", "123456")

    def test_resend_verification_valid_email(self) -> None:
        """Test resending verification for valid email."""
        # Create user to test resend verification
        _ = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=False,
        )

        result = self.proxy.resend_verification("test@example.com")
        assert "message" in result

    def test_resend_verification_nonexistent_user(self) -> None:
        """Test resending verification for nonexistent user."""
        result = self.proxy.resend_verification("nonexistent@example.com")
        assert "message" in result

    def test_resend_verification_already_verified(self) -> None:
        """Test resending verification for already verified user."""
        # Create user to test resend verification
        _ = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        result = self.proxy.resend_verification("test@example.com")
        assert "message" in result

    def test_request_password_reset(self) -> None:
        """Test password reset request."""
        # Create user to test password reset
        _ = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        result = self.proxy.request_password_reset("test@example.com")
        assert "message" in result

    def test_refresh_access_token_valid_token(self) -> None:
        """Test refreshing access token with valid refresh token."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        refresh = RefreshToken.for_user(user)
        refresh_token = str(refresh)

        result = self.proxy.refresh_access_token(refresh_token)
        assert "access" in result

    def test_logout_user_valid_token(self) -> None:
        """Test logging out user with valid refresh token."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        refresh = RefreshToken.for_user(user)
        refresh_token = str(refresh)

        result = self.proxy.logout_user(refresh_token)
        assert "message" in result

    def test_get_user_profile(self) -> None:
        """Test getting user profile."""
        user = UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )

        profile = self.proxy.update_user_profile(user, {})
        assert profile == user

    def test_update_user_profile(self) -> None:
        """Test updating user profile."""
        user = UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )

        response = self.proxy.update_user_profile(user, {"username": "newuser"})
        assert response.username == "newuser"

    def test_validate_business_rules_email_uniqueness(self) -> None:
        """Test business rules validation for email uniqueness."""
        UserModel.objects.create_user(
            email="existing@example.com",
            username="existinguser",
            password="testpass123",
        )

        data = {
            "email": "existing@example.com",
            "username": "newuser",
            "password": "testpass123",
        }

        with pytest.raises(ValidationError):
            self.proxy.validate_business_rules(data)

    def test_validate_business_rules_username_uniqueness(self) -> None:
        """Test business rules validation for username uniqueness."""
        UserModel.objects.create_user(
            email="existing@example.com",
            username="existinguser",
            password="testpass123",
        )

        data = {
            "email": "new@example.com",
            "username": "existinguser",
            "password": "testpass123",
        }

        with pytest.raises(ValidationError):
            self.proxy.validate_business_rules(data)
