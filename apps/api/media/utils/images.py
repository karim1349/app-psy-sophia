"""Utility functions for generating image URLs with Cloudflare transformations."""

from typing import Optional
from urllib.parse import quote

from django.conf import settings


def origin_url_from_key(key: str) -> str:
    """
    Build the direct R2 public URL from an object key.

    Args:
        key: The R2 object key (path)

    Returns:
        Full URL to access the file, or empty string if MEDIA_PUBLIC_BASE not set
    """
    base = getattr(settings, "MEDIA_PUBLIC_BASE", "")
    if not base:
        return ""

    # Ensure base ends without / and key doesn't start with /
    base = base.rstrip("/")
    key = key.lstrip("/")

    return f"{base}/{quote(key, safe='/')}"


def cf_image_url_from_key(
    key: str, width: int = 800, fit: str = "cover", fmt: str = "auto"
) -> Optional[str]:
    """
    Build a Cloudflare Image Transformation URL from an object key.

    Args:
        key: The R2 object key (path)
        width: Target width in pixels (default: 800)
        fit: Resize mode - 'cover', 'contain', 'crop', 'pad', 'scale-down' (default: 'cover')
        fmt: Output format - 'auto', 'webp', 'avif', 'jpeg', 'png' (default: 'auto')

    Returns:
        Transformed image URL, or None if TRANSFORM_BASE not configured
    """
    transform_base = getattr(settings, "TRANSFORM_BASE", "")
    if not transform_base:
        # Fallback to origin URL if transforms not available
        origin = origin_url_from_key(key)
        return origin if origin else None

    # Build transformation parameters
    params = []
    if width:
        params.append(f"width={width}")
    if fit:
        params.append(f"fit={fit}")
    if fmt:
        params.append(f"format={fmt}")

    param_str = ",".join(params)
    origin = origin_url_from_key(key)

    if not origin:
        return None

    # Ensure transform_base doesn't end with /
    transform_base = transform_base.rstrip("/")

    # Cloudflare Images format: /cdn-cgi/image/width=800,fit=cover,format=auto/https://...
    return f"{transform_base}/{param_str}/{origin}"
