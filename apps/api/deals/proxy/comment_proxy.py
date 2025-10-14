"""
Business logic layer for Comment model operations.

Contains all business logic for comment management, threading,
and moderation following the proxy pattern.
"""

from typing import TYPE_CHECKING, List, Optional

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import QuerySet

from ..models import Comment, Deal

if TYPE_CHECKING:
    from users.models import User
else:
    User = get_user_model()


class CommentProxy:
    """Business logic layer for Comment model operations."""

    def __init__(self) -> None:
        self.model = Comment

    def get_by_id(self, comment_id: int) -> Optional[Comment]:
        """Get comment by ID."""
        try:
            return self.model.objects.select_related("user", "deal", "parent").get(
                id=comment_id
            )
        except self.model.DoesNotExist:
            return None

    def get_deal_comments(self, deal: Deal) -> QuerySet[Comment]:
        """Get all comments for a deal, ordered by creation time."""
        return (
            self.model.objects.filter(deal=deal)
            .select_related("user", "parent")
            .prefetch_related("replies")
            .order_by("created_at")
        )

    def get_top_level_comments(self, deal: Deal) -> QuerySet[Comment]:
        """Get top-level comments (no parent) for a deal."""
        return (
            self.model.objects.filter(deal=deal, parent=None)
            .select_related("user")
            .prefetch_related("replies__user")
            .order_by("created_at")
        )

    def get_comment_replies(self, comment: Comment) -> QuerySet[Comment]:
        """Get replies to a specific comment."""
        return (
            self.model.objects.filter(parent=comment)
            .select_related("user")
            .order_by("created_at")
        )

    @transaction.atomic
    def create_comment(
        self,
        deal: Deal,
        user: User,
        content: str,
        parent: Optional[Comment] = None,
    ) -> Comment:
        """
        Create a new comment with validation.

        Args:
            deal: Deal to comment on
            user: User creating the comment
            content: Comment content
            parent: Parent comment for replies (optional)

        Returns:
            Comment: Created comment instance

        Raises:
            ValidationError: If validation fails
        """
        # Validate content
        if not content or not content.strip():
            raise ValidationError("Comment content cannot be empty.")

        if len(content) > 500:
            raise ValidationError("Comment content cannot exceed 500 characters.")

        # Validate parent comment
        if parent:
            if parent.deal != deal:
                raise ValidationError("Parent comment must be on the same deal.")

            # Prevent deeply nested comments (max 1 level)
            if parent.parent is not None:
                raise ValidationError(
                    "Cannot reply to a reply. Please reply to the original comment."
                )

        # Check if deal is active
        if deal.status != "active":
            raise ValidationError("Cannot comment on inactive deals.")

        # Create the comment
        comment = self.model.objects.create(
            deal=deal,
            user=user,
            content=content.strip(),
            parent=parent,
        )

        return comment

    @transaction.atomic
    def update_comment(
        self,
        comment: Comment,
        user: User,
        content: str,
    ) -> Comment:
        """
        Update a comment with validation.

        Args:
            comment: Comment to update
            user: User requesting the update
            content: New comment content

        Returns:
            Comment: Updated comment instance

        Raises:
            ValidationError: If validation fails
        """
        # Only author or staff can update
        if comment.user != user and not user.is_staff:
            raise ValidationError("Only the author or staff can update this comment.")

        # Validate content
        if not content or not content.strip():
            raise ValidationError("Comment content cannot be empty.")

        if len(content) > 500:
            raise ValidationError("Comment content cannot exceed 500 characters.")

        # Update the comment
        comment.content = content.strip()
        comment.save()  # The model's save method will set is_edited=True

        return comment

    def delete_comment(self, comment: Comment, user: User) -> None:
        """
        Delete a comment.

        Args:
            comment: Comment to delete
            user: User requesting deletion

        Raises:
            ValidationError: If user doesn't have permission
        """
        # Only author or staff can delete
        if comment.user != user and not user.is_staff:
            raise ValidationError("Only the author or staff can delete this comment.")

        # Delete the comment (cascades to replies)
        comment.delete()

    def get_user_comments(self, user: User) -> QuerySet[Comment]:
        """Get all comments by a user."""
        return (
            self.model.objects.filter(user=user)
            .select_related("deal", "parent")
            .order_by("-created_at")
        )

    def get_comment_count(self, deal: Deal) -> int:
        """Get total comment count for a deal."""
        return self.model.objects.filter(deal=deal).count()

    def build_comment_tree(self, deal: Deal) -> List[dict]:
        """
        Build a nested comment tree for a deal.

        Args:
            deal: Deal to get comments for

        Returns:
            List of comment dictionaries with nested replies
        """
        # Get all comments for the deal
        comments = self.get_deal_comments(deal)

        # Build a mapping of comment ID to comment data
        comment_map = {}
        for comment in comments:
            comment_map[comment.id] = {
                "id": comment.id,
                "user": {
                    "id": comment.user.id,
                    "username": comment.user.username,
                },
                "content": comment.content,
                "created_at": comment.created_at,
                "updated_at": comment.updated_at,
                "is_edited": comment.is_edited,
                "parent_id": comment.parent_id,
                "replies": [],
            }

        # Build the tree structure
        tree = []
        for comment_data in comment_map.values():
            parent_id = comment_data.get("parent_id")
            if parent_id is None:
                # Top-level comment
                tree.append(comment_data)
            else:
                # Reply - add to parent's replies
                try:
                    parent_id_int = int(
                        str(parent_id)
                    )  # Convert to string first, then int
                    parent = comment_map.get(parent_id_int)
                    if parent and isinstance(parent, dict) and "replies" in parent:
                        replies_list = parent["replies"]
                        if isinstance(replies_list, list):
                            replies_list.append(comment_data)
                except (ValueError, TypeError):
                    # If parent_id is not a valid integer, treat as top-level
                    tree.append(comment_data)

        return tree

    def moderate_comment(
        self,
        comment: Comment,
        moderator: User,
        action: str,
    ) -> Comment:
        """
        Moderate a comment (staff only).

        Args:
            comment: Comment to moderate
            moderator: Staff user performing moderation
            action: Moderation action ('delete', 'edit')

        Returns:
            Comment: Moderated comment (if not deleted)

        Raises:
            ValidationError: If user is not staff or action is invalid
        """
        if not moderator.is_staff:
            raise ValidationError("Only staff members can moderate comments.")

        if action == "delete":
            comment.delete()
            return comment
        elif action == "edit":
            # For now, just mark as edited - could implement content filtering
            comment.is_edited = True
            comment.save(update_fields=["is_edited", "updated_at"])
            return comment
        else:
            raise ValidationError("Invalid moderation action.")

    def get_flagged_comments(self) -> QuerySet[Comment]:
        """Get comments that might need moderation (for future flagging)."""
        # This could be extended to include a flagging system
        # For now, return comments that are very long or have certain keywords
        return (
            self.model.objects.filter(
                content__regex=r".{400,}"  # Comments longer than 400 chars
            )
            .select_related("user", "deal")
            .order_by("-created_at")
        )
