"""
Serializers for user authentication and management.

Includes validators for registration, login, and password reset flows.
"""

from typing import Any, Dict

from rest_framework import serializers

from .models import User
from .proxy.user_proxy import UserProxy
from .utils import validate_password_with_i18n


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for safe user data output.

    Excludes sensitive fields like password.
    Used for displaying user information in responses.
    """

    account_age = serializers.SerializerMethodField()
    is_new_account = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "created_at",
            "is_active",
            "is_guest",
            "account_age",
            "is_new_account",
        ]
        read_only_fields = [
            "id",
            "email",
            "username",
            "created_at",
            "is_active",
            "is_guest",
            "account_age",
            "is_new_account",
        ]

    def get_account_age(self, obj: User) -> str:
        """Get account age in days."""
        return str(obj.account_age)

    def get_is_new_account(self, obj: User) -> bool:
        """Check if account is new (less than 24 hours old)."""
        return obj.is_new_account


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.

    Validates:
    - Email uniqueness (case-insensitive)
    - Username length (3-30 chars) and uniqueness
    - Password strength (Django validators)
    - Password confirmation match
    """

    password = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )
    password_confirm = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = ["email", "username", "password", "password_confirm"]
        extra_kwargs = {
            "email": {"required": True},
            "username": {"required": True, "min_length": 3, "max_length": 30},
        }

    def validate_email(self, value: str) -> str:
        """Validate email uniqueness (case-insensitive)."""

        # Normalize email for case-insensitive comparison
        normalized_email = value.lower()
        proxy = UserProxy()
        if proxy.get_user_by_email(normalized_email):
            raise serializers.ValidationError("auth.register.emailExists")
        return normalized_email

    def validate_username(self, value: str) -> str:
        """Validate username length and uniqueness."""

        if len(value) < 3:
            raise serializers.ValidationError("validation.minLength")
        if len(value) > 30:
            raise serializers.ValidationError("validation.maxLength")
        proxy = UserProxy()
        if proxy.get_user_by_username(value):
            raise serializers.ValidationError("auth.register.usernameExists")
        return value

    def validate_password(self, value: str) -> str:
        """Validate password strength using Django's validators with i18n keys."""
        validate_password_with_i18n(value)
        return value

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that passwords match."""
        if attrs.get("password") != attrs.get("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "auth.register.passwordMismatch"}
            )
        return attrs

    def create(self, validated_data: Dict[str, Any]) -> User:
        """Create a new user with hashed password."""

        # Remove password_confirm as it's not needed for user creation
        validated_data.pop("password_confirm", None)

        # Use the proxy to create user
        proxy = UserProxy()
        user = proxy.register_user(validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile.

    Allows updating username and other non-sensitive fields.
    Email updates require separate verification flow.
    """

    class Meta:
        model = User
        fields = ["username"]
        extra_kwargs = {
            "username": {"required": False, "min_length": 3, "max_length": 30},
        }

    def validate_username(self, value: str) -> str:
        """Validate username length and uniqueness."""

        if len(value) < 3:
            raise serializers.ValidationError("validation.minLength")
        if len(value) > 30:
            raise serializers.ValidationError("validation.maxLength")
        proxy = UserProxy()
        if proxy.get_user_by_username(value):
            raise serializers.ValidationError("auth.register.usernameExists")
        return value


class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login/authentication.

    Validates:
    - Email and password are provided
    - Credentials are correct
    - User account is active

    Returns authenticated user in validated_data['user'].
    Note: Actual authentication with request context should be done in the view.
    """

    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True, write_only=True, style={"input_type": "password"}
    )

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """Validate credentials."""

        email = attrs.get("email", "").lower()
        password = attrs.get("password")

        if not email or not password:
            raise serializers.ValidationError("auth.login.missingFields")

        # Use proxy to get user
        proxy = UserProxy()
        user = proxy.get_user_by_email(email)

        if not user:
            raise serializers.ValidationError("auth.login.invalidCredentials")

        # Check password
        if not user.check_password(password):
            raise serializers.ValidationError("auth.login.invalidCredentials")

        attrs["user"] = user
        return attrs

    def update(self, instance: Any, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - this serializer is for validation only."""
        raise NotImplementedError("LoginSerializer does not support updates.")

    def create(self, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - this serializer is for validation only."""
        raise NotImplementedError("LoginSerializer does not support creation.")


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for requesting a password reset.

    Always returns success even if email doesn't exist (security best practice).
    The view layer handles sending the email if the user exists.
    """

    email = serializers.EmailField(required=True)

    def validate_email(self, value: str) -> str:
        """Normalize email for case-insensitive lookup."""
        return value.lower()

    def update(self, instance: Any, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - this serializer is for validation only."""
        raise NotImplementedError()

    def create(self, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - this serializer is for validation only."""
        raise NotImplementedError()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming password reset with token.

    Validates:
    - Token format (validation of actual token happens in view)
    - New password strength
    - Password confirmation match
    """

    token = serializers.CharField(required=True, write_only=True)
    password = serializers.CharField(
        required=True, write_only=True, style={"input_type": "password"}
    )
    password_confirm = serializers.CharField(
        required=True, write_only=True, style={"input_type": "password"}
    )

    def validate_password(self, value: str) -> str:
        """Validate password strength using Django's validators with i18n keys."""
        validate_password_with_i18n(value)
        return value

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that passwords match."""
        if attrs.get("password") != attrs.get("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "auth.register.passwordMismatch"}
            )
        return attrs

    def update(self, instance: Any, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - this serializer is for validation only."""
        raise NotImplementedError()

    def create(self, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - this serializer is for validation only."""
        raise NotImplementedError()


class VerifyEmailSerializer(serializers.Serializer):
    """
    Serializer for email verification with code.

    Validates:
    - Email format
    - Code is exactly 6 digits and numeric
    """

    email = serializers.EmailField(required=True)
    code = serializers.CharField(
        required=True, min_length=6, max_length=6, help_text="6-digit verification code"
    )

    def validate_email(self, value: str) -> str:
        """Normalize email for case-insensitive lookup."""
        return value.lower()

    def validate_code(self, value: str) -> str:
        """Validate that code is exactly 6 numeric digits."""
        if not value.isdigit():
            raise serializers.ValidationError("auth.verifyEmail.invalidCode")
        if len(value) != 6:
            raise serializers.ValidationError("auth.verifyEmail.invalidCode")
        return value

    def update(self, instance: Any, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - this serializer is for validation only."""
        raise NotImplementedError()

    def create(self, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - this serializer is for validation only."""
        raise NotImplementedError()


class ResendVerificationSerializer(serializers.Serializer):
    """
    Serializer for resending verification email.

    Validates:
    - Email format
    """

    email = serializers.EmailField(required=True)

    def validate_email(self, value: str) -> str:
        """Normalize email for case-insensitive lookup."""
        return value.lower()

    def update(self, instance: Any, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - this serializer is for validation only."""
        raise NotImplementedError()

    def create(self, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - this serializer is for validation only."""
        raise NotImplementedError()


class ConvertGuestSerializer(serializers.Serializer):
    """
    Serializer for converting a guest user to a full account.

    Validates:
    - Email uniqueness (case-insensitive)
    - Username length (3-30 chars) and uniqueness
    - Password strength (Django validators)
    - Password confirmation match
    """

    email = serializers.EmailField(required=True)
    username = serializers.CharField(required=True, min_length=3, max_length=30)
    password = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )
    password_confirm = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )

    def validate_email(self, value: str) -> str:
        """Validate email uniqueness (case-insensitive)."""
        normalized_email = value.lower()
        proxy = UserProxy()
        existing_user = proxy.get_user_by_email(normalized_email)

        # Allow if email doesn't exist or belongs to the current user
        current_user = self.context.get("user")
        if existing_user and current_user and existing_user.id != current_user.id:
            raise serializers.ValidationError("auth.register.emailExists")
        return normalized_email

    def validate_username(self, value: str) -> str:
        """Validate username length and uniqueness."""
        if len(value) < 3:
            raise serializers.ValidationError("validation.minLength")
        if len(value) > 30:
            raise serializers.ValidationError("validation.maxLength")

        proxy = UserProxy()
        existing_user = proxy.get_user_by_username(value)

        # Allow if username doesn't exist or belongs to the current user
        current_user = self.context.get("user")
        if existing_user and current_user and existing_user.id != current_user.id:
            raise serializers.ValidationError("auth.register.usernameExists")
        return value

    def validate_password(self, value: str) -> str:
        """Validate password strength using Django's validators with i18n keys."""
        validate_password_with_i18n(value)
        return value

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that passwords match."""
        if attrs.get("password") != attrs.get("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "auth.register.passwordMismatch"}
            )
        return attrs

    def update(self, instance: Any, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - this serializer is for validation only."""
        raise NotImplementedError()

    def create(self, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - this serializer is for validation only."""
        raise NotImplementedError()
