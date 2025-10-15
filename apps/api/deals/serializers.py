"""
Serializers for deal management and operations.

Includes validators for deal creation, updates, voting, and commenting
following the established patterns from the users app.
"""

from typing import Any, Dict

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Comment, Deal, DealCategory, Vote
from .proxy.category_proxy import CategoryProxy
from .proxy.comment_proxy import CommentProxy
from .proxy.deal_proxy import DealProxy

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Simple user serializer for nested relationships."""

    class Meta:
        model = User
        fields = ["id", "username"]
        read_only_fields = ["id", "username"]


class DealCategorySerializer(serializers.ModelSerializer):
    """Serializer for deal categories."""

    deal_count = serializers.SerializerMethodField()

    class Meta:
        model = DealCategory
        fields = [
            "id",
            "name",
            "slug",
            "icon",
            "color",
            "is_active",
            "deal_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slug",
            "deal_count",
            "created_at",
            "updated_at",
        ]

    def get_deal_count(self, obj: DealCategory) -> int:
        """Get active deal count for category."""
        return getattr(obj, "deal_count", obj.deals.filter(status="active").count())


class DealCategoryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating deal categories."""

    class Meta:
        model = DealCategory
        fields = ["name", "icon", "color"]

    def create(self, validated_data: Dict[str, Any]) -> DealCategory:
        """Create category using proxy."""
        proxy = CategoryProxy()
        user = self.context["request"].user
        return proxy.create_category(
            name=validated_data["name"],
            icon=validated_data.get("icon", ""),
            color=validated_data.get("color", ""),
            user=user,
        )


class VoteSerializer(serializers.ModelSerializer):
    """Serializer for deal votes."""

    user = UserSerializer(read_only=True)

    class Meta:
        model = Vote
        fields = [
            "id",
            "user",
            "vote_type",
            "reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "created_at",
            "updated_at",
        ]


class VoteCreateSerializer(serializers.Serializer):
    """Serializer for creating/updating votes."""

    vote_type = serializers.ChoiceField(choices=["up", "down"], required=True)
    reason = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """Validate vote data."""
        vote_type = attrs.get("vote_type")
        reason = attrs.get("reason", "")

        if vote_type == "down" and not reason.strip():
            raise serializers.ValidationError(
                {"reason": "Reason is required for downvotes."}
            )

        return attrs

    def create(self, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - voting is handled in views."""
        raise NotImplementedError("Voting is handled in views, not serializer.")

    def update(self, instance: Any, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - voting is handled in views."""
        raise NotImplementedError("Voting is handled in views, not serializer.")


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for deal comments."""

    user = UserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "user",
            "content",
            "parent",
            "is_edited",
            "replies",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "is_edited",
            "replies",
            "created_at",
            "updated_at",
        ]

    def get_replies(self, obj: Comment) -> list:
        """Get comment replies."""
        if hasattr(obj, "replies"):
            return list(CommentSerializer(obj.replies.all(), many=True).data)
        return []


class CommentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating comments."""

    class Meta:
        model = Comment
        fields = ["content", "parent"]

    def validate_content(self, value: str) -> str:
        """Validate comment content."""
        if not value or not value.strip():
            raise serializers.ValidationError("Comment content cannot be empty.")

        if len(value) > 500:
            raise serializers.ValidationError(
                "Comment content cannot exceed 500 characters."
            )

        return value.strip()

    def create(self, validated_data: Dict[str, Any]) -> Comment:
        """Create comment using proxy."""
        proxy = CommentProxy()
        deal = self.context["deal"]
        user = self.context["request"].user

        return proxy.create_comment(
            deal=deal,
            user=user,
            content=validated_data["content"],
            parent=validated_data.get("parent"),
        )


class CommentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating comments."""

    class Meta:
        model = Comment
        fields = ["content"]

    def validate_content(self, value: str) -> str:
        """Validate comment content."""
        if not value or not value.strip():
            raise serializers.ValidationError("Comment content cannot be empty.")

        if len(value) > 500:
            raise serializers.ValidationError(
                "Comment content cannot exceed 500 characters."
            )

        return value.strip()

    def update(self, instance: Comment, validated_data: Dict[str, Any]) -> Comment:
        """Update comment using proxy."""
        proxy = CommentProxy()
        user = self.context["request"].user

        return proxy.update_comment(
            comment=instance,
            user=user,
            content=validated_data["content"],
        )


class DealSerializer(serializers.ModelSerializer):
    """
    Main serializer for deal display with computed fields.

    Includes all necessary fields for deal listing and detail views
    with optimized queries and computed properties.
    """

    author = UserSerializer(read_only=True)
    category = DealCategorySerializer(read_only=True)

    # Computed fields
    discount_percentage = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    vote_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    user_vote = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = [
            "id",
            "title",
            "description",
            "current_price",
            "original_price",
            "currency",
            "discount_percentage",
            "merchant",
            "channel",
            "city",
            "url",
            "image",
            "proof_url",
            "status",
            "is_verified",
            "is_expired",
            "expires_at",
            "author",
            "category",
            "vote_count",
            "comment_count",
            "user_vote",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "discount_percentage",
            "is_expired",
            "status",
            "is_verified",
            "author",
            "vote_count",
            "comment_count",
            "user_vote",
            "created_at",
            "updated_at",
        ]

    def get_vote_count(self, obj: Deal) -> int:
        """Get net vote count for deal."""
        # Use prefetched data if available
        if hasattr(obj, "vote_count_cached"):
            return int(obj.vote_count_cached)

        proxy = DealProxy()
        return proxy.get_deal_vote_count(obj)

    def get_comment_count(self, obj: Deal) -> int:
        """Get comment count for deal."""
        # Use prefetched data if available
        if hasattr(obj, "comment_count_cached"):
            return int(obj.comment_count_cached)

        return obj.comments.count()

    def get_user_vote(self, obj: Deal) -> str | None:
        """Get current user's vote on deal."""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            proxy = DealProxy()
            return proxy.get_user_vote(obj, request.user)
        return None


class DealCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for deal creation with strict validation.

    Validates all required fields and business rules for deal creation.
    """

    class Meta:
        model = Deal
        fields = [
            "title",
            "description",
            "current_price",
            "original_price",
            "currency",
            "merchant",
            "category",
            "channel",
            "city",
            "url",
            "image",
            "proof_url",
            "expires_at",
        ]

    def validate_title(self, value: str) -> str:
        """Validate deal title."""
        if len(value.strip()) < 5:
            raise serializers.ValidationError("validation.titleMinLength")
        return value.strip()

    def validate_description(self, value: str) -> str:
        """Validate deal description."""
        if len(value.strip()) < 10:
            raise serializers.ValidationError("validation.descriptionMinLength")
        return value.strip()

    def validate_current_price(self, value: float) -> float:
        """Validate current price."""
        if value <= 0:
            raise serializers.ValidationError("validation.minValue")
        return value

    def validate_original_price(self, value: float | None) -> float | None:
        """Validate original price."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("validation.minValue")
        return value

    def validate_merchant(self, value: str) -> str:
        """Validate merchant name."""
        if len(value.strip()) < 2:
            raise serializers.ValidationError("validation.merchantMinLength")
        return value.strip()

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """Cross-field validation."""
        channel = attrs.get("channel")
        city = attrs.get("city", "")
        url = attrs.get("url", "")
        image = attrs.get("image")
        proof_url = attrs.get("proof_url", "")
        current_price = attrs.get("current_price")
        original_price = attrs.get("original_price")

        # Channel-specific validation
        if channel == "online" and not url:
            raise serializers.ValidationError({"url": "validation.required"})

        if channel == "in_store" and not city:
            raise serializers.ValidationError({"city": "validation.required"})

        # Require at least one proof
        if not image and not proof_url:
            raise serializers.ValidationError("deals.validation.proofRequired")

        # Price validation
        if original_price and current_price and original_price <= current_price:
            raise serializers.ValidationError(
                {"original_price": "deals.validation.invalidDiscount"}
            )

        return attrs

    def create(self, validated_data: Dict[str, Any]) -> Deal:
        """Create deal using proxy."""
        proxy = DealProxy()
        user = self.context["request"].user

        return proxy.create_deal(
            title=validated_data["title"],
            description=validated_data["description"],
            current_price=validated_data["current_price"],
            merchant=validated_data["merchant"],
            category=validated_data["category"],
            author=user,
            channel=validated_data["channel"],
            city=validated_data.get("city", ""),
            url=validated_data.get("url", ""),
            original_price=validated_data.get("original_price"),
            image=validated_data.get("image"),
            proof_url=validated_data.get("proof_url", ""),
            expires_at=validated_data.get("expires_at"),
        )


class DealUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for deal updates.

    Allows updating specific fields with validation.
    """

    class Meta:
        model = Deal
        fields = [
            "title",
            "description",
            "current_price",
            "original_price",
            "currency",
            "merchant",
            "channel",
            "city",
            "url",
            "proof_url",
            "expires_at",
        ]

    def validate_title(self, value: str) -> str:
        """Validate deal title."""
        if len(value.strip()) < 5:
            raise serializers.ValidationError(
                "Title must be at least 5 characters long."
            )
        return value.strip()

    def validate_description(self, value: str) -> str:
        """Validate deal description."""
        if len(value.strip()) < 10:
            raise serializers.ValidationError("validation.descriptionMinLength")
        return value.strip()

    def validate_current_price(self, value: float) -> float:
        """Validate current price."""
        if value <= 0:
            raise serializers.ValidationError("validation.minValue")
        return value

    def validate_original_price(self, value: float | None) -> float | None:
        """Validate original price."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("validation.minValue")
        return value

    def validate_merchant(self, value: str) -> str:
        """Validate merchant name."""
        if len(value.strip()) < 2:
            raise serializers.ValidationError("validation.merchantMinLength")
        return value.strip()

    def update(self, instance: Deal, validated_data: Dict[str, Any]) -> Deal:
        """Update deal using proxy."""
        proxy = DealProxy()
        user = self.context["request"].user

        return proxy.update_deal(deal=instance, user=user, **validated_data)
