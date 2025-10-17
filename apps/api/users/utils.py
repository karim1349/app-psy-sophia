"""
Utility functions for user management.

Includes email sending helpers for verification flows.
"""

from django.conf import settings
from django.core.mail import send_mail

from .models import User


def send_verification_email(user: User) -> None:
    """
    Send email verification code to user.

    Args:
        user: User instance with email_verification_token set

    Raises:
        ValueError: If user has no verification token
    """
    if not user.email_verification_token:
        raise ValueError("User has no verification token")

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
        ValueError: If user has no password reset token
    """
    if not hasattr(user, "password_reset_token") or not user.password_reset_token:
        raise ValueError("User has no password reset token")

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
