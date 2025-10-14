"""
Tests for CommentProxy business logic.

Comprehensive tests for all CommentProxy methods with proper validation
and error handling testing.
"""

import pytest
from django.core.exceptions import ValidationError

from users.factories import UserFactory

from ..factories import CommentFactory, DealFactory
from ..models import Comment
from ..proxy.comment_proxy import CommentProxy


@pytest.mark.django_db
class TestCommentProxy:
    """Test CommentProxy business logic."""

    def __init__(self) -> None:
        """Initialize test class."""
        super().__init__()
        self.proxy = CommentProxy()

    def test_get_by_id_existing(self) -> None:
        """Test getting comment by existing ID."""
        comment = CommentFactory()
        result = self.proxy.get_by_id(comment.id)

        assert result is not None
        assert result.id == comment.id

    def test_get_by_id_non_existing(self) -> None:
        """Test getting comment by non-existing ID."""
        result = self.proxy.get_by_id(99999)
        assert result is None

    def test_get_deal_comments(self) -> None:
        """Test getting all comments for a deal."""
        deal = DealFactory()
        CommentFactory.create_batch(3, deal=deal)
        CommentFactory()  # Different deal

        result = self.proxy.get_deal_comments(deal)
        assert result.count() == 3

    def test_get_top_level_comments(self) -> None:
        """Test getting top-level comments (no parent)."""
        deal = DealFactory()
        parent_comment = CommentFactory(deal=deal)
        CommentFactory.create_batch(2, deal=deal, parent=None)  # Top-level
        CommentFactory(deal=deal, parent=parent_comment)  # Reply

        result = self.proxy.get_top_level_comments(deal)
        assert result.count() == 3  # 2 + 1 parent

    def test_get_comment_replies(self) -> None:
        """Test getting replies to a specific comment."""
        parent_comment = CommentFactory()
        CommentFactory.create_batch(2, deal=parent_comment.deal, parent=parent_comment)
        CommentFactory(deal=parent_comment.deal)  # Different parent

        result = self.proxy.get_comment_replies(parent_comment)
        assert result.count() == 2

    def test_create_comment_valid(self) -> None:
        """Test creating valid comment."""
        deal = DealFactory()
        user = UserFactory()

        comment = self.proxy.create_comment(
            deal=deal, user=user, content="This is a great deal!"
        )

        assert comment.content == "This is a great deal!"
        assert comment.user == user
        assert comment.deal == deal
        assert comment.parent is None

    def test_create_comment_empty_content(self) -> None:
        """Test creating comment with empty content."""
        deal = DealFactory()
        user = UserFactory()

        with pytest.raises(ValidationError, match="Comment content cannot be empty"):
            self.proxy.create_comment(deal=deal, user=user, content="")

    def test_create_comment_whitespace_content(self) -> None:
        """Test creating comment with whitespace-only content."""
        deal = DealFactory()
        user = UserFactory()

        with pytest.raises(ValidationError, match="Comment content cannot be empty"):
            self.proxy.create_comment(deal=deal, user=user, content="   ")

    def test_create_comment_too_long(self) -> None:
        """Test creating comment with too long content."""
        deal = DealFactory()
        user = UserFactory()

        with pytest.raises(ValidationError, match="cannot exceed 500 characters"):
            self.proxy.create_comment(deal=deal, user=user, content="x" * 501)

    def test_create_comment_reply(self) -> None:
        """Test creating comment reply."""
        parent_comment = CommentFactory()
        user = UserFactory()

        reply = self.proxy.create_comment(
            deal=parent_comment.deal,
            user=user,
            content="This is a reply",
            parent=parent_comment,
        )

        assert reply.parent == parent_comment
        assert reply.deal == parent_comment.deal
        assert reply.content == "This is a reply"

    def test_create_comment_reply_different_deal(self) -> None:
        """Test creating reply to comment on different deal."""
        parent_comment = CommentFactory()
        different_deal = DealFactory()
        user = UserFactory()

        with pytest.raises(
            ValidationError, match="Parent comment must be on the same deal"
        ):
            self.proxy.create_comment(
                deal=different_deal,
                user=user,
                content="This is a reply",
                parent=parent_comment,
            )

    def test_create_comment_nested_reply(self) -> None:
        """Test creating nested reply (should fail)."""
        parent_comment = CommentFactory()
        reply = CommentFactory(parent=parent_comment, deal=parent_comment.deal)
        user = UserFactory()

        with pytest.raises(ValidationError, match="Cannot reply to a reply"):
            self.proxy.create_comment(
                deal=parent_comment.deal,
                user=user,
                content="Nested reply",
                parent=reply,
            )

    def test_create_comment_on_inactive_deal(self) -> None:
        """Test creating comment on inactive deal."""
        deal = DealFactory(status="expired")
        user = UserFactory()

        with pytest.raises(ValidationError, match="Cannot comment on inactive deals"):
            self.proxy.create_comment(deal=deal, user=user, content="This is a comment")

    def test_update_comment_by_author(self) -> None:
        """Test updating comment by author."""
        user = UserFactory()
        comment = CommentFactory(user=user, content="Original content")

        result = self.proxy.update_comment(
            comment=comment, user=user, content="Updated content"
        )

        assert result.content == "Updated content"
        assert result.is_edited is True

    def test_update_comment_by_non_author(self) -> None:
        """Test updating comment by non-author."""
        author = UserFactory()
        other_user = UserFactory()
        comment = CommentFactory(user=author)

        with pytest.raises(ValidationError, match="Only the author or staff"):
            self.proxy.update_comment(
                comment=comment, user=other_user, content="Updated content"
            )

    def test_update_comment_by_staff(self) -> None:
        """Test updating comment by staff member."""
        author = UserFactory()
        staff_user = UserFactory(is_staff=True)
        comment = CommentFactory(user=author, content="Original content")

        result = self.proxy.update_comment(
            comment=comment, user=staff_user, content="Updated by staff"
        )

        assert result.content == "Updated by staff"
        assert result.is_edited is True

    def test_update_comment_empty_content(self) -> None:
        """Test updating comment with empty content."""
        user = UserFactory()
        comment = CommentFactory(user=user)

        with pytest.raises(ValidationError, match="Comment content cannot be empty"):
            self.proxy.update_comment(comment=comment, user=user, content="")

    def test_update_comment_too_long(self) -> None:
        """Test updating comment with too long content."""
        user = UserFactory()
        comment = CommentFactory(user=user)

        with pytest.raises(ValidationError, match="cannot exceed 500 characters"):
            self.proxy.update_comment(comment=comment, user=user, content="x" * 501)

    def test_delete_comment_by_author(self) -> None:
        """Test deleting comment by author."""
        user = UserFactory()
        comment = CommentFactory(user=user)
        comment_id = comment.id

        self.proxy.delete_comment(comment, user)

        assert not Comment.objects.filter(id=comment_id).exists()

    def test_delete_comment_by_non_author(self) -> None:
        """Test deleting comment by non-author."""
        author = UserFactory()
        other_user = UserFactory()
        comment = CommentFactory(user=author)

        with pytest.raises(ValidationError, match="Only the author or staff"):
            self.proxy.delete_comment(comment, other_user)

    def test_delete_comment_by_staff(self) -> None:
        """Test deleting comment by staff member."""
        author = UserFactory()
        staff_user = UserFactory(is_staff=True)
        comment = CommentFactory(user=author)
        comment_id = comment.id

        self.proxy.delete_comment(comment, staff_user)

        assert not Comment.objects.filter(id=comment_id).exists()

    def test_delete_comment_with_replies(self) -> None:
        """Test deleting comment with replies (should cascade)."""
        user = UserFactory()
        parent_comment = CommentFactory(user=user)
        reply1 = CommentFactory(parent=parent_comment, deal=parent_comment.deal)
        reply2 = CommentFactory(parent=parent_comment, deal=parent_comment.deal)

        parent_id = parent_comment.id
        reply1_id = reply1.id
        reply2_id = reply2.id

        self.proxy.delete_comment(parent_comment, user)

        # All should be deleted due to cascade
        assert not Comment.objects.filter(id=parent_id).exists()
        assert not Comment.objects.filter(id=reply1_id).exists()
        assert not Comment.objects.filter(id=reply2_id).exists()

    def test_get_user_comments(self) -> None:
        """Test getting all comments by a user."""
        user = UserFactory()
        CommentFactory.create_batch(3, user=user)
        CommentFactory()  # Different user

        result = self.proxy.get_user_comments(user)
        assert result.count() == 3

    def test_get_comment_count(self) -> None:
        """Test getting comment count for a deal."""
        deal = DealFactory()
        CommentFactory.create_batch(5, deal=deal)
        CommentFactory()  # Different deal

        result = self.proxy.get_comment_count(deal)
        assert result == 5

    def test_build_comment_tree(self) -> None:
        """Test building nested comment tree."""
        deal = DealFactory()

        # Create comment structure
        comment1 = CommentFactory(deal=deal, content="Top level 1")
        comment2 = CommentFactory(deal=deal, content="Top level 2")
        CommentFactory(deal=deal, parent=comment1, content="Reply to 1")
        CommentFactory(deal=deal, parent=comment1, content="Another reply to 1")
        CommentFactory(deal=deal, parent=comment2, content="Reply to 2")

        result = self.proxy.build_comment_tree(deal)

        assert len(result) == 2  # Two top-level comments

        # Find comment1 in results
        comment1_data = next(c for c in result if c["id"] == comment1.id)
        assert len(comment1_data["replies"]) == 2
        assert comment1_data["content"] == "Top level 1"

        # Find comment2 in results
        comment2_data = next(c for c in result if c["id"] == comment2.id)
        assert len(comment2_data["replies"]) == 1
        assert comment2_data["content"] == "Top level 2"

    def test_build_comment_tree_empty(self) -> None:
        """Test building comment tree for deal with no comments."""
        deal = DealFactory()

        result = self.proxy.build_comment_tree(deal)

        assert result == []

    def test_moderate_comment_delete(self) -> None:
        """Test moderating comment with delete action."""
        moderator = UserFactory(is_staff=True)
        comment = CommentFactory()
        comment_id = comment.id

        self.proxy.moderate_comment(comment, moderator, "delete")

        assert not Comment.objects.filter(id=comment_id).exists()

    def test_moderate_comment_edit(self) -> None:
        """Test moderating comment with edit action."""
        moderator = UserFactory(is_staff=True)
        comment = CommentFactory(is_edited=False)

        result = self.proxy.moderate_comment(comment, moderator, "edit")

        assert result.is_edited is True

    def test_moderate_comment_non_staff(self) -> None:
        """Test moderating comment by non-staff user."""
        user = UserFactory(is_staff=False)
        comment = CommentFactory()

        with pytest.raises(ValidationError, match="Only staff members can moderate"):
            self.proxy.moderate_comment(comment, user, "delete")

    def test_moderate_comment_invalid_action(self) -> None:
        """Test moderating comment with invalid action."""
        moderator = UserFactory(is_staff=True)
        comment = CommentFactory()

        with pytest.raises(ValidationError, match="Invalid moderation action"):
            self.proxy.moderate_comment(comment, moderator, "invalid")

    def test_get_flagged_comments(self) -> None:
        """Test getting flagged comments."""
        # Create comments of different lengths
        short_comment = CommentFactory(content="Short comment")
        long_comment = CommentFactory(content="x" * 450)  # Long comment

        result = self.proxy.get_flagged_comments()

        # Should include long comment but not short one
        comment_ids = [c.id for c in result]
        assert long_comment.id in comment_ids
        assert short_comment.id not in comment_ids
