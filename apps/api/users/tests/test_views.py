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

from deals.models import Comment, Deal, DealCategory

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

        response = self.client.get(reverse("users:user-me"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "testuser"

    def test_user_retrieve_not_authenticated(self) -> None:
        """Test retrieving user when not authenticated."""
        UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        response = self.client.get(reverse("users:user-me"))
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

        response = self.client.post(reverse("users:user-deactivate"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == "Account deactivated successfully."

        # Check that user still exists but is inactive
        user.refresh_from_db()
        assert not user.is_active
        assert UserModel.objects.filter(id=user.id).exists()


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

    def test_my_deals_authenticated(self) -> None:
        """Test getting user's deals when authenticated."""
        # Create user and authenticate
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Create category and deals
        category = DealCategory.objects.create(
            name="Electronics", slug="electronics", icon="laptop"
        )

        # Create deals for this user
        Deal.objects.create(
            title="Test Deal 1",
            description="Test description",
            current_price=100.00,
            currency="MAD",
            category=category,
            merchant="Test Store",
            channel="online",
            author=user,
        )

        Deal.objects.create(
            title="Test Deal 2",
            description="Test description 2",
            current_price=200.00,
            currency="MAD",
            category=category,
            merchant="Test Store 2",
            channel="in_store",
            author=user,
        )

        # Create deal for another user (should not appear)
        other_user = UserModel.objects.create_user(
            email="other@example.com",
            username="otheruser",
            password="testpass123",
            is_active=True,
        )
        Deal.objects.create(
            title="Other User Deal",
            description="Other description",
            current_price=150.00,
            currency="MAD",
            category=category,
            merchant="Other Store",
            channel="online",
            author=other_user,
        )

        response = self.client.get(reverse("users:user-my-deals"))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

        # Check that only user's deals are returned
        deal_titles = [deal["title"] for deal in response.data["results"]]
        assert "Test Deal 1" in deal_titles
        assert "Test Deal 2" in deal_titles
        assert "Other User Deal" not in deal_titles

    def test_my_deals_unauthenticated(self) -> None:
        """Test getting user's deals when not authenticated."""
        response = self.client.get(reverse("users:user-my-deals"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_my_comments_authenticated(self) -> None:
        """Test getting user's comments when authenticated."""
        # Create user and authenticate
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Create category and deal
        category = DealCategory.objects.create(
            name="Electronics", slug="electronics", icon="laptop"
        )

        deal = Deal.objects.create(
            title="Test Deal",
            description="Test description",
            current_price=100.00,
            currency="MAD",
            category=category,
            merchant="Test Store",
            channel="online",
            author=user,
        )

        # Create comments for this user
        Comment.objects.create(content="Great deal!", deal=deal, user=user)

        Comment.objects.create(
            content="Thanks for sharing!", deal=deal, user=user
        )

        # Create comment for another user (should not appear)
        other_user = UserModel.objects.create_user(
            email="other@example.com",
            username="otheruser",
            password="testpass123",
            is_active=True,
        )
        Comment.objects.create(content="Other user comment", deal=deal, user=other_user)

        response = self.client.get(reverse("users:user-my-comments"))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

        # Check that only user's comments are returned
        comment_contents = [comment["content"] for comment in response.data["results"]]
        assert "Great deal!" in comment_contents
        assert "Thanks for sharing!" in comment_contents
        assert "Other user comment" not in comment_contents

    def test_my_comments_unauthenticated(self) -> None:
        """Test getting user's comments when not authenticated."""
        response = self.client.get(reverse("users:user-my-comments"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_change_password_success(self) -> None:
        """Test successful password change."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="oldpass123",
            is_active=True,
        )
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        data = {
            "current_password": "oldpass123",
            "new_password": "newpass123!",
            "new_password_confirm": "newpass123!",
        }

        response = self.client.post(reverse("users:user-change-password"), data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == "Password changed successfully."

        # Verify password was actually changed
        user.refresh_from_db()
        assert user.check_password("newpass123!")

    def test_change_password_wrong_current(self) -> None:
        """Test password change with wrong current password."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="oldpass123",
            is_active=True,
        )
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        data = {
            "current_password": "wrongpass",
            "new_password": "newpass123!",
            "new_password_confirm": "newpass123!",
        }

        response = self.client.post(reverse("users:user-change-password"), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Current password is incorrect" in str(response.data)

    def test_change_password_mismatch(self) -> None:
        """Test password change with mismatched new passwords."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="oldpass123",
            is_active=True,
        )
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        data = {
            "current_password": "oldpass123",
            "new_password": "newpass123!",
            "new_password_confirm": "differentpass123!",
        }

        response = self.client.post(reverse("users:user-change-password"), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "New passwords do not match" in str(response.data)

    def test_change_password_weak_password(self) -> None:
        """Test password change with weak new password."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="oldpass123",
            is_active=True,
        )
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        data = {
            "current_password": "oldpass123",
            "new_password": "123",  # Too weak
            "new_password_confirm": "123",
        }

        response = self.client.post(reverse("users:user-change-password"), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_change_password_unauthenticated(self) -> None:
        """Test password change when not authenticated."""
        data = {
            "current_password": "oldpass123",
            "new_password": "newpass123!",
            "new_password_confirm": "newpass123!",
        }

        response = self.client.post(reverse("users:user-change-password"), data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
