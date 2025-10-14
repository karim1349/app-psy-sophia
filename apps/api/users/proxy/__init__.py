"""
Proxy layer for users app.

This module contains business logic proxies that handle all data operations,
validation, and business rules for the users app.
"""

from .user_proxy import UserProxy

__all__ = ["UserProxy"]
