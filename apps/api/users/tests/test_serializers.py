"""
Test cases for user serializers.

Tests serializer validation, output format, and business rules.
"""

import pytest
from django.contrib.auth import get_user_model

from ..factories import UserFactory
from ..serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

UserModel = get_user_model()


@pytest.mark.django_db
class TestUserSerializer:
    """Test UserSerializer functionality."""

    def test_user_serializer_output(self) -> None:
        """Test user serializer output format."""
        user = UserFactory(is_active=True)

        serializer = UserSerializer(user)
        data = serializer.data

        assert data["email"] == user.email
        assert data["username"] == user.username
        assert data["is_active"] is True
        assert "account_age" in data
        assert "is_new_account" in data
        assert "password" not in data  # Password should not be in output

    def test_user_serializer_read_only_fields(self) -> None:
        """Test that certain fields are read-only."""
        user = UserFactory()

        serializer = UserSerializer(user, data={"email": "new@example.com"})
        assert serializer.is_valid()
        # Email should not be updated
        assert serializer.validated_data.get("email") is None


@pytest.mark.django_db
class TestRegisterSerializer:
    """Test RegisterSerializer functionality."""

    def test_register_serializer_valid_data(self) -> None:
        """Test registration with valid data."""
        data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "testpass123",
            "password_confirm": "testpass123",
        }

        serializer = RegisterSerializer(data=data)
        assert serializer.is_valid()
        validated_data = serializer.validated_data

        assert validated_data["email"] == "test@example.com"
        assert validated_data["username"] == "testuser"
        assert validated_data["password"] == "testpass123"

    def test_register_serializer_duplicate_email(self) -> None:
        """Test registration with duplicate email."""
        existing_user = UserFactory()

        data = {
            "email": existing_user.email,
            "username": "newuser",
            "password": "testpass123",
            "password_confirm": "testpass123",
        }

        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert "email" in serializer.errors

    def test_register_serializer_password_mismatch(self) -> None:
        """Test registration with password mismatch."""
        data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "testpass123",
            "password_confirm": "differentpass",
        }

        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert "password_confirm" in serializer.errors

    def test_register_serializer_email_normalization(self) -> None:
        """Test email normalization in registration."""
        data = {
            "email": "TEST@EXAMPLE.COM",
            "username": "testuser",
            "password": "testpass123",
            "password_confirm": "testpass123",
        }

        serializer = RegisterSerializer(data=data)
        assert serializer.is_valid()
        assert serializer.validated_data["email"] == "test@example.com"


@pytest.mark.django_db
class TestUserUpdateSerializer:
    """Test UserUpdateSerializer functionality."""

    def test_user_update_serializer_valid_data(self) -> None:
        """Test user update with valid data."""
        user = UserFactory()

        data = {"username": "updateduser"}

        serializer = UserUpdateSerializer(user, data=data)
        assert serializer.is_valid()
        updated_user = serializer.save()

        assert updated_user.username == "updateduser"

    def test_user_update_serializer_duplicate_username(self) -> None:
        """Test user update with duplicate username."""
        existing_user = UserFactory()
        user = UserFactory()

        data = {"username": existing_user.username}

        serializer = UserUpdateSerializer(user, data=data)
        assert not serializer.is_valid()
        assert "username" in serializer.errors

    def test_user_update_serializer_short_username(self) -> None:
        """Test user update with short username."""
        user = UserModel.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )

        data = {"username": "ab"}

        serializer = UserUpdateSerializer(user, data=data)
        assert not serializer.is_valid()
        assert "username" in serializer.errors


@pytest.mark.django_db
class TestLoginSerializer:
    """Test LoginSerializer functionality."""

    def test_login_serializer_valid_credentials(self) -> None:
        """Test login with valid credentials."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        data = {"email": "test@example.com", "password": "testpass123"}

        serializer = LoginSerializer(data=data)
        assert serializer.is_valid()
        assert serializer.validated_data["user"] == user

    def test_login_serializer_invalid_password(self) -> None:
        """Test login with invalid password."""
        UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        data = {"email": "test@example.com", "password": "wrongpassword"}

        serializer = LoginSerializer(data=data)
        assert not serializer.is_valid()
        assert "non_field_errors" in serializer.errors

    def test_login_serializer_email_case_insensitive(self) -> None:
        """Test login with case insensitive email."""
        user = UserModel.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            is_active=True,
        )

        data = {"email": "TEST@EXAMPLE.COM", "password": "testpass123"}

        serializer = LoginSerializer(data=data)
        assert serializer.is_valid()
        assert serializer.validated_data["user"] == user
