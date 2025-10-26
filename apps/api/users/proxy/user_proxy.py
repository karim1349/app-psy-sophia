"""
User business logic proxy.

This module contains all business logic operations for the User model,
including authentication, registration, and user management.
"""

from datetime import datetime
from typing import Any, Dict, Optional, Type, TypeVar

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models import QuerySet
from rest_framework_simplejwt.tokens import RefreshToken
from ..jwt_serializers import CustomRefreshToken

from ..models import User

UserModel = TypeVar("UserModel", bound=User)


class UserProxy:
    """User business logic proxy."""

    def __init__(self) -> None:
        self.model_class: Type[User] = get_user_model()

    def get_by_id(self, user_id: int) -> Optional[User]:
        """Get model instance by ID."""
        try:
            return self.model_class.objects.get(id=user_id)
        except self.model_class.DoesNotExist:
            return None

    def get_by_id_or_raise(self, user_id: int) -> User:
        """Get model instance by ID or raise ValidationError."""
        user = self.get_by_id(user_id)
        if not user:
            raise ValidationError({"id": "User not found."})
        return user

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get a user by email, case-insensitive."""
        try:
            return self.model_class.objects.get(email__iexact=email)
        except self.model_class.DoesNotExist:
            return None

    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        try:
            return self.model_class.objects.get(username=username)
        except self.model_class.DoesNotExist:
            return None

    def authenticate_user(self, email: str, password: str) -> User:
        """Authenticate user if credentials are valid."""
        user = self.get_user_by_email(email)
        if user and user.check_password(password):
            return user
        raise ValidationError("Invalid credentials.")

    def register_user(self, data: Dict[str, Any]) -> User:
        """Register a new user."""
        self.validate_business_rules(data)
        user = self.model_class.objects.create_user(**data)
        return user

    def update_user_profile(self, user: User, data: Dict[str, Any]) -> User:
        """Update the user profile information."""
        self.validate_business_rules(data, user)
        for field, value in data.items():
            setattr(user, field, value)
        user.save()
        return user

    def activate_user(self, user: User) -> None:
        """Activate user."""
        user.is_active = True
        user.save(update_fields=["is_active"])

    def deactivate_user(self, user: User) -> None:
        """Deactivate user."""
        user.is_active = False
        user.save(update_fields=["is_active"])

    def delete_user(self, user: User) -> None:
        """Delete user."""
        user.delete()

    def list_active_users(self) -> QuerySet[User]:
        """List active users."""
        return self.model_class.objects.filter(is_active=True)

    def list_users_by_creation_date(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> QuerySet[User]:
        """List users by creation date, within an optional date range."""
        queryset = self.model_class.objects.all()
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        return queryset.order_by("created_at")

    def generate_tokens(self, user: User) -> Dict[str, str]:
        """Generate authentication tokens for a user."""
        refresh = CustomRefreshToken.for_user(user)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

    def verify_email(self, email: str, code: str) -> User:
        """Verify email with code and return the user."""
        # Get user by email
        user = self.get_user_by_email(email)
        if not user:
            raise ValidationError({"email": "User with this email does not exist."})

        # Verify code
        if not user.verify_email(code):
            raise ValidationError({"code": "Invalid or expired verification code."})

        return user

    def resend_verification(self, email: str) -> Dict[str, str]:
        """Resend verification email."""
        # Get user by email
        user = self.get_user_by_email(email)
        if not user:
            return {
                "message": "If an account exists, a verification code has been sent."
            }

        if user.is_active:
            return {
                "message": "If an account exists, a verification code has been sent."
            }

        # Generate new verification token
        user.generate_verification_token()

        # TODO: Send email with token
        # send_verification_email(user.email, token)

        return {"message": "If an account exists, a verification code has been sent."}

    def request_password_reset(self, email: str) -> Dict[str, str]:
        """Send password reset email."""
        # Get user by email
        user = self.get_user_by_email(email)
        if user:
            # Generate reset token
            user.password_reset_token = user.generate_verification_token()
            user.save()

            # TODO: Send email with token
            # reset_token = generate_password_reset_token(user)
            # send_password_reset_email(user.email, reset_token)
            pass

        return {
            "message": (
                "If an account with this email exists, "
                "a password reset link has been sent."
            )
        }

    def confirm_password_reset(
        self, token: str, new_password: str, password_confirm: str
    ) -> Dict[str, str]:
        """Reset password with token."""
        # Validate passwords match
        if new_password != password_confirm:
            raise ValidationError({"password": "Passwords do not match."})

        # Get user by token
        user = self.model_class.objects.filter(password_reset_token=token).first()
        if not user:
            raise ValidationError({"token": "Invalid or expired reset token."})

        # Reset password
        user.set_password(new_password)
        user.password_reset_token = None
        user.save()

        return {"message": "Password reset successful."}

    def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        """Refresh access token."""
        try:
            refresh = RefreshToken(refresh_token)
            return {"access": str(refresh.access_token)}
        except Exception as e:
            raise ValidationError({"refresh": str(e)})

    def logout_user(self, refresh_token: str) -> Dict[str, str]:
        """Blacklist refresh token."""
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return {"message": "Logout successful."}
        except Exception as e:
            raise ValidationError({"refresh": str(e)})

    def validate_business_rules(
        self, data: Dict[str, Any], user: Optional[User] = None
    ) -> None:
        """Validate business rules for user creation and updates."""
        password = data.get("password")
        if password and len(password) < 8:
            raise ValidationError(
                "This password is too short. It must contain at least 8 characters."
            )

        email = data.get("email", "").lower().strip()
        existing_user = self.get_user_by_email(email=email)
        if existing_user and (not user or existing_user.id != user.id):
            raise ValidationError({"email": "A user with this email already exists."})

        # Check username uniqueness
        if "username" in data:
            existing_user = self.get_user_by_username(data["username"])
            if existing_user and (not user or existing_user.id != user.id):
                raise ValidationError(
                    {"username": "A user with this username already exists."}
                )

            # Validate username format
            username = data["username"]
            if len(username) < 3:
                raise ValidationError(
                    {"username": "Username must be at least 3 characters long."}
                )
            if len(username) > 30:
                raise ValidationError(
                    {"username": "Username must be at most 30 characters long."}
                )
            cleaned_username = username.replace("_", "").replace("-", "")
            if not cleaned_username.isalnum():
                raise ValidationError(
                    {
                        "username": (
                            "Username can only contain letters, numbers, "
                            "hyphens, and underscores."
                        )
                    }
                )
