"""
Django app configuration for deals.
"""

from django.apps import AppConfig


class DealsConfig(AppConfig):
    """Configuration for the deals app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "deals"
    verbose_name = "Deals"
