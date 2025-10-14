"""
Custom permission classes for deals app.

Following the established patterns from the users app with
deal-specific permission logic.
"""

from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from .models import Comment, Deal


class IsOwnerOrStaff(BasePermission):
    """
    Allows access only to the owner of the object or staff members.

    For deals: author or staff can access
    For comments: author or staff can access
    """

    def has_object_permission(self, request: Request, view: APIView, obj: Any) -> bool:
        """Check if user has permission to access the object."""
        # Authenticated users only
        if not request.user.is_authenticated:
            return False

        # Staff can access any object
        if request.user.is_staff:
            return True

        # Check object type and ownership
        if isinstance(obj, Deal):
            return bool(obj.author == request.user)
        elif isinstance(obj, Comment):
            return bool(obj.user == request.user)
        else:
            # For other objects, check if they have an 'author' or 'user' field
            if hasattr(obj, "author"):
                return bool(obj.author == request.user)
            elif hasattr(obj, "user"):
                return bool(obj.user == request.user)

        return False


class IsOwner(BasePermission):
    """
    Allows access only to the owner of the object.

    Stricter than IsOwnerOrStaff - even staff cannot access.
    """

    def has_object_permission(self, request: Request, view: APIView, obj: Any) -> bool:
        """Check if user is the owner of the object."""
        # Authenticated users only
        if not request.user.is_authenticated:
            return False

        # Check object type and ownership
        if isinstance(obj, Deal):
            return bool(obj.author == request.user)
        elif isinstance(obj, Comment):
            return bool(obj.user == request.user)
        else:
            # For other objects, check if they have an 'author' or 'user' field
            if hasattr(obj, "author"):
                return bool(obj.author == request.user)
            elif hasattr(obj, "user"):
                return bool(obj.user == request.user)

        return False


class IsStaffOrReadOnly(BasePermission):
    """
    Allows read-only access to any user, but write access only to staff.

    Useful for category management where anyone can view categories
    but only staff can create/update/delete them.
    """

    def has_permission(self, request: Request, view: APIView) -> bool:
        """Check if user has permission for the action."""
        # Read permissions for any request
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return True

        # Write permissions only for staff
        return request.user.is_authenticated and request.user.is_staff


class CanVoteOnDeal(BasePermission):
    """
    Custom permission for voting on deals.

    Users can vote on deals if:
    - They are authenticated
    - The deal is active
    - They are not the author of the deal
    """

    def has_object_permission(self, request: Request, view: APIView, obj: Deal) -> bool:
        """Check if user can vote on the deal."""
        # Must be authenticated
        if not request.user.is_authenticated:
            return False

        # Deal must be active
        if obj.status != "active":
            return False

        # Cannot vote on own deals
        if obj.author == request.user:
            return False

        return True


class CanCommentOnDeal(BasePermission):
    """
    Custom permission for commenting on deals.

    Users can comment on deals if:
    - They are authenticated
    - The deal is active
    """

    def has_object_permission(self, request: Request, view: APIView, obj: Deal) -> bool:
        """Check if user can comment on the deal."""
        # Must be authenticated
        if not request.user.is_authenticated:
            return False

        # Deal must be active
        if obj.status != "active":
            return False

        return True


class IsActiveUser(BasePermission):
    """
    Permission that checks if the user account is active.

    Useful for actions that require verified users.
    """

    def has_permission(self, request: Request, view: APIView) -> bool:
        """Check if user is authenticated and active."""
        return request.user.is_authenticated and request.user.is_active
