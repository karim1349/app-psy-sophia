"""
Django admin configuration for deals app.

Provides comprehensive admin interface for deal management,
moderation, and analytics following Django best practices.
"""

from typing import Any

from django.contrib import admin
from django.db.models import Count, Q, QuerySet
from django.http import HttpRequest
from django.utils.html import format_html

from .models import Comment, Deal, DealCategory, Vote


@admin.register(DealCategory)
class DealCategoryAdmin(admin.ModelAdmin):
    """Admin interface for deal categories."""

    list_display = [
        "name",
        "slug",
        "icon",
        "color_display",
        "is_active",
        "deal_count",
        "created_at",
    ]
    list_filter = ["is_active", "created_at"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at", "deal_count"]
    ordering = ["name"]

    @admin.display(description="Color")
    def color_display(self, obj: DealCategory) -> str:
        """Display color as a colored box."""
        if obj.color:
            return format_html(
                '<div style="width: 20px; height: 20px; background-color: {}; \
                    border: 1px solid #ccc;"></div>',
                obj.color,
            )
        return "-"

    @admin.display(description="Active Deals")
    def deal_count(self, obj: DealCategory) -> int:
        """Get active deal count for category."""
        return obj.deals.filter(status="active").count()

    def get_queryset(self, request: HttpRequest):  # type: ignore[no-untyped-def]
        """Optimize queryset with deal counts."""
        return (
            super()
            .get_queryset(request)
            .annotate(
                active_deal_count=Count("deals", filter=Q(deals__status="active"))
            )
        )


class VoteInline(admin.TabularInline):
    """Inline admin for votes."""

    model = Vote
    extra = 0
    readonly_fields = ["user", "vote_type", "reason", "created_at"]
    can_delete = False

    def has_add_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        """Disable adding votes through admin."""
        return False


class CommentInline(admin.TabularInline):
    """Inline admin for comments."""

    model = Comment
    extra = 0
    readonly_fields = ["user", "content", "parent", "is_edited", "created_at"]
    can_delete = True

    def has_add_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        """Disable adding comments through admin."""
        return False


@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    """Admin interface for deals with comprehensive management features."""

    list_display = [
        "title",
        "merchant",
        "category",
        "current_price",
        "discount_display",
        "channel",
        "city",
        "status",
        "is_verified",
        "vote_score",
        "comment_count",
        "author",
        "created_at",
    ]
    list_filter = [
        "status",
        "is_verified",
        "channel",
        "category",
        "currency",
        "created_at",
    ]
    search_fields = [
        "title",
        "description",
        "merchant",
        "city",
        "author__username",
        "author__email",
    ]
    readonly_fields = [
        "author",
        "discount_percentage",
        "is_expired",
        "vote_score",
        "comment_count",
        "created_at",
        "updated_at",
    ]
    list_editable = ["status", "is_verified"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]
    inlines = [VoteInline, CommentInline]

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "title",
                    "description",
                    "category",
                    "merchant",
                )
            },
        ),
        (
            "Pricing",
            {
                "fields": (
                    "current_price",
                    "original_price",
                    "currency",
                    "discount_percentage",
                )
            },
        ),
        (
            "Location & Channel",
            {
                "fields": (
                    "channel",
                    "city",
                    "url",
                )
            },
        ),
        (
            "Media & Proof",
            {
                "fields": (
                    "image",
                    "proof_url",
                )
            },
        ),
        (
            "Status & Moderation",
            {
                "fields": (
                    "status",
                    "is_verified",
                    "expires_at",
                    "is_expired",
                )
            },
        ),
        (
            "Metadata",
            {
                "fields": (
                    "author",
                    "vote_score",
                    "comment_count",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    @admin.display(description="Discount")
    def discount_display(self, obj: Deal) -> str:
        """Display discount percentage."""
        if obj.discount_percentage > 0:
            return f"{obj.discount_percentage}%"
        return "-"

    @admin.display(description="Vote Score")
    def vote_score(self, obj: Deal) -> int:
        """Get net vote score for deal."""
        return getattr(obj, "vote_score_cached", 0)

    @admin.display(description="Comments")
    def comment_count(self, obj: Deal) -> int:
        """Get comment count for deal."""
        return getattr(obj, "comment_count_cached", 0)

    def get_queryset(self, request: HttpRequest):  # type: ignore[no-untyped-def]
        """Optimize queryset with computed fields."""
        return (
            super()
            .get_queryset(request)
            .select_related("author", "category")
            .annotate(
                vote_score_cached=Count("votes", filter=Q(votes__vote_type="up"))
                - Count("votes", filter=Q(votes__vote_type="down")),
                comment_count_cached=Count("comments"),
            )
        )

    actions = ["mark_as_verified", "mark_as_unverified", "expire_deals"]

    @admin.action(description="Mark selected deals as verified")
    def mark_as_verified(self, request: HttpRequest, queryset: QuerySet[Deal]) -> None:
        """Mark selected deals as verified."""
        updated = queryset.update(is_verified=True)
        self.message_user(request, f"{updated} deals marked as verified.")

    @admin.action(description="Mark selected deals as unverified")
    def mark_as_unverified(
        self, request: HttpRequest, queryset: QuerySet[Deal]
    ) -> None:
        """Mark selected deals as unverified."""
        updated = queryset.update(is_verified=False)
        self.message_user(request, f"{updated} deals marked as unverified.")

    @admin.action(description="Expire selected deals")
    def expire_deals(self, request: HttpRequest, queryset: QuerySet[Deal]) -> None:
        """Expire selected deals."""
        updated = queryset.update(status="expired")
        self.message_user(request, f"{updated} deals expired.")


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    """Admin interface for votes."""

    list_display = [
        "deal",
        "user",
        "vote_type",
        "reason",
        "created_at",
    ]
    list_filter = [
        "vote_type",
        "created_at",
        "deal__category",
    ]
    search_fields = [
        "deal__title",
        "user__username",
        "user__email",
        "reason",
    ]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]

    def has_add_permission(self, request: HttpRequest) -> bool:
        """Disable adding votes through admin."""
        return False

    def has_change_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        """Disable changing votes through admin."""
        return False


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """Admin interface for comments."""

    list_display = [
        "deal",
        "user",
        "content_preview",
        "parent",
        "is_edited",
        "created_at",
    ]
    list_filter = [
        "is_edited",
        "created_at",
        "deal__category",
    ]
    search_fields = [
        "deal__title",
        "user__username",
        "user__email",
        "content",
    ]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]

    @admin.display(description="Content")
    def content_preview(self, obj: Comment) -> str:
        """Show preview of comment content."""
        if len(obj.content) > 50:
            return f"{obj.content[:50]}..."
        return obj.content

    def has_add_permission(self, request: HttpRequest) -> bool:
        """Disable adding comments through admin."""
        return False


# Admin site customization
admin.site.site_header = "Qiima Administration"
admin.site.site_title = "Qiima Admin"
admin.site.index_title = "Welcome to Qiima Administration"
