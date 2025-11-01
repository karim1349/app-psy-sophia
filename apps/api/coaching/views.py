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

from datetime import datetime, timedelta
from django.db import models
from django.db.models import Q
from django.utils import timezone

from .models import (
    AngerCrisisLog,
    Child,
    DailyCheckin,
    DailyTaskCompletion,
    EffectiveCommandLog,
    EffectiveCommandObjective,
    Module,
    ModuleProgress,
    Privilege,
    PrivilegeRedemption,
    Routine,
    RoutineCompletion,
    Schedule,
    ScheduleBlock,
    Screener,
    SpecialTimeSession,
    TargetBehavior,
    Task,
    TimeManagementChoice,
    TimeOutLog,
)
from .permissions import IsChildOwner, IsChildRelatedOwner
from .serializers import (
    AngerCrisisLogSerializer,
    ChildSerializer,
    DailyCheckinSerializer,
    DailyTaskCompletionSerializer,
    DashboardSerializer,
    EffectiveCommandLogSerializer,
    EffectiveCommandObjectiveSerializer,
    ModuleProgressSerializer,
    ModuleSerializer,
    ModuleWithProgressSerializer,
    PrivilegeRedemptionSerializer,
    PrivilegeSerializer,
    RoutineCompletionSerializer,
    RoutineSerializer,
    ScheduleBlockSerializer,
    ScheduleSerializer,
    ScreenerSerializer,
    SpecialTimeSessionSerializer,
    TargetBehaviorSerializer,
    TaskSerializer,
    TimeManagementChoiceSerializer,
    TimeOutLogSerializer,
)
from .unlock_engine import check_and_unlock_next_module


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
        existing_count = TargetBehavior.objects.filter(child=child, active=True).count()

        if existing_count + len(behaviors_data) > 3:
            return Response(
                {
                    "behaviors": "A child can have a maximum of 3 active target behaviors."
                },
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
        queryset = DailyCheckin.objects.filter(child__parent=self.request.user)

        # Allow filtering by date
        date_param = self.request.query_params.get("date")
        if date_param:
            queryset = queryset.filter(date=date_param)

        return queryset


class ModuleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for modules and progress tracking.

    GET /modules/?child_id={id} - List all modules with progress for a child.
    GET /modules/{id}/ - Retrieve a specific module.

    Custom actions:
    - POST /modules/special-time/sessions/ - Log a Special Time session
    - GET /modules/special-time/sessions/?child_id={id}&range=21d - List sessions
    - POST /modules/special-time/recompute/ - Recompute progress (QA/testing)
    - PATCH /modules/progress/{id}/goal/ - Update goal_per_week
    """

    serializer_class = ModuleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return all active modules."""
        return Module.objects.filter(is_active=True)

    def list(self, request: Request, *args, **kwargs) -> Response:
        """
        List all modules with progress for a specific child.

        GET /modules/?child_id={id}

        Returns modules with embedded progress data.
        """
        import logging

        logger = logging.getLogger(__name__)

        child_id = request.query_params.get("child_id")
        logger.info(
            f"🔍 Modules API called - child_id={child_id}, "
            f"user={request.user.id}, is_guest={request.user.is_guest}"
        )

        if not child_id:
            return Response(
                {"error": "child_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify child belongs to current user
        try:
            child = Child.objects.get(id=child_id, parent=request.user)
            logger.info(f"✅ Child found: {child.id}, parent={child.parent.id}")
        except Child.DoesNotExist:
            logger.error(f"❌ Child {child_id} not found for user {request.user.id}")
            return Response(
                {"error": "Child not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get all active modules
        modules = Module.objects.filter(is_active=True).order_by("order_index")
        logger.info(f"📦 Found {modules.count()} active modules")

        # Get or create progress for each module
        results = []
        for module in modules:
            logger.info(f"  Processing module: {module.key}")
            progress, created = ModuleProgress.objects.get_or_create(
                child=child,
                module=module,
                defaults={
                    "state": "active",
                    "counters": {
                        "sessions_21d": 0,
                        "liked_last6": 0,
                        "goal_per_week": 5,
                    },
                },
            )

            # Recompute counters for specific modules
            if module.key == "special_time":
                progress = self._recompute_special_time_progress(child, progress)
            elif module.key == "effective_commands":
                progress = self._recompute_effective_commands_progress(child, progress)

            results.append(
                {
                    "module": module,
                    "progress_id": progress.id,
                    "state": progress.state,
                    "counters": progress.counters,
                    "passed_at": progress.passed_at,
                }
            )

        logger.info(f"📊 Built results list with {len(results)} items")
        serializer = ModuleWithProgressSerializer(results, many=True)
        logger.info(f"📤 Serializer data: {serializer.data}")
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post", "get"], url_path="special-time/sessions")
    def special_time_sessions(self, request: Request) -> Response:
        """
        Log or list Special Time sessions.

        POST /modules/special-time/sessions/
        Body: {child, datetime?, duration_min, activity?, child_enjoyed, notes?}

        GET /modules/special-time/sessions/?child_id={id}&range=21d
        """
        if request.method == "POST":
            # Log a session
            child_id = request.data.get("child")
            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Create session
            serializer = SpecialTimeSessionSerializer(
                data=request.data, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            session = serializer.save()

            # Get or create progress
            module = Module.objects.get(key="special_time")
            progress, created = ModuleProgress.objects.get_or_create(
                child=child,
                module=module,
                defaults={
                    "state": "active",
                    "counters": {
                        "sessions_21d": 0,
                        "liked_last6": 0,
                        "goal_per_week": 5,
                    },
                },
            )

            # Recompute progress and check unlock rules
            progress = self._recompute_special_time_progress(child, progress)

            return Response(
                {
                    "session": SpecialTimeSessionSerializer(session).data,
                    "progress": ModuleProgressSerializer(progress).data,
                },
                status=status.HTTP_201_CREATED,
            )

        else:  # GET
            # List sessions
            child_id = request.query_params.get("child_id")
            if not child_id:
                return Response(
                    {"error": "child_id query parameter is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Verify child belongs to current user
            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Get range parameter
            range_param = request.query_params.get("range", "21d")
            sessions = SpecialTimeSession.objects.filter(child=child)

            if range_param != "all":
                # Parse range (e.g., "21d" -> 21 days)
                days = int(range_param.replace("d", ""))
                cutoff_date = timezone.now() - timedelta(days=days)
                sessions = sessions.filter(datetime__gte=cutoff_date)

            sessions = sessions.order_by("-datetime")

            serializer = SpecialTimeSessionSerializer(sessions, many=True)
            return Response({"results": serializer.data}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="special-time/recompute")
    def recompute_special_time(self, request: Request) -> Response:
        """
        Recompute Special Time progress for a child (QA/testing).

        POST /modules/special-time/recompute/
        Body: {child}
        """
        child_id = request.data.get("child")
        try:
            child = Child.objects.get(id=child_id, parent=request.user)
        except Child.DoesNotExist:
            return Response(
                {"error": "Child not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        module = Module.objects.get(key="special_time")
        progress, created = ModuleProgress.objects.get_or_create(
            child=child,
            module=module,
            defaults={
                "state": "active",
                "counters": {"sessions_21d": 0, "liked_last6": 0, "goal_per_week": 5},
            },
        )

        progress = self._recompute_special_time_progress(child, progress)

        return Response(
            ModuleProgressSerializer(progress).data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False, methods=["post", "get"], url_path="effective-commands/objectives"
    )
    def effective_commands_objectives(self, request: Request) -> Response:
        """
        Create or list objectives for Effective Commands module.

        POST /modules/effective-commands/objectives/
        Body: {child, labels: ["Aller se brosser les dents", ...]}

        GET /modules/effective-commands/objectives/?child_id={id}
        """
        if request.method == "POST":
            # Create objectives
            child_id = request.data.get("child")
            labels = request.data.get("labels", [])

            if not child_id:
                return Response(
                    {"error": "child field is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not isinstance(labels, list) or len(labels) == 0:
                return Response(
                    {"error": "labels must be a non-empty list of strings."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Create objectives
            created_objectives = []
            for label in labels:
                objective = EffectiveCommandObjective.objects.create(
                    child=child, label=label, is_active=True
                )
                created_objectives.append(objective)

            serializer = EffectiveCommandObjectiveSerializer(
                created_objectives, many=True
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        else:  # GET
            # List objectives
            child_id = request.query_params.get("child_id")
            if not child_id:
                return Response(
                    {"error": "child_id query parameter is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            objectives = EffectiveCommandObjective.objects.filter(
                child=child, is_active=True
            ).order_by("-created_at")

            serializer = EffectiveCommandObjectiveSerializer(objectives, many=True)
            return Response({"results": serializer.data}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post", "get"], url_path="effective-commands/logs")
    def effective_commands_logs(self, request: Request) -> Response:
        """
        Log or list Effective Commands logs.

        POST /modules/effective-commands/logs/
        Body: {child, objective, date, gave_effective_command,
               child_completed?, repetitions_count?, failure_reason?, notes?}

        GET /modules/effective-commands/logs/?child_id={id}&objective_id={id}
                                             &range=30d
        """
        if request.method == "POST":
            # Log an entry
            child_id = request.data.get("child")
            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Validate objective ownership
            objective_id = request.data.get("objective")
            try:
                objective = EffectiveCommandObjective.objects.get(
                    id=objective_id, child=child
                )
            except EffectiveCommandObjective.DoesNotExist:
                return Response(
                    {"error": "Objective not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Create or update log (upsert by child + objective + date)
            date = request.data.get("date")
            log_data = {
                "gave_effective_command": request.data.get("gave_effective_command"),
                "child_completed": request.data.get("child_completed"),
                "repetitions_count": request.data.get("repetitions_count"),
                "failure_reason": request.data.get("failure_reason"),
                "notes": request.data.get("notes", ""),
            }

            log, created = EffectiveCommandLog.objects.update_or_create(
                child=child, objective=objective, date=date, defaults=log_data
            )

            import logging

            logger = logging.getLogger(__name__)
            logger.info(
                f"{'Created' if created else 'Updated'} log for objective "
                f"{objective.label} on {date}"
            )
            logger.info(
                f"  gave_effective_command={log.gave_effective_command}, "
                f"child_completed={log.child_completed}"
            )

            # Get or create progress
            module = Module.objects.get(key="effective_commands")
            progress, created_progress = ModuleProgress.objects.get_or_create(
                child=child,
                module=module,
                defaults={
                    "state": "unlocked",
                    "counters": {
                        "objectives_with_5plus_days": [],
                        "initial_repetition_average": 5,
                    },
                },
            )

            # Recompute progress and check unlock rules
            progress = self._recompute_effective_commands_progress(child, progress)

            return Response(
                {
                    "log": EffectiveCommandLogSerializer(log).data,
                    "progress": ModuleProgressSerializer(progress).data,
                },
                status=status.HTTP_201_CREATED,
            )

        else:  # GET
            # List logs
            child_id = request.query_params.get("child_id")
            if not child_id:
                return Response(
                    {"error": "child_id query parameter is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            logs = EffectiveCommandLog.objects.filter(child=child)

            # Filter by objective if provided
            objective_id = request.query_params.get("objective_id")
            if objective_id:
                logs = logs.filter(objective_id=objective_id)

            # Filter by date range if provided
            range_param = request.query_params.get("range", "30d")
            if range_param != "all":
                days = int(range_param.replace("d", ""))
                # To get exactly N days including today, go back N-1 days
                cutoff_date = timezone.now().date() - timedelta(days=days - 1)
                logs = logs.filter(date__gte=cutoff_date)

            logs = logs.order_by("-date")

            serializer = EffectiveCommandLogSerializer(logs, many=True)
            return Response({"results": serializer.data}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="effective-commands/recompute")
    def recompute_effective_commands(self, request: Request) -> Response:
        """
        Recompute Effective Commands progress for a child (QA/testing).

        POST /modules/effective-commands/recompute/
        Body: {child}
        """
        child_id = request.data.get("child")
        try:
            child = Child.objects.get(id=child_id, parent=request.user)
        except Child.DoesNotExist:
            return Response(
                {"error": "Child not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        module = Module.objects.get(key="effective_commands")
        progress, created = ModuleProgress.objects.get_or_create(
            child=child,
            module=module,
            defaults={
                "state": "unlocked",
                "counters": {
                    "objectives_with_5plus_days": [],
                    "initial_repetition_average": 5,
                },
            },
        )

        progress = self._recompute_effective_commands_progress(child, progress)

        return Response(
            ModuleProgressSerializer(progress).data,
            status=status.HTTP_200_OK,
        )

    def _recompute_special_time_progress(
        self, child: Child, progress: ModuleProgress
    ) -> ModuleProgress:
        """
        Recompute Special Time progress counters and check unlock rules.

        Rules:
        - sessions_21d: count sessions in last 21 days
        - liked_last6: count child_enjoyed=True among most recent 6 sessions
        - PASS if: sessions_21d >= 6 AND liked_last6 >= 4
        """
        # Get sessions in last 21 days
        cutoff_21d = timezone.now() - timedelta(days=21)
        sessions_21d = SpecialTimeSession.objects.filter(
            child=child, datetime__gte=cutoff_21d
        ).count()

        # Get last 6 sessions (regardless of date)
        last_6_sessions = SpecialTimeSession.objects.filter(child=child).order_by(
            "-datetime"
        )[:6]
        liked_last6 = sum(1 for s in last_6_sessions if s.child_enjoyed)

        # Update counters
        counters = progress.counters or {}
        counters["sessions_21d"] = sessions_21d
        counters["liked_last6"] = liked_last6
        if "goal_per_week" not in counters:
            counters["goal_per_week"] = 5

        progress.counters = counters

        # Check unlock rules
        if sessions_21d >= 6 and liked_last6 >= 4:
            if progress.state != "passed":
                progress.state = "passed"
                progress.passed_at = timezone.now()
                progress.save()

                # Unlock next module
                print(f"🎉 Module '{progress.module.title}' completed for {child}")
                check_and_unlock_next_module(child, progress.module)
        else:
            # Reset to unlocked if was passed but no longer meets criteria
            if progress.state == "passed":
                progress.state = "unlocked"
                progress.passed_at = None

        progress.save()
        return progress

    def _recompute_effective_commands_progress(
        self, child: Child, progress: ModuleProgress
    ) -> ModuleProgress:
        """
        Recompute Effective Commands progress counters and check unlock rules.

        Rules:
        - For each objective, count "satisfying days" where:
          - gave_effective_command = True AND
          - (child_completed = 'first_try' OR
             (child_completed = 'not_directly' AND repetitions_count < initial_repetition_average))
        - Track objectives with >= 5 satisfying days
        - PASS if: >= 3 objectives have >= 5 satisfying days each
        """
        from django.db.models import Count

        # Get all active objectives for this child
        objectives = EffectiveCommandObjective.objects.filter(
            child=child, is_active=True
        )

        # Get initial repetition average from counters (default to 5 if not set)
        counters = progress.counters or {}
        initial_avg = counters.get("initial_repetition_average", 5)

        # Track which objectives have >= 5 satisfying days
        objectives_with_5plus_days = []

        for objective in objectives:
            # Count satisfying days for this objective
            satisfying_logs = EffectiveCommandLog.objects.filter(
                objective=objective,
                gave_effective_command=True,
            ).filter(
                Q(child_completed="first_try")
                | (
                    Q(child_completed="not_directly")
                    & Q(repetitions_count__lt=initial_avg)
                )
            )

            satisfying_count = satisfying_logs.count()

            import logging

            logger = logging.getLogger(__name__)
            logger.info(
                f"Objective '{objective.label}': {satisfying_count} "
                f"satisfying days (threshold: {initial_avg})"
            )

            if satisfying_count >= 5:
                objectives_with_5plus_days.append(objective.id)

        # Update counters
        counters["objectives_with_5plus_days"] = objectives_with_5plus_days
        counters["initial_repetition_average"] = initial_avg
        progress.counters = counters

        # Check unlock rules: >= 3 objectives with >= 5 satisfying days
        if len(objectives_with_5plus_days) >= 3:
            if progress.state != "passed":
                progress.state = "passed"
                progress.passed_at = timezone.now()
                progress.save()

                # Unlock next module
                print(f"🎉 Module '{progress.module.title}' completed for {child}")
                check_and_unlock_next_module(child, progress.module)
        else:
            # Reset to unlocked if was passed but no longer meets criteria
            if progress.state == "passed":
                progress.state = "unlocked"
                progress.passed_at = None

        progress.save()
        return progress

    @action(
        detail=False, methods=["post"], url_path="anger-management/initial-frequency"
    )
    def anger_management_initial_frequency(self, request: Request) -> Response:
        """
        Set initial anger crisis frequency for a child.

        POST /modules/anger-management/initial-frequency/
        Body: {child_id, frequency}

        Frequency options: daily, weekly_multiple, weekly_once, monthly_multiple, monthly_once
        """
        child_id = request.data.get("child_id")
        frequency = request.data.get("frequency")

        # Validate frequency
        valid_frequencies = [
            "daily",
            "weekly_multiple",
            "weekly_once",
            "monthly_multiple",
            "monthly_once",
        ]
        if frequency not in valid_frequencies:
            return Response(
                {"error": f"Invalid frequency. Must be one of: {valid_frequencies}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get child
        try:
            child = Child.objects.get(id=child_id, parent=request.user)
        except Child.DoesNotExist:
            return Response(
                {"error": "Child not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get anger management module
        module = Module.objects.get(key="anger_management")

        # Get or create progress
        progress, created = ModuleProgress.objects.get_or_create(
            child=child,
            module=module,
            defaults={
                "state": "unlocked",
                "counters": {
                    "initial_frequency": frequency,
                    "successful_crises_count": 0,
                },
            },
        )

        # Update frequency if already exists
        if not created:
            counters = progress.counters or {}
            counters["initial_frequency"] = frequency
            progress.counters = counters
            progress.save()

        return Response(
            ModuleProgressSerializer(progress).data, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["post", "get"], url_path="anger-management/logs")
    def anger_management_logs(self, request: Request) -> Response:
        """
        Log or list anger crisis entries.

        POST /modules/anger-management/logs/
        Body: {child, date, time?, intervention_stage, techniques_used, was_successful, notes?}

        GET /modules/anger-management/logs/?child_id={id}&range=30d
        """
        if request.method == "POST":
            # Create log
            child_id = request.data.get("child")
            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Validate and create log
            serializer = AngerCrisisLogSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            log = serializer.save()

            import logging

            logger = logging.getLogger(__name__)
            logger.info(
                f"Created anger crisis log for {child.first_name or 'Child'} on {log.date}"
            )
            logger.info(
                f"  Intervention: {log.intervention_stage}, Success: {log.was_successful}"
            )

            # Get or create progress
            module = Module.objects.get(key="anger_management")
            progress, _ = ModuleProgress.objects.get_or_create(
                child=child,
                module=module,
                defaults={
                    "state": "unlocked",
                    "counters": {"successful_crises_count": 0},
                },
            )

            # Recompute progress
            progress = self._recompute_anger_management_progress(child, progress)

            return Response(
                {
                    "log": AngerCrisisLogSerializer(log).data,
                    "progress": ModuleProgressSerializer(progress).data,
                },
                status=status.HTTP_201_CREATED,
            )

        else:  # GET
            child_id = request.query_params.get("child_id")
            if not child_id:
                return Response(
                    {"error": "child_id query parameter is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Parse range parameter
            range_param = request.query_params.get("range", "30d")
            try:
                days = int(range_param.replace("d", ""))
            except ValueError:
                return Response(
                    {"error": "Invalid range parameter. Use format like '30d'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            start_date = timezone.now().date() - timedelta(days=days)

            # Get logs
            logs = AngerCrisisLog.objects.filter(child=child, date__gte=start_date)

            return Response(
                {"results": AngerCrisisLogSerializer(logs, many=True).data},
                status=status.HTTP_200_OK,
            )

    def _recompute_anger_management_progress(
        self, child: Child, progress: ModuleProgress
    ) -> ModuleProgress:
        """
        Recompute Anger Management progress counters and check unlock rules.

        Rules:
        - Count logs where was_successful = True
        - PASS if: >= 1 successful crisis management
        """
        # Count successful crisis management attempts
        successful_count = AngerCrisisLog.objects.filter(
            child=child, was_successful=True
        ).count()

        import logging

        logger = logging.getLogger(__name__)
        logger.info(f"Successful crises count for {child}: {successful_count}")

        # Update counters
        counters = progress.counters or {}
        counters["successful_crises_count"] = successful_count
        progress.counters = counters

        # Check unlock rules: >= 1 successful crisis
        if successful_count >= 1:
            if progress.state != "passed":
                progress.state = "passed"
                progress.passed_at = timezone.now()
                progress.save()

                print(f"🎉 Module '{progress.module.title}' completed for {child}")
                check_and_unlock_next_module(child, progress.module)
        else:
            # Reset to unlocked if was passed but no longer meets criteria
            if progress.state == "passed":
                progress.state = "unlocked"
                progress.passed_at = None

        progress.save()
        return progress

    @action(detail=False, methods=["post"], url_path="timeout/goal")
    def timeout_goal(self, request: Request) -> Response:
        """
        Set target duration for time-out.

        POST /modules/timeout/goal/
        Body: {child_id, target_duration}  # 2, 3, 4, or 5
        """
        child_id = request.data.get("child_id")
        target_duration = request.data.get("target_duration")

        # Convert to int if needed and validate duration
        try:
            target_duration = (
                int(target_duration) if target_duration is not None else None
            )
        except (ValueError, TypeError):
            target_duration = None

        if target_duration not in [2, 3, 4, 5]:
            return Response(
                {"error": "target_duration must be 2, 3, 4, or 5 minutes"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get child
        try:
            child = Child.objects.get(id=child_id, parent=request.user)
        except Child.DoesNotExist:
            return Response(
                {"error": "Child not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get timeout module
        module = Module.objects.get(key="timeout")

        # Get or create progress
        progress, created = ModuleProgress.objects.get_or_create(
            child=child,
            module=module,
            defaults={
                "state": "unlocked",
                "counters": {
                    "target_duration": target_duration,
                    "successful_timeouts_count": 0,
                },
            },
        )

        # Update duration if already exists
        if not created:
            counters = progress.counters or {}
            counters["target_duration"] = target_duration
            progress.counters = counters
            progress.save()

        return Response(
            ModuleProgressSerializer(progress).data, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["post", "get"], url_path="timeout/logs")
    def timeout_logs(self, request: Request) -> Response:
        """
        Log or list time-out entries.

        POST /modules/timeout/logs/
        Body: {child, date, needed_timeout, was_successful?, failure_reason?, notes?}

        GET /modules/timeout/logs/?child_id={id}&range=30d
        """
        if request.method == "POST":
            # Create log
            child_id = request.data.get("child")
            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Create or update log (upsert by child + date)
            date = request.data.get("date")
            log_data = {
                "needed_timeout": request.data.get("needed_timeout"),
                "was_successful": request.data.get("was_successful"),
                "failure_reason": request.data.get("failure_reason"),
                "notes": request.data.get("notes", ""),
            }

            # Check if log already exists for validation
            try:
                existing_log = TimeOutLog.objects.get(child=child, date=date)
                # Validate with serializer for update
                serializer = TimeOutLogSerializer(
                    existing_log, data={**log_data, "child": child_id, "date": date}
                )
            except TimeOutLog.DoesNotExist:
                # Validate with serializer for creation
                serializer = TimeOutLogSerializer(
                    data={**log_data, "child": child_id, "date": date}
                )

            serializer.is_valid(raise_exception=True)

            log, created = TimeOutLog.objects.update_or_create(
                child=child, date=date, defaults=log_data
            )

            import logging

            logger = logging.getLogger(__name__)
            logger.info(
                f"{'Created' if created else 'Updated'} timeout log for "
                f"{child.first_name or 'Child'} on {date}"
            )
            logger.info(
                f"  Needed: {log.needed_timeout}, Success: {log.was_successful}"
            )

            # Get or create progress
            module = Module.objects.get(key="timeout")
            progress, _ = ModuleProgress.objects.get_or_create(
                child=child,
                module=module,
                defaults={
                    "state": "unlocked",
                    "counters": {"successful_timeouts_count": 0},
                },
            )

            # Recompute progress
            progress = self._recompute_timeout_progress(child, progress)

            return Response(
                {
                    "log": TimeOutLogSerializer(log).data,
                    "progress": ModuleProgressSerializer(progress).data,
                },
                status=status.HTTP_201_CREATED,
            )

        else:  # GET
            child_id = request.query_params.get("child_id")
            if not child_id:
                return Response(
                    {"error": "child_id query parameter is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Parse range parameter
            range_param = request.query_params.get("range", "30d")
            try:
                days = int(range_param.replace("d", ""))
            except ValueError:
                return Response(
                    {"error": "Invalid range parameter. Use format like '30d'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            start_date = timezone.now().date() - timedelta(days=days)

            # Get logs
            logs = TimeOutLog.objects.filter(child=child, date__gte=start_date)

            return Response(
                {"results": TimeOutLogSerializer(logs, many=True).data},
                status=status.HTTP_200_OK,
            )

    def _recompute_timeout_progress(
        self, child: Child, progress: ModuleProgress
    ) -> ModuleProgress:
        """
        Recompute Time Out progress counters and check unlock rules.

        Rules:
        - Count logs where needed_timeout = True AND was_successful = True
        - PASS if: >= 1 successful time-out
        """
        # Count successful time-out attempts
        successful_count = TimeOutLog.objects.filter(
            child=child, needed_timeout=True, was_successful=True
        ).count()

        import logging

        logger = logging.getLogger(__name__)
        logger.info(f"Successful time-outs count for {child}: {successful_count}")

        # Update counters
        counters = progress.counters or {}
        counters["successful_timeouts_count"] = successful_count
        progress.counters = counters

        # Check unlock rules: >= 1 successful time-out
        if successful_count >= 1:
            if progress.state != "passed":
                progress.state = "passed"
                progress.passed_at = timezone.now()
                progress.save()

                print(f"🎉 Module '{progress.module.title}' completed for {child}")
                check_and_unlock_next_module(child, progress.module)
        else:
            # Reset to unlocked if was passed but no longer meets criteria
            if progress.state == "passed":
                progress.state = "unlocked"
                progress.passed_at = None

        progress.save()
        return progress

    # =============================================================================
    # Rewards Module Actions
    # =============================================================================

    @action(detail=False, methods=["post"], url_path="rewards/setup")
    def rewards_setup(self, request: Request) -> Response:
        """
        Initial setup: create tasks and privileges for a child.

        POST /modules/rewards/setup/
        Body: {
            child_id: int,
            tasks: [
                {title: str, points_reward: int},
                ...
            ],
            privileges: [
                {title: str, points_cost: int},
                ...
            ]
        }
        """
        child_id = request.data.get("child_id")
        tasks_data = request.data.get("tasks", [])
        privileges_data = request.data.get("privileges", [])

        # Validate child_id is provided
        if not child_id:
            return Response(
                {"error": "child_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate child access
        try:
            child = Child.objects.get(id=child_id, parent=request.user)
        except Child.DoesNotExist:
            return Response(
                {"error": "Child not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Create tasks
        created_tasks = []
        for task_data in tasks_data:
            task_serializer = TaskSerializer(data={**task_data, "child": child_id})
            task_serializer.is_valid(raise_exception=True)
            task = task_serializer.save()
            created_tasks.append(task)

        # Create privileges
        created_privileges = []
        for privilege_data in privileges_data:
            privilege_serializer = PrivilegeSerializer(
                data={**privilege_data, "child": child_id}
            )
            privilege_serializer.is_valid(raise_exception=True)
            privilege = privilege_serializer.save()
            created_privileges.append(privilege)

        # Update module progress to mark setup complete
        rewards_module = Module.objects.get(key="rewards")
        progress, _ = ModuleProgress.objects.get_or_create(
            child=child,
            module=rewards_module,
            defaults={
                "state": "unlocked",
                "counters": {
                    "setup_complete": True,
                    "total_tasks_count": len(created_tasks),
                    "total_privileges_count": len(created_privileges),
                    "consecutive_days_above_50pct": 0,
                },
            },
        )

        if not progress.counters.get("setup_complete"):
            counters = progress.counters or {}
            counters["setup_complete"] = True
            counters["total_tasks_count"] = len(created_tasks)
            counters["total_privileges_count"] = len(created_privileges)
            progress.counters = counters
            progress.save()

        return Response(
            {
                "tasks": TaskSerializer(created_tasks, many=True).data,
                "privileges": PrivilegeSerializer(created_privileges, many=True).data,
                "progress": ModuleProgressSerializer(progress).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="rewards/tasks")
    def list_rewards_tasks(self, request: Request) -> Response:
        """List all active tasks for a child."""
        child_id = request.query_params.get("child_id")
        if not child_id:
            return Response(
                {"error": "child_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            child = Child.objects.get(id=child_id, parent=request.user)
        except Child.DoesNotExist:
            return Response(
                {"error": "Child not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        tasks = Task.objects.filter(child=child, is_active=True)
        return Response(
            {"tasks": TaskSerializer(tasks, many=True).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="rewards/privileges")
    def list_rewards_privileges(self, request: Request) -> Response:
        """List all active privileges for a child."""
        child_id = request.query_params.get("child_id")
        if not child_id:
            return Response(
                {"error": "child_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            child = Child.objects.get(id=child_id, parent=request.user)
        except Child.DoesNotExist:
            return Response(
                {"error": "Child not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        privileges = Privilege.objects.filter(child=child, is_active=True)
        return Response(
            {"privileges": PrivilegeSerializer(privileges, many=True).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post", "get"], url_path="rewards/daily-completion")
    def rewards_daily_completion(self, request: Request) -> Response:
        """Log or list daily task completions."""
        if request.method == "POST":
            child_id = request.data.get("child_id")
            date_str = request.data.get("date")
            completed_task_ids = request.data.get("completed_task_ids", [])
            notes = request.data.get("notes", "")

            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Validate task IDs
            if completed_task_ids:
                valid_task_ids = Task.objects.filter(
                    id__in=completed_task_ids, child=child, is_active=True
                ).values_list("id", flat=True)
                invalid_ids = set(completed_task_ids) - set(valid_task_ids)
                if invalid_ids:
                    return Response(
                        {"error": f"Invalid task IDs: {invalid_ids}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            active_tasks = Task.objects.filter(child=child, is_active=True)
            total_tasks = active_tasks.count()

            if total_tasks == 0:
                return Response(
                    {"error": "No active tasks found for this child."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            completed_count = len(completed_task_ids)
            completion_rate = (
                (completed_count / total_tasks) * 100 if total_tasks > 0 else 0
            )

            completed_tasks = Task.objects.filter(
                id__in=completed_task_ids, child=child, is_active=True
            )
            total_points_earned = sum(task.points_reward for task in completed_tasks)

            completion, created = DailyTaskCompletion.objects.update_or_create(
                child=child,
                date=date_str,
                defaults={
                    "completed_task_ids": completed_task_ids,
                    "total_points_earned": total_points_earned,
                    "completion_rate": completion_rate,
                    "notes": notes,
                },
            )

            rewards_module = Module.objects.get(key="rewards")
            progress, _ = ModuleProgress.objects.get_or_create(
                child=child,
                module=rewards_module,
                defaults={"state": "unlocked", "counters": {}},
            )

            progress = self._recompute_rewards_progress(child, progress)

            return Response(
                {
                    "completion": DailyTaskCompletionSerializer(completion).data,
                    "progress": ModuleProgressSerializer(progress).data,
                },
                status=status.HTTP_201_CREATED,
            )

        else:  # GET
            child_id = request.query_params.get("child_id")
            if not child_id:
                return Response(
                    {"error": "child_id query parameter is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            range_param = request.query_params.get("range", "30d")
            try:
                days = int(range_param.replace("d", ""))
            except ValueError:
                return Response(
                    {"error": "Invalid range parameter. Use format like '30d'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            start_date = timezone.now().date() - timedelta(days=days)
            completions = DailyTaskCompletion.objects.filter(
                child=child, date__gte=start_date
            ).order_by("-date")

            return Response(
                {
                    "completions": DailyTaskCompletionSerializer(
                        completions, many=True
                    ).data
                },
                status=status.HTTP_200_OK,
            )

    @action(detail=False, methods=["post"], url_path="rewards/redeem")
    def redeem_privilege(self, request: Request) -> Response:
        """Redeem a privilege (spend points)."""
        child_id = request.data.get("child_id")
        privilege_id = request.data.get("privilege_id")
        notes = request.data.get("notes", "")

        try:
            child = Child.objects.get(id=child_id, parent=request.user)
        except Child.DoesNotExist:
            return Response(
                {"error": "Child not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            privilege = Privilege.objects.get(
                id=privilege_id, child=child, is_active=True
            )
        except Privilege.DoesNotExist:
            return Response(
                {"error": "Privilege not found or not active."},
                status=status.HTTP_404_NOT_FOUND,
            )

        total_earned = (
            DailyTaskCompletion.objects.filter(child=child).aggregate(
                total=models.Sum("total_points_earned")
            )["total"]
            or 0
        )

        total_spent = (
            PrivilegeRedemption.objects.filter(child=child).aggregate(
                total=models.Sum("points_spent")
            )["total"]
            or 0
        )

        current_balance = total_earned - total_spent

        if current_balance < privilege.points_cost:
            return Response(
                {
                    "error": "Insufficient points.",
                    "balance": current_balance,
                    "required": privilege.points_cost,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        redemption = PrivilegeRedemption.objects.create(
            child=child,
            privilege=privilege,
            privilege_title=privilege.title,
            points_spent=privilege.points_cost,
            notes=notes,
        )

        new_balance = current_balance - privilege.points_cost

        # Update progress counters with new balance
        rewards_module = Module.objects.get(key="rewards")
        progress, _ = ModuleProgress.objects.get_or_create(
            child=child,
            module=rewards_module,
            defaults={"state": "unlocked", "counters": {}},
        )
        counters = progress.counters or {}
        counters["points_balance"] = new_balance
        progress.counters = counters
        progress.save()

        return Response(
            {
                "redemption": PrivilegeRedemptionSerializer(redemption).data,
                "new_balance": new_balance,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="rewards/balance")
    def get_rewards_balance(self, request: Request) -> Response:
        """Get current points balance for a child."""
        child_id = request.query_params.get("child_id")
        if not child_id:
            return Response(
                {"error": "child_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            child = Child.objects.get(id=child_id, parent=request.user)
        except Child.DoesNotExist:
            return Response(
                {"error": "Child not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        total_earned = (
            DailyTaskCompletion.objects.filter(child=child).aggregate(
                total=models.Sum("total_points_earned")
            )["total"]
            or 0
        )

        total_spent = (
            PrivilegeRedemption.objects.filter(child=child).aggregate(
                total=models.Sum("points_spent")
            )["total"]
            or 0
        )

        balance = total_earned - total_spent

        return Response(
            {
                "balance": balance,
                "total_earned": total_earned,
                "total_spent": total_spent,
            },
            status=status.HTTP_200_OK,
        )

    def _recompute_rewards_progress(
        self, child: Child, progress: ModuleProgress
    ) -> ModuleProgress:
        """
        Recompute rewards module progress and check unlock criteria.

        Rules:
        - Module passes when child completes >50% of tasks for >= 5 consecutive days
        """
        # Get all completions ordered by date descending
        completions = (
            DailyTaskCompletion.objects.filter(child=child)
            .order_by("-date")
            .values("date", "completion_rate")
        )

        if not completions:
            progress.counters = progress.counters or {}
            progress.counters["consecutive_days_above_50pct"] = 0
            progress.save()
            return progress

        # Find longest streak of consecutive days with >50% completion
        consecutive_days = 0
        max_streak = 0
        prev_date = None

        for completion in completions:
            current_date = completion["date"]
            completion_rate = completion["completion_rate"]

            # Check if this day has >50% completion
            if completion_rate >= 50:
                # Check if consecutive with previous day
                is_consecutive = (
                    prev_date is None or (prev_date - current_date).days == 1
                )
                if is_consecutive:
                    consecutive_days += 1
                    max_streak = max(max_streak, consecutive_days)
                else:
                    # Streak broken
                    break
            else:
                # Day below 50%, streak ends
                break

            prev_date = current_date

        # Update counters
        counters = progress.counters or {}
        counters["consecutive_days_above_50pct"] = max_streak
        progress.counters = counters

        # Check unlock rules: >= 5 consecutive days with >50% completion
        if max_streak >= 5:
            if progress.state != "passed":
                progress.state = "passed"
                progress.passed_at = timezone.now()
                progress.save()
                print(f"🎉 Module '{progress.module.title}' completed for {child}")
                check_and_unlock_next_module(child, progress.module)
        else:
            # Reset to unlocked if was passed but no longer meets criteria
            if progress.state == "passed":
                progress.state = "unlocked"
                progress.passed_at = None

        progress.save()
        return progress

    # =============================================================================
    # Time Management Module Actions
    # =============================================================================

    @action(detail=False, methods=["post"], url_path="time-management/choice")
    def time_management_choice(self, request: Request) -> Response:
        """
        Record parent's choice for time management approach.

        POST /modules/time-management/choice/
        Body: {child_id, approach}  # 'routines', 'schedule', or 'both'
        """
        child_id = request.data.get("child_id")
        approach = request.data.get("approach")

        # Validate approach
        valid_approaches = ["routines", "schedule", "both"]
        if approach not in valid_approaches:
            return Response(
                {"error": f"approach must be one of {valid_approaches}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get child
        try:
            child = Child.objects.get(id=child_id, parent=request.user)
        except Child.DoesNotExist:
            return Response(
                {"error": "Child not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Create or update choice
        choice, created = TimeManagementChoice.objects.update_or_create(
            child=child, defaults={"approach": approach}
        )

        return Response(
            TimeManagementChoiceSerializer(choice).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post", "get"], url_path="time-management/routines")
    def time_management_routines(self, request: Request) -> Response:
        """
        Create or list routines.

        POST /modules/time-management/routines/
        Body: {child, routine_type, title, steps[], target_time, is_custom}

        GET /modules/time-management/routines/?child_id={id}
        """
        if request.method == "POST":
            child_id = request.data.get("child")
            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            serializer = RoutineSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            routine = serializer.save()

            return Response(
                RoutineSerializer(routine).data,
                status=status.HTTP_201_CREATED,
            )

        else:  # GET
            child_id = request.query_params.get("child_id")
            if not child_id:
                return Response(
                    {"error": "child_id query parameter is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            routines = Routine.objects.filter(child=child, is_active=True).order_by(
                "routine_type"
            )
            return Response(
                {"results": RoutineSerializer(routines, many=True).data},
                status=status.HTTP_200_OK,
            )

    @action(
        detail=False,
        methods=["post", "get"],
        url_path="time-management/routine-completion",
    )
    def time_management_routine_completion(self, request: Request) -> Response:
        """
        Log or list routine completions.

        POST /modules/time-management/routine-completion/
        Body: {child, routine, routine_type, date, was_on_time, completion_time?, notes?}

        GET /modules/time-management/routine-completion/?child_id={id}&range=7d
        """
        if request.method == "POST":
            child_id = request.data.get("child")
            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Validate routine belongs to child if provided
            routine_id = request.data.get("routine")
            if routine_id:
                if not Routine.objects.filter(id=routine_id, child=child).exists():
                    return Response(
                        {"error": "Routine not found or access denied."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

            serializer = RoutineCompletionSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            completion = serializer.save()

            # Recompute progress
            module = Module.objects.get(key="time_management")
            progress, _ = ModuleProgress.objects.get_or_create(
                child=child,
                module=module,
                defaults={
                    "state": "unlocked",
                    "counters": {"on_time_days_count": 0},
                },
            )

            progress = self._recompute_time_management_progress(child, progress)

            return Response(
                {
                    "completion": RoutineCompletionSerializer(completion).data,
                    "progress": ModuleProgressSerializer(progress).data,
                },
                status=status.HTTP_201_CREATED,
            )

        else:  # GET
            child_id = request.query_params.get("child_id")
            if not child_id:
                return Response(
                    {"error": "child_id query parameter is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Parse range parameter
            range_param = request.query_params.get("range", "7d")
            try:
                days = int(range_param.replace("d", ""))
            except ValueError:
                return Response(
                    {"error": "Invalid range parameter. Use format like '7d'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            start_date = timezone.now().date() - timedelta(days=days)

            completions = RoutineCompletion.objects.filter(
                child=child, date__gte=start_date
            ).order_by("-date")

            return Response(
                {"results": RoutineCompletionSerializer(completions, many=True).data},
                status=status.HTTP_200_OK,
            )

    @action(detail=False, methods=["post", "get"], url_path="time-management/schedule")
    def time_management_schedule(self, request: Request) -> Response:
        """
        Create or get schedule.

        POST /modules/time-management/schedule/
        Body: {child, title?}

        GET /modules/time-management/schedule/?child_id={id}
        """
        if request.method == "POST":
            child_id = request.data.get("child")
            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Deactivate existing schedules
            Schedule.objects.filter(child=child).update(is_active=False)

            # Create new schedule
            title = request.data.get("title", "Emploi du temps")
            schedule = Schedule.objects.create(child=child, title=title, is_active=True)

            return Response(
                ScheduleSerializer(schedule).data,
                status=status.HTTP_201_CREATED,
            )

        else:  # GET
            child_id = request.query_params.get("child_id")
            if not child_id:
                return Response(
                    {"error": "child_id query parameter is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                child = Child.objects.get(id=child_id, parent=request.user)
            except Child.DoesNotExist:
                return Response(
                    {"error": "Child not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Get active schedule
            try:
                schedule = Schedule.objects.get(child=child, is_active=True)
                return Response(
                    ScheduleSerializer(schedule).data,
                    status=status.HTTP_200_OK,
                )
            except Schedule.DoesNotExist:
                return Response(
                    {"error": "No active schedule found for this child."},
                    status=status.HTTP_404_NOT_FOUND,
                )

    @action(
        detail=False,
        methods=["post", "get"],
        url_path="time-management/schedule-blocks",
    )
    def time_management_schedule_blocks(self, request: Request) -> Response:
        """
        Add or list schedule blocks.

        POST /modules/time-management/schedule-blocks/
        Body: {schedule, day_of_week, start_time, end_time,
               activity_type, title, description?, subject?, color?}

        GET /modules/time-management/schedule-blocks/?schedule_id={id}
        """
        if request.method == "POST":
            schedule_id = request.data.get("schedule")
            try:
                schedule = Schedule.objects.get(
                    id=schedule_id, child__parent=request.user
                )
            except Schedule.DoesNotExist:
                return Response(
                    {"error": "Schedule not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            serializer = ScheduleBlockSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            block = serializer.save()

            return Response(
                ScheduleBlockSerializer(block).data,
                status=status.HTTP_201_CREATED,
            )

        else:  # GET
            schedule_id = request.query_params.get("schedule_id")
            if not schedule_id:
                return Response(
                    {"error": "schedule_id query parameter is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                schedule = Schedule.objects.get(
                    id=schedule_id, child__parent=request.user
                )
            except Schedule.DoesNotExist:
                return Response(
                    {"error": "Schedule not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            blocks = ScheduleBlock.objects.filter(schedule=schedule).order_by(
                "day_of_week", "start_time"
            )

            return Response(
                {"results": ScheduleBlockSerializer(blocks, many=True).data},
                status=status.HTTP_200_OK,
            )

    @action(detail=False, methods=["get"], url_path="time-management/templates")
    def time_management_templates(self, request: Request) -> Response:
        """
        Get predefined routine templates.

        GET /modules/time-management/templates/
        """
        templates = {
            "morning": [
                {
                    "title": "Routine du matin",
                    "steps": [
                        "Se réveiller",
                        "Aller aux toilettes",
                        "Se laver les mains",
                        "Se brosser les dents",
                        "S'habiller",
                        "Prendre le petit-déjeuner",
                        "Mettre ses chaussures",
                        "Prendre son sac d'école",
                    ],
                    "target_time": "08:00",
                }
            ],
            "evening": [
                {
                    "title": "Routine du soir",
                    "steps": [
                        "Dîner",
                        "Temps calme",
                        "Prendre une douche/un bain",
                        "Mettre son pyjama",
                        "Se brosser les dents",
                        "Histoire du soir",
                        "Aller au lit",
                    ],
                    "target_time": "20:30",
                }
            ],
            "sunday": [
                {
                    "title": "Routine du dimanche soir",
                    "steps": [
                        "Préparer les vêtements pour la semaine",
                        "Vérifier le sac d'école",
                        "Préparer le matériel scolaire",
                        "Vérifier les devoirs",
                        "Mettre le réveil",
                    ],
                    "target_time": "19:00",
                }
            ],
        }

        return Response(templates, status=status.HTTP_200_OK)

    def _recompute_time_management_progress(
        self, child: Child, progress: ModuleProgress
    ) -> ModuleProgress:
        """
        Recompute Time Management progress counters and check unlock rules.

        Rules:
        - Count days where child was on-time with routines in last 5 days
        - PASS if: >= 3 out of 5 days on-time
        """
        # Get last 5 days of completions
        cutoff_date = timezone.now().date() - timedelta(
            days=4
        )  # Last 5 days including today

        # Get all completions in this range
        completions = RoutineCompletion.objects.filter(
            child=child, date__gte=cutoff_date
        ).order_by("-date")

        # Group by date and check if child was on-time for any routine that day
        on_time_dates = set()
        for completion in completions:
            if completion.was_on_time:
                on_time_dates.add(completion.date)

        on_time_days_count = len(on_time_dates)

        import logging

        logger = logging.getLogger(__name__)
        logger.info(
            f"Time management progress for {child}: "
            f"{on_time_days_count} days on-time in last 5 days"
        )

        # Update counters
        counters = progress.counters or {}
        counters["on_time_days_count"] = on_time_days_count
        progress.counters = counters

        # Check unlock rules: >= 3 out of 5 days on-time
        if on_time_days_count >= 3:
            if progress.state != "passed":
                progress.state = "passed"
                progress.passed_at = timezone.now()
                progress.save()

                print(f"🎉 Module '{progress.module.title}' completed for {child}")
                check_and_unlock_next_module(child, progress.module)
        else:
            # Reset to unlocked if was passed but no longer meets criteria
            if progress.state == "passed":
                progress.state = "unlocked"
                progress.passed_at = None

        progress.save()
        return progress


class ModuleProgressViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing module progress.

    GET /modules-progress/ - List progress for all modules for user's children.
    PATCH /modules-progress/{id}/goal/ - Update goal_per_week.
    """

    serializer_class = ModuleProgressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return only module progress for children belonging to the authenticated user."""
        return ModuleProgress.objects.filter(child__parent=self.request.user)

    @action(detail=True, methods=["patch"], url_path="goal")
    def update_goal(self, request: Request, pk: int = None) -> Response:
        """
        Update goal_per_week for a module progress.

        PATCH /modules-progress/{id}/goal/
        Body: {goal_per_week: 5}
        """
        progress = self.get_object()

        goal_per_week = request.data.get("goal_per_week")
        if not isinstance(goal_per_week, int) or goal_per_week < 1 or goal_per_week > 7:
            return Response(
                {"error": "goal_per_week must be an integer between 1 and 7."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        counters = progress.counters or {}
        counters["goal_per_week"] = goal_per_week
        progress.counters = counters
        progress.save()

        return Response(
            ModuleProgressSerializer(progress).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["patch"], url_path="initial-repetitions")
    def update_initial_repetitions(self, request: Request, pk: int = None) -> Response:
        """
        Update initial_repetition_average for Effective Commands module.

        PATCH /modules-progress/{id}/initial-repetitions/
        Body: {initial_repetition_average: 5}
        """
        progress = self.get_object()

        initial_avg = request.data.get("initial_repetition_average")
        if not isinstance(initial_avg, int) or initial_avg < 1:
            return Response(
                {"error": "initial_repetition_average must be a positive integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        counters = progress.counters or {}
        counters["initial_repetition_average"] = initial_avg
        progress.counters = counters
        progress.save()

        return Response(
            ModuleProgressSerializer(progress).data,
            status=status.HTTP_200_OK,
        )
