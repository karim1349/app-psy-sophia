"""
Views for coaching app.

Provides REST API endpoints for Child, Screener, TargetBehavior, and DailyCheckin.
All endpoints require JWT authentication and enforce object-level permissions.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Child, DailyCheckin, Screener, TargetBehavior
from .permissions import IsChildOwner, IsChildRelatedOwner
from .serializers import (
    ChildSerializer,
    DailyCheckinSerializer,
    DashboardSerializer,
    ScreenerSerializer,
    TargetBehaviorSerializer,
)


class ChildViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing children.

    POST /children/ - Create a child for the authenticated user.
    GET /children/ - List all children for the authenticated user.
    GET /children/{id}/ - Retrieve a specific child.
    PATCH /children/{id}/ - Update a child.
    DELETE /children/{id}/ - Delete a child.

    Custom actions:
    - POST /children/{id}/screener/ - Create a screener for a child
    - POST /children/{id}/targets/ - Create target behaviors for a child
    - POST /children/{id}/checkins/ - Create/update a daily check-in
    - GET /children/{id}/dashboard/ - Get dashboard data (7-day view)
    """

    serializer_class = ChildSerializer
    permission_classes = [IsAuthenticated, IsChildOwner]

    def get_queryset(self):
        """Return only children belonging to the authenticated user."""
        return Child.objects.filter(parent=self.request.user)

    @action(detail=True, methods=["post"], url_path="screener")
    def create_screener(self, request: Request, pk: int = None) -> Response:
        """
        Create a screener for a child.

        POST /children/{id}/screener/
        Body: {answers: {q1: 0, q2: 1, ...}}

        Returns: {score, zone, recommendations, consult}

        Example payload:
        {
            "answers": {
                "q1": 2,
                "q2": 3,
                "q3": 1,
                "q4": 2,
                "q5": 0,
                "q6": 1,
                "q7": 2,
                "q8": 3,
                "q9": 1,
                "q10": 2
            }
        }
        """
        child = self.get_object()

        # Add child to request data
        data = request.data.copy()
        data["child"] = child.id

        serializer = ScreenerSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        screener = serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="targets")
    def create_targets(self, request: Request, pk: int = None) -> Response:
        """
        Create target behaviors for a child (up to 3).

        POST /children/{id}/targets/
        Body: {behaviors: [{name: "brush teeth"}, {name: "bedtime"}, ...]}

        Maximum 3 behaviors allowed.

        Example payload:
        {
            "behaviors": [
                {"name": "Se brosser les dents"},
                {"name": "Aller au lit à l'heure"},
                {"name": "Ranger ses jouets"}
            ]
        }
        """
        child = self.get_object()

        behaviors_data = request.data.get("behaviors", [])

        if not isinstance(behaviors_data, list):
            return Response(
                {"behaviors": "Must be a list of behavior objects."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate count (max 3 total active behaviors)
        existing_count = TargetBehavior.objects.filter(
            child=child, active=True
        ).count()

        if existing_count + len(behaviors_data) > 3:
            return Response(
                {"behaviors": "A child can have a maximum of 3 active target behaviors."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create behaviors
        created_behaviors = []
        for behavior_data in behaviors_data:
            behavior_data["child"] = child.id
            serializer = TargetBehaviorSerializer(
                data=behavior_data, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            behavior = serializer.save()
            created_behaviors.append(behavior)

        # Serialize and return
        result_serializer = TargetBehaviorSerializer(created_behaviors, many=True)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="checkins")
    def create_checkin(self, request: Request, pk: int = None) -> Response:
        """
        Create or update a daily check-in (upsert by date).

        POST /children/{id}/checkins/
        Body: {date, mood, behaviors: [{behavior_id, done}, ...], notes?}

        Example payload:
        {
            "date": "2025-10-18",
            "mood": 4,
            "behaviors": [
                {"behavior_id": 1, "done": true},
                {"behavior_id": 2, "done": false},
                {"behavior_id": 3, "done": true}
            ],
            "notes": "Good day overall!"
        }
        """
        child = self.get_object()

        # Add child to request data
        data = request.data.copy()
        data["child"] = child.id

        serializer = DailyCheckinSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        checkin = serializer.save()

        return Response(
            DailyCheckinSerializer(checkin).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["get"], url_path="dashboard")
    def dashboard(self, request: Request, pk: int = None) -> Response:
        """
        Get dashboard data for a child.

        GET /children/{id}/dashboard?range=7

        Returns:
        {
            "days": ["2025-10-12", "2025-10-13", ...],
            "routine_success": [0.67, 1.0, 0.33, ...],
            "mood": [4, 5, 3, ...]
        }
        """
        child = self.get_object()

        # Get range parameter (default 7 days)
        range_days = int(request.query_params.get("range", 7))

        # Prepare data for serializer
        data = {"child_id": child.id, "range_days": range_days}

        serializer = DashboardSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        # Generate dashboard data
        dashboard_data = serializer.to_representation(serializer.validated_data)

        return Response(dashboard_data, status=status.HTTP_200_OK)


class ScreenerViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for screeners.

    GET /screeners/ - List all screeners for the user's children.
    GET /screeners/{id}/ - Retrieve a specific screener.

    To create a screener, use POST /children/{id}/screener/
    """

    serializer_class = ScreenerSerializer
    permission_classes = [IsAuthenticated, IsChildRelatedOwner]

    def get_queryset(self):
        """Return only screeners for children belonging to the authenticated user."""
        return Screener.objects.filter(child__parent=self.request.user)


class TargetBehaviorViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing target behaviors.

    GET /target-behaviors/ - List all target behaviors for the user's children.
    GET /target-behaviors/{id}/ - Retrieve a specific target behavior.
    PATCH /target-behaviors/{id}/ - Update a target behavior.
    DELETE /target-behaviors/{id}/ - Delete a target behavior.

    To create target behaviors, use POST /children/{id}/targets/
    """

    serializer_class = TargetBehaviorSerializer
    permission_classes = [IsAuthenticated, IsChildRelatedOwner]

    def get_queryset(self):
        """Return only target behaviors for children belonging to the authenticated user."""
        return TargetBehavior.objects.filter(child__parent=self.request.user)


class DailyCheckinViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for daily check-ins.

    GET /daily-checkins/ - List all check-ins for the user's children.
    GET /daily-checkins/{id}/ - Retrieve a specific check-in.

    To create/update a check-in, use POST /children/{id}/checkins/
    """

    serializer_class = DailyCheckinSerializer
    permission_classes = [IsAuthenticated, IsChildRelatedOwner]

    def get_queryset(self):
        """Return only check-ins for children belonging to the authenticated user."""
        return DailyCheckin.objects.filter(child__parent=self.request.user)
