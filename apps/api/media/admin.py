"""Django admin configuration for media app."""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import MediaFile


@admin.register(MediaFile)
class MediaFileAdmin(admin.ModelAdmin):
    """Admin interface for MediaFile model with thumbnail preview."""

    list_display = [
        "thumbnail_preview",
        "key",
        "kind",
        "visibility",
        "mime_type",
        "size_display",
        "dimensions_display",
        "owner",
        "created_at",
        "uploaded_at",
    ]

    list_filter = [
        "kind",
        "visibility",
        "mime_type",
        "created_at",
    ]

    search_fields = [
        "key",
        "owner__username",
        "owner__email",
        "mime_type",
    ]

    readonly_fields = [
        "id",
        "thumbnail_display",
        "origin_url",
        "cf_url_display",
        "created_at",
        "uploaded_at",
        "size_bytes",
    ]

    fieldsets = (
        (
            "File Information",
            {
                "fields": (
                    "id",
                    "key",
                    "kind",
                    "visibility",
                    "mime_type",
                    "size_bytes",
                )
            },
        ),
        (
            "Image Details",
            {
                "fields": (
                    "width",
                    "height",
                    "thumbnail_display",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "URLs",
            {
                "fields": (
                    "origin_url",
                    "cf_url_display",
                )
            },
        ),
        (
            "Metadata",
            {
                "fields": (
                    "owner",
                    "alt_text",
                    "sha256",
                    "meta",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "uploaded_at",
                )
            },
        ),
    )

    def thumbnail_preview(self, obj: MediaFile) -> str:
        """
        Display a small thumbnail in the list view.

        Args:
            obj: MediaFile instance

        Returns:
            HTML for thumbnail image or placeholder
        """
        if obj.kind == "image":
            url = obj.cf_image_url(width=160, fit="cover", fmt="auto")
            if url:
                return format_html(
                    '<img src="{}" style="max-width:80px; max-height:60px; '
                    'object-fit:cover; border-radius:4px;" />',
                    url,
                )
        return mark_safe('<span style="color:#999;">—</span>')

    thumbnail_preview.short_description = "Preview"  # type: ignore[attr-defined]

    def thumbnail_display(self, obj: MediaFile) -> str:
        """
        Display a larger thumbnail in the detail view.

        Args:
            obj: MediaFile instance

        Returns:
            HTML for thumbnail image or message
        """
        if obj.kind == "image":
            url = obj.cf_image_url(width=400, fit="contain", fmt="auto")
            if url:
                return format_html(
                    '<img src="{}" style="max-width:400px; '
                    'border:1px solid #ddd; border-radius:4px;" />',
                    url,
                )
        return "Not an image"

    thumbnail_display.short_description = "Thumbnail"  # type: ignore[attr-defined]

    def size_display(self, obj: MediaFile) -> str:
        """
        Display file size in human-readable format.

        Args:
            obj: MediaFile instance

        Returns:
            Formatted file size
        """
        size = obj.size_bytes
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        else:
            return f"{size / (1024 * 1024):.2f} MB"

    size_display.short_description = "Size"  # type: ignore[attr-defined]

    def dimensions_display(self, obj: MediaFile) -> str:
        """
        Display image dimensions if available.

        Args:
            obj: MediaFile instance

        Returns:
            Dimensions string or dash
        """
        if obj.width and obj.height:
            return f"{obj.width} × {obj.height}"
        return "—"

    dimensions_display.short_description = "Dimensions"  # type: ignore[attr-defined]

    def cf_url_display(self, obj: MediaFile) -> str:
        """
        Display Cloudflare transformed URL with link.

        Args:
            obj: MediaFile instance

        Returns:
            HTML link or message
        """
        if obj.kind == "image":
            url = obj.cf_image_url(width=800, fit="cover", fmt="auto")
            if url:
                return format_html('<a href="{}" target="_blank">{}</a>', url, url)
            return "Transform not configured"
        return "Not an image"

    cf_url_display.short_description = "Cloudflare URL"  # type: ignore[attr-defined]
