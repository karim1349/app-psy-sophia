"""Media models for R2 storage and Cloudflare Image Transformations."""

import uuid
from typing import Optional
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class MediaFile(models.Model):
    """
    Represents a file stored in Cloudflare R2 with optional image transformation support.

    Supports both images and generic files, with public/private visibility controls.
    """

    KIND_CHOICES = [
        ("image", "Image"),
        ("file", "File"),
    ]

    VISIBILITY_CHOICES = [
        ("public", "Public"),
        ("private", "Private"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="media_files",
        help_text="User who uploaded the file",
    )
    key = models.CharField(
        max_length=500, unique=True, db_index=True, help_text="R2 object key (path)"
    )
    kind = models.CharField(
        max_length=10,
        choices=KIND_CHOICES,
        default="file",
        help_text="Type of media file",
    )
    visibility = models.CharField(
        max_length=10,
        choices=VISIBILITY_CHOICES,
        default="public",
        help_text="Access control level",
    )
    mime_type = models.CharField(max_length=100, help_text="MIME type of the file")
    size_bytes = models.PositiveIntegerField(default=0, help_text="File size in bytes")
    width = models.PositiveIntegerField(
        null=True, blank=True, help_text="Image width in pixels (for images only)"
    )
    height = models.PositiveIntegerField(
        null=True, blank=True, help_text="Image height in pixels (for images only)"
    )
    sha256 = models.CharField(
        max_length=64, blank=True, help_text="SHA-256 hash of the file content"
    )
    alt_text = models.CharField(
        max_length=255, blank=True, help_text="Alternative text for accessibility"
    )
    meta = models.JSONField(default=dict, blank=True, help_text="Additional metadata")
    created_at = models.DateTimeField(
        auto_now_add=True, help_text="When the record was created"
    )
    uploaded_at = models.DateTimeField(
        null=True, blank=True, help_text="When the file was successfully uploaded to R2"
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"]),
            models.Index(fields=["kind", "visibility"]),
        ]
        verbose_name = "Media File"
        verbose_name_plural = "Media Files"

    def __str__(self) -> str:
        return f"{self.kind}: {self.key}"

    @property
    def origin_url(self) -> str:
        """
        Get the direct R2 public URL for this file.

        Returns:
            Full URL to access the file from R2 public bucket
        """
        base = getattr(settings, "MEDIA_PUBLIC_BASE", "")
        if not base:
            return ""
        # Ensure base ends with / and key doesn't start with /
        base = base.rstrip("/")
        key = self.key.lstrip("/")
        return f"{base}/{quote(key, safe='/')}"

    def cf_image_url(
        self, width: Optional[int] = None, fit: str = "cover", fmt: str = "auto"
    ) -> Optional[str]:
        """
        Get Cloudflare Image Transformation URL for this file.

        Args:
            width: Target width in pixels
            fit: Resize mode ('cover', 'contain', 'crop', 'pad', 'scale-down')
            fmt: Output format ('auto', 'webp', 'avif', 'jpeg', 'png')

        Returns:
            Transformed image URL, or None if not an image or TRANSFORM_BASE not set
        """
        if self.kind != "image":
            return None

        transform_base = getattr(settings, "TRANSFORM_BASE", "")
        if not transform_base:
            return None

        # Build transformation parameters
        params = []
        if width:
            params.append(f"width={width}")
        if fit:
            params.append(f"fit={fit}")
        if fmt:
            params.append(f"format={fmt}")

        # Cloudflare Images format: /cdn-cgi/image/width=800,fit=cover,format=auto/https://...
        param_str = ",".join(params)
        origin = self.origin_url

        # Ensure transform_base doesn't end with /
        transform_base = transform_base.rstrip("/")

        return f"{transform_base}/{param_str}/{origin}"
