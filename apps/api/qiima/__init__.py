"""
Qiima API Application

This package contains the main Django application configuration for Qiima.
"""

# Patch DRF error messages to use i18n keys at startup
from .drf_i18n import patch_drf_error_messages

patch_drf_error_messages()
