"""
Custom User model for app-psy-sophia application.

Uses email as the primary authentication field instead of username.
Includes account age tracking for vote dampening.
Includes email verification functionality.
"""

import random
from datetime import timedelta
from typing import Any

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model where email is the unique identifier for authentication.

    Fields:
        email: Unique email address (used for login)
        username: Unique username (3-30 chars, display name)
        is_active: Boolean for account activation
        is_staff: Boolean for admin site access
        is_superuser: Boolean for all permissions
        created_at: Timestamp when user was created
        updated_at: Timestamp when user was last updated
    """

    email = models.EmailField(
        _("email address"),
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        error_messages={
            "unique": _("A user with that email already exists."),
        },
    )

    username = models.CharField(
        _("username"),
        max_length=30,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text=_("Required for full accounts. 3-30 characters."),
        error_messages={
            "unique": _("A user with that username already exists."),
        },
    )

    is_active = models.BooleanField(
        _("active"),
        default=False,
        help_text=_(
            "Designates whether this user should be treated as active. "
            "Users must verify their email before becoming active."
        ),
    )

    is_guest = models.BooleanField(
        _("guest user"),
        default=False,
        db_index=True,
        help_text=_(
            "Designates whether this is a temporary guest user. "
            "Guest users can be converted to full accounts later."
        ),
    )

    email_verification_token = models.CharField(
        _("email verification token"),
        max_length=6,
        null=True,
        blank=True,
        db_index=True,
        help_text=_("6-digit code for email verification"),
    )

    email_verification_token_expires_at = models.DateTimeField(
        _("email verification token expires at"),
        null=True,
        blank=True,
        help_text=_("Expiration time for email verification token"),
    )

    password_reset_token = models.CharField(
        _("password reset token"),
        max_length=6,
        null=True,
        blank=True,
        db_index=True,
        help_text=_("6-digit code for password reset"),
    )

    password_reset_token_expires_at = models.DateTimeField(
        _("password reset token expires at"),
        null=True,
        blank=True,
        help_text=_("Expiration time for password reset token"),
    )

    is_staff = models.BooleanField(
        _("staff status"),
        default=False,
        help_text=_("Designates whether the user can log into this admin site."),
    )

    created_at = models.DateTimeField(
        _("date joined"),
        default=timezone.now,
        db_index=True,
    )

    updated_at = models.DateTimeField(
        _("last updated"),
        auto_now=True,
    )

    # Use email as the unique identifier for authentication
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    objects = UserManager()

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["username"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["email_verification_token"]),
            models.Index(fields=["is_guest"]),
        ]

    def get_full_name(self) -> str:
        """Return the username as the full name."""
        return self.username

    def get_short_name(self) -> str:
        """Return the username as the short name."""
        return self.username

    @property
    def account_age(self) -> timedelta:
        """
        Calculate the age of the account.

        Returns:
            timedelta: Time since account creation
        """
        return timezone.now() - self.created_at

    @property
    def is_new_account(self) -> bool:
        """
        Check if account is less than 24 hours old.

        Used for vote dampening - new accounts have reduced vote weight.

        Returns:
            bool: True if account is less than 24 hours old
        """
        return self.account_age < timedelta(hours=24)

    def generate_verification_token(self) -> str:
        """
        Generate a 6-digit verification token for email verification.

        Sets the token and expiration time (24 hours from now).
        Saves the user instance.

        Returns:
            str: The generated 6-digit token
        """
        # Generate random 6-digit code
        token = "".join([str(random.randint(0, 9)) for _ in range(6)])

        # Set token and expiry
        self.email_verification_token = token
        self.email_verification_token_expires_at = timezone.now() + timedelta(hours=24)

        # Save to database
        self.save(
            update_fields=[
                "email_verification_token",
                "email_verification_token_expires_at",
            ]
        )

        return token

    def verify_email(self, token: str) -> bool:
        """
        Verify email address with the provided token.

        Validates:
        - Token exists in database
        - Token matches provided token
        - Token has not expired

        If valid, activates the user account and clears the token.

        Args:
            token: The 6-digit verification token

        Returns:
            bool: True if verification successful, False otherwise
        """
        # Check if token exists
        if not self.email_verification_token:
            return False

        # Check if token matches
        if self.email_verification_token != token:
            return False

        # Check if token is expired
        if (
            not self.email_verification_token_expires_at
            or self.email_verification_token_expires_at <= timezone.now()
        ):
            return False

        # Token is valid - activate user and clear token
        self.is_active = True
        self.email_verification_token = None
        self.email_verification_token_expires_at = None
        self.save(
            update_fields=[
                "is_active",
                "email_verification_token",
                "email_verification_token_expires_at",
            ]
        )

        return True

    def save(self, *args: Any, **kwargs: Any) -> None:
        # Normalize email to lowercase (if present)
        if self.email:
            self.email = self.email.lower()
        super().save(*args, **kwargs)
