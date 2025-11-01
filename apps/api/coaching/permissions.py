"""
Custom permissions for coaching app.

Ensures users can only access their own children and related data.
"""

from typing import TYPE_CHECKING

from rest_framework import permissions
from rest_framework.request import Request

from .models import Child, DailyCheckin, Screener, TargetBehavior

if TYPE_CHECKING:
    from rest_framework.views import APIView


class IsChildOwner(permissions.BasePermission):
    """
    Permission to only allow owners of a child to access it.

    For list/create actions, always allow (filtering happens in queryset).
    For detail actions, check that the child belongs to the user.
    """

    def has_object_permission(
        self, request: Request, view: "APIView", obj: Child
    ) -> bool:
        """Check if user owns the child."""
        return obj.parent == request.user


class IsChildRelatedOwner(permissions.BasePermission):
    """
    Permission for objects related to a child (Screener, TargetBehavior, DailyCheckin).

    Ensures the user owns the child associated with the object.
    """

    def has_object_permission(
        self,
        request: Request,
        view: "APIView",
        obj: Screener | TargetBehavior | DailyCheckin,
    ) -> bool:
        """Check if user owns the child related to this object."""
        return obj.child.parent == request.user
