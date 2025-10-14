"""
Custom permission classes for user-related views.
"""

from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from .models import User


class IsOwnerOrStaff(BasePermission):
    """Allows access only to the owner of the object or staff members."""

    def has_object_permission(self, request: Request, view: APIView, obj: User) -> bool:
        # Authenticated users only
        if not request.user.is_authenticated:
            return False
        # Staff can access any object
        if request.user.is_staff:
            return True
        # Owner can access their own object
        return bool(obj == request.user)


class IsOwner(BasePermission):
    """Allows access only to the owner of the object."""

    def has_object_permission(self, request: Request, view: APIView, obj: Any) -> bool:
        # Authenticated users only
        if not request.user.is_authenticated:
            return False
        # Owner can access their own object
        return bool(obj == request.user)
