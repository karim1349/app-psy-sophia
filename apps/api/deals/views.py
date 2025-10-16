"""
ViewSets for deal operations.

Following the established patterns from users app with GenericViewSet
and custom actions for comprehensive deal management.
"""

from typing import TYPE_CHECKING, Any, List, cast

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models import Count, Q, QuerySet
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.mixins import (
    CreateModelMixin,
    DestroyModelMixin,
    ListModelMixin,
    RetrieveModelMixin,
    UpdateModelMixin,
)
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from .models import Comment, Deal
from .permissions import (
    CanCommentOnDeal,
    CanVoteOnDeal,
    IsActiveUser,
    IsOwnerOrStaff,
    IsStaffOrReadOnly,
)
from .proxy.category_proxy import CategoryProxy
from .proxy.comment_proxy import CommentProxy
from .proxy.deal_proxy import DealProxy
from .serializers import (
    CommentCreateSerializer,
    CommentSerializer,
    CommentUpdateSerializer,
    DealCategoryCreateSerializer,
    DealCategorySerializer,
    DealCreateSerializer,
    DealSerializer,
    VoteCreateSerializer,
    VoteSerializer,
)
from .throttles import (
    AnonSearchThrottle,
    CategoryCreateThrottle,
    CommentThrottle,
    CommentUpdateThrottle,
    DealCreateThrottle,
    DealListThrottle,
    DealUpdateThrottle,
    SearchThrottle,
    VoteThrottle,
)

if TYPE_CHECKING:
    from users.models import User
else:
    User = get_user_model()


class DealViewSet(
    CreateModelMixin,
    ListModelMixin,
    RetrieveModelMixin,
    UpdateModelMixin,
    DestroyModelMixin,
    GenericViewSet,
):
    """
    ViewSet for deal operations with custom actions and proxy delegation.

    Provides comprehensive deal management including CRUD operations,
    voting, commenting, and search functionality.
    """

    permission_classes = [IsAuthenticated]  # Default to authenticated only
    queryset = DealProxy().get_active_deals()
    serializer_class = DealSerializer

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.deal_proxy = DealProxy()

    def get_serializer_class(self) -> type:
        """Use different serializers for different actions."""
        if self.action == "create":
            return DealCreateSerializer
        return DealSerializer

    def get_permissions(self) -> List[BasePermission]:
        """Override permissions per action."""
        if self.action in ["list", "retrieve", "hot", "top", "search"]:
            return [AllowAny()]
        elif self.action == "create":
            return [IsActiveUser()]
        elif self.action in ["update", "partial_update", "destroy", "deactivate"]:
            return [IsOwnerOrStaff()]
        elif self.action == "vote":
            return [CanVoteOnDeal()]
        elif self.action == "comments":
            return [AllowAny()]
        elif self.action == "add_comment":
            return [CanCommentOnDeal()]
        return [IsAuthenticated()]

    def get_throttles(self) -> List:
        """Apply different throttles based on action."""
        if self.action == "create":
            return [DealCreateThrottle()]
        elif self.action in ["update", "partial_update"]:
            return [DealUpdateThrottle()]
        elif self.action == "vote":
            return [VoteThrottle()]
        elif self.action == "search":
            if self.request.user.is_authenticated:
                return [SearchThrottle()]
            else:
                return [AnonSearchThrottle()]
        elif self.action == "list" and not self.request.user.is_authenticated:
            return [DealListThrottle()]
        return super().get_throttles()

    def get_queryset(self) -> QuerySet[Deal]:
        """Apply filtering and optimization based on query parameters."""
        queryset = self.queryset.select_related("author", "category").prefetch_related(
            "votes", "comments"
        )

        # Apply filters
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category_id=category)

        merchant = self.request.query_params.get("merchant")
        if merchant:
            queryset = queryset.filter(merchant__icontains=merchant)

        city = self.request.query_params.get("city")
        if city:
            queryset = queryset.filter(city__icontains=city)

        min_price = self.request.query_params.get("min_price")
        if min_price:
            try:
                queryset = queryset.filter(current_price__gte=float(min_price))
            except ValueError:
                pass

        max_price = self.request.query_params.get("max_price")
        if max_price:
            try:
                queryset = queryset.filter(current_price__lte=float(max_price))
            except ValueError:
                pass

        is_verified = self.request.query_params.get("is_verified")
        if is_verified:
            queryset = queryset.filter(is_verified=is_verified.lower() == "true")

        # Apply sorting
        sort = self.request.query_params.get("sort", "new")
        if sort == "hot":
            # Delegate to hot deals action
            return self.deal_proxy.get_hot_deals()
        elif sort == "top":
            # Delegate to top deals action
            return self.deal_proxy.get_top_deals()
        elif sort == "price_low":
            queryset = queryset.order_by("current_price", "-created_at")
        elif sort == "price_high":
            queryset = queryset.order_by("-current_price", "-created_at")
        else:  # "new"
            queryset = queryset.order_by("-created_at")

        return queryset

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """List deals with filtering and pagination."""
        queryset = self.filter_queryset(self.get_queryset())

        # Add computed fields for efficiency
        queryset = queryset.annotate(
            vote_count_cached=Count("votes", filter=Q(votes__vote_type="up"))
            - Count("votes", filter=Q(votes__vote_type="down")),
            comment_count_cached=Count("comments"),
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    # Mixins handle retrieve automatically

    def perform_create(self, serializer: Any) -> None:
        """Set the author when creating a deal."""
        serializer.save(author=self.request.user)

    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Override create to return proper response with author."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)

        # Return response with full deal data including author
        deal = serializer.instance
        response_serializer = DealSerializer(deal, context={"request": request})
        return Response(
            response_serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    # Mixins handle update and partial_update automatically

    def perform_destroy(self, instance: Any) -> None:
        """Deactivate deal instead of deleting it."""
        self.deal_proxy.deactivate_deal(instance, cast(User, self.request.user))

    # Custom actions
    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def hot(self, request: Request) -> Response:
        """Get hot deals based on recent voting activity."""
        hours_str = request.query_params.get("hours", "24")
        try:
            hours = int(hours_str)
        except ValueError:
            hours = 24

        queryset = self.deal_proxy.get_hot_deals(hours=hours)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def top(self, request: Request) -> Response:
        """Get top-rated deals."""
        days_str = request.query_params.get("days", "30")
        try:
            days = int(days_str)
        except ValueError:
            days = 30

        queryset = self.deal_proxy.get_top_deals(days=days)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def search(self, request: Request) -> Response:
        """Search deals with filters."""
        query = request.query_params.get("q", "")
        category_id = request.query_params.get("category")
        merchant = request.query_params.get("merchant")
        city = request.query_params.get("city")

        min_price_str = request.query_params.get("min_price")
        max_price_str = request.query_params.get("max_price")

        try:
            min_price = float(min_price_str) if min_price_str else None
            max_price = float(max_price_str) if max_price_str else None
            category_id_int = int(category_id) if category_id else None
        except ValueError:
            return Response(
                {"detail": "Invalid filter parameters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.deal_proxy.search_deals(
            query=query,
            category_id=category_id_int,
            merchant=merchant,
            city=city,
            min_price=min_price,
            max_price=max_price,
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[CanVoteOnDeal])
    def vote(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        """Vote on a deal."""
        deal = self.get_object()

        serializer = VoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = self.deal_proxy.vote_on_deal(
                deal=deal,
                user=cast(User, request.user),
                vote_type=serializer.validated_data["vote_type"],
                reason=serializer.validated_data.get("reason", ""),
            )
            # Serialize the vote object for JSON response
            vote_serializer = VoteSerializer(result["vote"])
            response_data = {
                "vote": vote_serializer.data,
                "vote_count": result["vote_count"],
                "user_vote": result["user_vote"],
            }
            return Response(response_data, status=status.HTTP_200_OK)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], permission_classes=[IsOwnerOrStaff])
    def deactivate(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        """Deactivate deal (set status=expired)."""
        deal = self.get_object()
        try:
            self.deal_proxy.deactivate_deal(deal, cast(User, request.user))
            return Response(
                {"detail": "Deal deactivated successfully."}, status=status.HTTP_200_OK
            )
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def comments(self, _request: Request, *_args: Any, **_kwargs: Any) -> Response:
        """Get comments for a deal."""
        deal = self.get_object()
        comment_proxy = CommentProxy()

        # Get threaded comments
        comments_tree = comment_proxy.build_comment_tree(deal)
        return Response({"comments": comments_tree})

    @action(detail=True, methods=["post"], permission_classes=[CanCommentOnDeal])
    def add_comment(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        """Add a comment to a deal."""
        deal = self.get_object()

        serializer = CommentCreateSerializer(
            data=request.data, context={"request": request, "deal": deal}
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()

        response_serializer = CommentSerializer(comment)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class DealCategoryViewSet(
    CreateModelMixin,
    ListModelMixin,
    RetrieveModelMixin,
    GenericViewSet,
):
    """
    ViewSet for deal category operations.

    Provides category management with staff-only write access.
    """

    permission_classes = [IsStaffOrReadOnly]
    queryset = CategoryProxy().get_active_categories()
    serializer_class = DealCategorySerializer

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.category_proxy = CategoryProxy()

    def get_serializer_class(self) -> type:
        """Use different serializers for different actions."""
        if self.action == "create":
            return DealCategoryCreateSerializer
        return DealCategorySerializer

    def get_throttles(self) -> List:
        """Apply throttles for category creation."""
        if self.action == "create":
            return [CategoryCreateThrottle()]
        return super().get_throttles()

    def get_queryset(self) -> QuerySet[Any]:
        """Return categories with deal counts for list view."""
        return self.category_proxy.get_categories_with_deal_count()

    # Mixins handle retrieve and create automatically

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def popular(self, request: Request) -> Response:
        """Get popular categories by deal count."""
        limit_str = request.query_params.get("limit", "10")
        try:
            limit = int(limit_str)
        except ValueError:
            limit = 10

        queryset = self.category_proxy.get_popular_categories(limit=limit)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class CommentViewSet(
    CreateModelMixin,
    RetrieveModelMixin,
    UpdateModelMixin,
    DestroyModelMixin,
    GenericViewSet,
):
    """
    ViewSet for comment operations.

    Provides comment management with proper permissions.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = CommentSerializer

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.comment_proxy = CommentProxy()

    def get_object(self) -> Comment:
        """Get comment object with proper security checks."""
        comment_id = self.kwargs.get("pk")
        if not comment_id:
            raise ValidationError("Comment ID is required.")

        comment = self.comment_proxy.get_by_id(comment_id)
        if not comment:
            raise ValidationError("Comment not found.")

        # Check object-level permissions
        self.check_object_permissions(self.request, comment)

        return comment

    def get_permissions(self) -> List[BasePermission]:
        """Override permissions per action."""
        if self.action in ["retrieve"]:
            return [AllowAny()]
        elif self.action in ["update", "partial_update", "destroy"]:
            return [IsOwnerOrStaff()]
        return [IsAuthenticated()]

    def get_serializer_class(self) -> type:
        """Use different serializers for different actions."""
        if self.action in ["update", "partial_update"]:
            return CommentUpdateSerializer
        return CommentSerializer

    def get_throttles(self) -> list:
        """Apply throttles for comment operations."""
        if self.action in ["update", "partial_update"]:
            return [CommentUpdateThrottle()]
        elif self.action == "create":
            return [CommentThrottle()]
        return super().get_throttles()

    # Mixins handle retrieve automatically

    def update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Override update to return proper response with is_edited field."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Return response with full comment data including is_edited
        comment = serializer.instance
        response_serializer = CommentSerializer(comment)
        return Response(response_serializer.data)

    def partial_update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Override partial_update to return proper response with is_edited field."""
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Override destroy to return 200 status with success message."""
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"detail": "Comment deleted successfully."}, status=status.HTTP_200_OK
        )

    def perform_destroy(self, instance: Any) -> None:
        """Use proxy to delete comment with proper validation."""
        self.comment_proxy.delete_comment(instance, cast(User, self.request.user))
