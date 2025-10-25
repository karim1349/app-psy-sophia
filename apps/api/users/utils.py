"""
Utility functions for user management.

Includes email sending helpers for verification flows and password validation.
"""

from typing import Optional

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from rest_framework import serializers

from .models import User


def send_verification_email(user: User) -> None:
    """
    Send email verification code to user.

    Args:
        user: User instance with email_verification_token set

    Raises:
        ValueError: If user has no verification token or email
    """
    if not user.email_verification_token:
        raise ValueError("User has no verification token")

    if not user.email:
        raise ValueError("User has no email address")

    subject = "Verify your app-psy-sophia account"
    message = f"""Hello {user.username},

Thank you for registering with app-psy-sophia!

Your verification code is: {user.email_verification_token}

This code will expire in 24 hours.

If you didn't create this account, please ignore this email.

Best regards,
app-psy-sophia Team
"""

    send_mail(
        subject,
        message,
        settings.EMAIL_FROM,
        [user.email],
        fail_silently=False,
    )


def send_password_reset_email(user: User) -> None:
    """
    Send password reset email to user.

    Args:
        user: User instance with password_reset_token set

    Raises:
        ValueError: If user has no password reset token or email
    """
    if not hasattr(user, "password_reset_token") or not user.password_reset_token:
        raise ValueError("User has no password reset token")

    if not user.email:
        raise ValueError("User has no email address")

    subject = "Reset your app-psy-sophia password"
    message = f"""Hello {user.username},

You requested a password reset for your app-psy-sophia account.

Your password reset code is: {user.password_reset_token}

This code will expire in 1 hour.

If you didn't request this password reset, please ignore this email.

Best regards,
app-psy-sophia Team
"""

    send_mail(
        subject,
        message,
        settings.EMAIL_FROM,
        [user.email],
        fail_silently=False,
    )


def validate_password_with_i18n(password: str, user: Optional[User] = None) -> None:
    """
    Validate password using Django's validators and return i18n error keys.

    Maps Django's built-in password validation errors to i18n keys that
    the frontend can translate.

    Args:
        password: The password to validate
        user: Optional user instance for similarity checks

    Raises:
        serializers.ValidationError: With list of i18n error keys

    Example:
        >>> validate_password_with_i18n("123")
        ValidationError(['validation.password.tooShort', 'validation.password.entirelyNumeric'])
    """
    try:
        validate_password(password, user=user)
    except DjangoValidationError as e:
        # Map Django error codes/messages to i18n keys
        i18n_errors = []

        for error in e.error_list:
            # Django password validators use these codes:
            # - password_too_short (MinimumLengthValidator)
            # - password_too_common (CommonPasswordValidator)
            # - password_entirely_numeric (NumericPasswordValidator)
            # - password_too_similar (UserAttributeSimilarityValidator)

            if hasattr(error, "code"):
                code = error.code
                if code == "password_too_short":
                    i18n_errors.append("validation.password.tooShort")
                elif code == "password_too_common":
                    i18n_errors.append("validation.password.tooCommon")
                elif code == "password_entirely_numeric":
                    i18n_errors.append("validation.password.entirelyNumeric")
                elif code == "password_too_similar":
                    i18n_errors.append("validation.password.tooSimilar")
                else:
                    # Fallback for unknown codes
                    i18n_errors.append("auth.register.weakPassword")
            else:
                # No code available, check message content as fallback
                message = str(error.message).lower()
                if "short" in message or "at least" in message:
                    i18n_errors.append("validation.password.tooShort")
                elif "common" in message:
                    i18n_errors.append("validation.password.tooCommon")
                elif "numeric" in message:
                    i18n_errors.append("validation.password.entirelyNumeric")
                elif "similar" in message:
                    i18n_errors.append("validation.password.tooSimilar")
                else:
                    # Generic fallback
                    i18n_errors.append("auth.register.weakPassword")

        if i18n_errors:
            raise serializers.ValidationError(i18n_errors)
