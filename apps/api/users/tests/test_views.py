"""
Test cases for user views.

Tests API endpoints, authentication, and view logic.
"""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

UserModel = get_user_model()


@pytest.mark.django_db
class TestUserViewSet:
    """Test UserViewSet endpoints."""

    client: APIClient

    def setup_method(self) -> None:
        """Set up test data."""
        self.client = APIClient()

    def test_user_list_authenticated(self) -> None:
        """Test listing users when authenticated."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = self.client.get(reverse("users:user-list"))
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        assert response.data["detail"] == "Listing all users is not allowed."

    def test_user_list_unauthenticated(self) -> None:
        """Test listing users when unauthenticated."""
        response = self.client.get(reverse("users:user-list"))
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        assert response.data["detail"] == "Listing all users is not allowed."

    def test_user_retrieve_own_profile(self) -> None:
        """Test retrieving own user profile."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = self.client.get(reverse("users:user-detail", kwargs={"pk": user.id}))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "testuser"

    def test_user_retrieve_other_profile(self) -> None:
        """Test retrieving other user's profile (should fail)."""
        user1 = UserModel.objects.create_user(
            email="user1@example.com",
            username="user1",
            password="testpass123",
            is_active=True,
        )

        user2 = UserModel.objects.create_user(
            email="user2@example.com",
            username="user2",
            password="testpass123",
            is_active=True,
        )

        refresh = RefreshToken.for_user(user1)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = self.client.get(
            reverse("users:user-detail", kwargs={"pk": user2.id})
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_retrieve_not_authenticated(self) -> None:
        """Test retrieving user when not authenticated."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        response = self.client.get(reverse("users:user-detail", kwargs={"pk": user.id}))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_user_adjust_profile(self) -> None:
        """Test adjust user profile while authenticated."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        update_data = {"username": "updateduser"}
        response = self.client.patch(reverse("users:user-me"), update_data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "updateduser"

    def test_user_update_other_profile(self) -> None:
        """Test updating other user's profile (should fail)."""
        user1 = UserModel.objects.create_user(
            email="user1@example.com",
            username="user1",
            password="testpass123",
            is_active=True,
        )

        user2 = UserModel.objects.create_user(
            email="user2@example.com",
            username="user2",
            password="testpass123",
            is_active=True,
        )

        refresh = RefreshToken.for_user(user1)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        data = {"username": "hackeduser"}
        response = self.client.patch(
            reverse("users:user-detail", kwargs={"pk": user2.id}), data
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_deactivate_own_account(self) -> None:
        """Test deactivating own account."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = self.client.post(
            reverse("users:user-deactivate", kwargs={"pk": user.id})
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == "Account deactivated successfully."

        # Check that user still exists but is inactive
        user.refresh_from_db()
        assert not user.is_active
        assert UserModel.objects.filter(id=user.id).exists()

    def test_user_deactivate_other_account(self) -> None:
        """Test deactivating other user's account (should fail)."""
        user1 = UserModel.objects.create_user(
            email="user1@example.com",
            username="user1",
            password="testpass123",
            is_active=True,
        )

        user2 = UserModel.objects.create_user(
            email="user2@example.com",
            username="user2",
            password="testpass123",
            is_active=True,
        )

        refresh = RefreshToken.for_user(user1)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = self.client.post(
            reverse("users:user-deactivate", kwargs={"pk": user2.id})
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestLoginView:
    """Test login functionality."""

    client: APIClient

    def setup_method(self) -> None:
        """Set up test data."""
        self.client = APIClient()

    def test_login_valid_credentials(self) -> None:
        """Test login with valid credentials."""
        UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        data = {"email": "test@example.com", "password": "testpass123"}

        response = self.client.post(reverse("users:user-login"), data)
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_login_invalid_email(self) -> None:
        """Test login with invalid email."""
        data = {"email": "nonexistent@example.com", "password": "testpass123"}

        response = self.client.post(reverse("users:user-login"), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_invalid_password(self) -> None:
        """Test login with invalid password."""
        UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        data = {"email": "test@example.com", "password": "wrongpassword"}

        response = self.client.post(reverse("users:user-login"), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_inactive_user(self) -> None:
        """Test login with inactive user."""
        UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=False,
        )

        data = {"email": "test@example.com", "password": "testpass123"}

        response = self.client.post(reverse("users:user-login"), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_web_client_cookies(self) -> None:
        """Test login with web client sets cookies."""
        UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        data = {"email": "test@example.com", "password": "testpass123"}

        response = self.client.post(
            reverse("users:user-login"), data, HTTP_X_CLIENT_TYPE="web"
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies


@pytest.mark.django_db
class TestMeView:
    """Test user profile endpoints."""

    client: APIClient

    def setup_method(self) -> None:
        """Set up test data."""
        self.client = APIClient()

    def test_me_authenticated(self) -> None:
        """Test /me endpoint when authenticated."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = self.client.get(reverse("users:user-me"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == "test@example.com"

    def test_me_unauthenticated(self) -> None:
        """Test /me endpoint when unauthenticated."""
        response = self.client.get(reverse("users:user-me"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_update_profile(self) -> None:
        """Test updating profile via /me endpoint."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        data = {"username": "updateduser"}
        response = self.client.patch(reverse("users:user-me"), data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "updateduser"


@pytest.mark.django_db
class TestPasswordResetViews:
    """Test password reset functionality."""

    client: APIClient

    def setup_method(self) -> None:
        """Set up test data."""
        self.client = APIClient()

    def test_password_reset_request_valid_email(self) -> None:
        """Test password reset request with valid email."""
        UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        data = {"email": "test@example.com"}
        response = self.client.post(reverse("users:user-request-password-reset"), data)
        assert response.status_code == status.HTTP_200_OK

    def test_password_reset_request_invalid_email(self) -> None:
        """Test password reset request with invalid email."""
        data = {"email": "nonexistent@example.com"}
        response = self.client.post(reverse("users:user-request-password-reset"), data)
        assert (
            response.status_code == status.HTTP_200_OK
        )  # Should still return 200 for security

    def test_password_reset_request_invalid_email_format(self) -> None:
        """Test password reset request with invalid email format."""
        data = {"email": "invalid-email"}
        response = self.client.post(reverse("users:user-request-password-reset"), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestVerifyEmailView:
    """Test email verification functionality."""

    client: APIClient

    def setup_method(self) -> None:
        """Set up test data."""
        self.client = APIClient()

    def test_verify_email_valid_code(self) -> None:
        """Test email verification with valid code."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=False,
        )

        code = user.generate_verification_token()

        data = {"email": "test@example.com", "code": code}

        response = self.client.post(reverse("users:user-verify-email"), data)
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_verify_email_invalid_code(self) -> None:
        """Test email verification with invalid code."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=False,
        )

        user.generate_verification_token()

        data = {"email": "test@example.com", "code": "000000"}

        response = self.client.post(reverse("users:user-verify-email"), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_verify_email_nonexistent_user(self) -> None:
        """Test email verification with nonexistent user."""
        data = {"email": "nonexistent@example.com", "code": "123456"}

        response = self.client.post(reverse("users:user-verify-email"), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_verify_email_already_verified(self) -> None:
        """Test email verification when already verified."""
        # Create user to test verification
        _ = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        data = {"email": "test@example.com", "code": "123456"}

        response = self.client.post(reverse("users:user-verify-email"), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestResendVerificationView:
    """Test resend verification functionality."""

    client: APIClient

    def setup_method(self) -> None:
        """Set up test data."""
        self.client = APIClient()

    def test_resend_verification_valid_email(self) -> None:
        """Test resend verification with valid email."""
        # Create user to test resend verification
        _ = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=False,
        )

        data = {"email": "test@example.com"}
        response = self.client.post(reverse("users:user-resend-verification"), data)
        assert response.status_code == status.HTTP_200_OK

    def test_resend_verification_nonexistent_user(self) -> None:
        """Test resend verification with nonexistent user."""
        data = {"email": "nonexistent@example.com"}
        response = self.client.post(reverse("users:user-resend-verification"), data)
        assert (
            response.status_code == status.HTTP_200_OK
        )  # Should still return 200 for security

    def test_resend_verification_already_verified(self) -> None:
        """Test resend verification when already verified."""
        # Create user to test resend verification
        _ = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        data = {"email": "test@example.com"}
        response = self.client.post(reverse("users:user-resend-verification"), data)
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestLogoutView:
    """Test logout functionality."""

    client: APIClient

    def setup_method(self) -> None:
        """Set up test data."""
        self.client = APIClient()

    def test_logout_valid_token(self) -> None:
        """Test logout with valid refresh token."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        refresh = RefreshToken.for_user(user)
        refresh_token = str(refresh)

        # Authenticate first
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        data = {"refresh": refresh_token}
        response = self.client.post(reverse("users:user-logout"), data)
        assert response.status_code == status.HTTP_200_OK

    def test_logout_invalid_token(self) -> None:
        """Test logout with invalid refresh token."""
        # Create a user and get a valid access token
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        data = {"refresh": "invalid-token"}
        response = self.client.post(reverse("users:user-logout"), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_logout_missing_token(self) -> None:
        """Test logout without refresh token."""
        # Create a user and get a valid access token
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = self.client.post(reverse("users:user-logout"), {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_logout_web_client_cookies(self) -> None:
        """Test logout clears cookies for web client."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        refresh = RefreshToken.for_user(user)
        refresh_token = str(refresh)

        # Authenticate first
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        data = {"refresh": refresh_token}
        response = self.client.post(
            reverse("users:user-logout"), data, HTTP_X_CLIENT_TYPE="web"
        )
        assert response.status_code == status.HTTP_200_OK
        # Check that cookies are cleared
        access_cookie = response.cookies.get("access_token")
        refresh_cookie = response.cookies.get("refresh_token")
        assert access_cookie is not None and access_cookie.value == ""
        assert refresh_cookie is not None and refresh_cookie.value == ""
