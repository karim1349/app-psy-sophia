"""
Deal models for Qiima application.

Includes Deal, DealCategory, Vote, and Comment models with proper relationships
and business logic following the established patterns.
"""

from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

User = get_user_model()


class BaseModel(models.Model):
    """Base model with common timestamp fields."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class DealCategory(BaseModel):
    """
    Category for organizing deals.

    Fields:
        name: Category name (e.g., "Electronics", "Fashion")
        slug: URL-friendly identifier
        icon: Optional icon identifier for UI
        color: Optional color code for UI theming
        is_active: Boolean for enabling/disabling categories
    """

    name = models.CharField(
        _("name"),
        max_length=100,
        unique=True,
        db_index=True,
        help_text=_("Category name (e.g., Electronics, Fashion)"),
    )

    slug = models.SlugField(
        _("slug"),
        max_length=100,
        unique=True,
        db_index=True,
        help_text=_("URL-friendly identifier"),
    )

    icon = models.CharField(
        _("icon"),
        max_length=50,
        blank=True,
        help_text=_("Icon identifier for UI (e.g., 'laptop', 'shirt')"),
    )

    color = models.CharField(
        _("color"),
        max_length=7,
        blank=True,
        help_text=_("Hex color code for UI theming (e.g., #FF5722)"),
    )

    is_active = models.BooleanField(
        _("active"),
        default=True,
        help_text=_("Whether this category is active and visible"),
    )

    class Meta:
        verbose_name = _("deal category")
        verbose_name_plural = _("deal categories")
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["slug"]),
            models.Index(fields=["is_active", "name"]),
        ]

    def __str__(self) -> str:
        return str(self.name)


class Deal(BaseModel):
    """
    Main deal model representing a deal/promotion.

    Core fields for deal information, relationships, location, media,
    and status tracking following the established patterns.
    """

    # Core deal information
    title = models.CharField(
        _("title"),
        max_length=200,
        db_index=True,
        help_text=_("Deal title (max 200 characters)"),
    )

    description = models.TextField(
        _("description"),
        help_text=_("Detailed description of the deal"),
    )

    current_price = models.DecimalField(
        _("current price"),
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text=_("Current deal price"),
    )

    original_price = models.DecimalField(
        _("original price"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text=_("Original price before discount (optional)"),
    )

    currency = models.CharField(
        _("currency"),
        max_length=3,
        default="MAD",
        choices=[
            ("MAD", "Moroccan Dirham"),
            ("USD", "US Dollar"),
            ("EUR", "Euro"),
        ],
        help_text=_("Currency code"),
    )

    # Relationships
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="deals",
        verbose_name=_("author"),
        help_text=_("User who posted this deal"),
    )

    category = models.ForeignKey(
        DealCategory,
        on_delete=models.CASCADE,
        related_name="deals",
        verbose_name=_("category"),
        help_text=_("Deal category"),
    )

    merchant = models.CharField(
        _("merchant"),
        max_length=100,
        db_index=True,
        help_text=_("Merchant or store name"),
    )

    # Location and channel
    CHANNEL_CHOICES = [
        ("online", _("Online")),
        ("in_store", _("In Store")),
    ]

    channel = models.CharField(
        _("channel"),
        max_length=10,
        choices=CHANNEL_CHOICES,
        help_text=_("Where the deal is available"),
    )

    city = models.CharField(
        _("city"),
        max_length=100,
        blank=True,
        db_index=True,
        help_text=_("City (required for in-store deals)"),
    )

    url = models.URLField(
        _("URL"),
        blank=True,
        help_text=_("Deal URL (required for online deals)"),
    )

    # Media and proof
    image = models.ImageField(
        _("image"),
        upload_to="deals/images/",
        null=True,
        blank=True,
        help_text=_("Deal image"),
    )

    proof_url = models.URLField(
        _("proof URL"),
        blank=True,
        help_text=_("Additional proof URL (screenshot, etc.)"),
    )

    # Status and moderation
    STATUS_CHOICES = [
        ("active", _("Active")),
        ("expired", _("Expired")),
        ("merged_into", _("Merged Into Another")),
        ("flagged", _("Flagged")),
    ]

    status = models.CharField(
        _("status"),
        max_length=20,
        choices=STATUS_CHOICES,
        default="active",
        db_index=True,
        help_text=_("Deal status"),
    )

    is_verified = models.BooleanField(
        _("verified"),
        default=False,
        db_index=True,
        help_text=_("Whether this deal has been verified by moderators"),
    )

    expires_at = models.DateTimeField(
        _("expires at"),
        null=True,
        blank=True,
        db_index=True,
        help_text=_("When this deal expires (optional)"),
    )

    class Meta:
        verbose_name = _("deal")
        verbose_name_plural = _("deals")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["merchant", "-created_at"]),
            models.Index(fields=["category", "-created_at"]),
            models.Index(fields=["city", "-created_at"]),
            models.Index(fields=["expires_at"]),
            models.Index(fields=["is_verified", "-created_at"]),
            models.Index(fields=["author", "-created_at"]),
        ]

    def __str__(self) -> str:
        return str(self.title)

    @property
    def discount_percentage(self) -> float:
        """
        Calculate discount percentage if original price is available.

        Returns:
            float: Discount percentage (0-100), or 0 if no original price
        """
        if self.original_price and self.original_price > self.current_price:
            discount = (self.original_price - self.current_price) / self.original_price
            return float(round(discount * 100, 1))
        return 0.0

    @property
    def is_expired(self) -> bool:
        """
        Check if deal has expired.

        Returns:
            bool: True if deal has expired or status is expired
        """
        if self.status == "expired":
            return True
        if self.expires_at and self.expires_at <= timezone.now():
            return True
        return False

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Override save to handle automatic expiration."""
        # Auto-expire if expires_at is in the past
        if self.expires_at and self.expires_at <= timezone.now():
            self.status = "expired"
        super().save(*args, **kwargs)


class Vote(BaseModel):
    """
    Vote model for deal voting system.

    Allows users to upvote or downvote deals with optional reasoning.
    Enforces one vote per user per deal.
    """

    VOTE_CHOICES = [
        ("up", _("Upvote")),
        ("down", _("Downvote")),
    ]

    deal = models.ForeignKey(
        Deal,
        on_delete=models.CASCADE,
        related_name="votes",
        verbose_name=_("deal"),
        help_text=_("Deal being voted on"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="votes",
        verbose_name=_("user"),
        help_text=_("User casting the vote"),
    )

    vote_type = models.CharField(
        _("vote type"),
        max_length=4,
        choices=VOTE_CHOICES,
        help_text=_("Type of vote (up or down)"),
    )

    reason = models.CharField(
        _("reason"),
        max_length=100,
        blank=True,
        help_text=_("Optional reason for downvote"),
    )

    class Meta:
        verbose_name = _("vote")
        verbose_name_plural = _("votes")
        unique_together = ["deal", "user"]
        indexes = [
            models.Index(fields=["deal", "vote_type"]),
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["deal", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.username} {self.vote_type}voted {self.deal.title}"


class Comment(BaseModel):
    """
    Comment model for deal discussions.

    Supports threaded comments with parent/child relationships.
    Tracks edit history and provides moderation capabilities.
    """

    deal = models.ForeignKey(
        Deal,
        on_delete=models.CASCADE,
        related_name="comments",
        verbose_name=_("deal"),
        help_text=_("Deal being commented on"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="comments",
        verbose_name=_("user"),
        help_text=_("User posting the comment"),
    )

    content = models.TextField(
        _("content"),
        max_length=500,
        help_text=_("Comment content (max 500 characters)"),
    )

    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
        verbose_name=_("parent comment"),
        help_text=_("Parent comment for threading (optional)"),
    )

    is_edited = models.BooleanField(
        _("edited"),
        default=False,
        help_text=_("Whether this comment has been edited"),
    )

    class Meta:
        verbose_name = _("comment")
        verbose_name_plural = _("comments")
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["deal", "created_at"]),
            models.Index(fields=["parent", "created_at"]),
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"Comment by {self.user.username} on {self.deal.title}"

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Override save to track edits."""
        if self.pk:  # Existing comment
            original = Comment.objects.get(pk=self.pk)
            if original.content != self.content:
                self.is_edited = True
        super().save(*args, **kwargs)
