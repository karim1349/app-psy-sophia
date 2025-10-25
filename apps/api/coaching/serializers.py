"""
Serializers for coaching app models.

Handles validation and serialization for Child, Screener, TargetBehavior, and DailyCheckin.
"""

from datetime import datetime, timedelta
from typing import Any, Dict

from django.utils import timezone
from rest_framework import serializers

from .models import (
    Child,
    DailyCheckin,
    Module,
    ModuleProgress,
    Screener,
    SpecialTimeSession,
    TargetBehavior,
)


class ChildSerializer(serializers.ModelSerializer):
    """
    Serializer for Child model.

    Automatically sets parent to the authenticated user.
    """

    class Meta:
        model = Child
        fields = [
            "id",
            "first_name",
            "schooling_stage",
            "diagnosed_adhd",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data: Dict[str, Any]) -> Child:
        """Create child with parent set to the current user and initialize module progress."""
        validated_data["parent"] = self.context["request"].user
        child = super().create(validated_data)

        # Initialize module progress for the new child
        from .unlock_engine import initialize_module_progress

        initialize_module_progress(child)

        return child


class ScreenerSerializer(serializers.ModelSerializer):
    """
    Serializer for Screener model.

    Computes total_score and zone based on answers.
    Returns recommendations and consult list based on zone.
    """

    recommendations = serializers.SerializerMethodField()
    consult = serializers.SerializerMethodField()

    class Meta:
        model = Screener
        fields = [
            "id",
            "child",
            "instrument",
            "answers",
            "total_score",
            "zone",
            "recommendations",
            "consult",
            "created_at",
        ]
        read_only_fields = ["id", "total_score", "zone", "created_at"]

    def validate_answers(self, value: Dict[str, int]) -> Dict[str, int]:
        """Validate that answers is a dict with numeric values."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Answers must be a dictionary.")

        for key, val in value.items():
            if not isinstance(val, int) or val < 0 or val > 3:
                raise serializers.ValidationError(
                    f"Answer for {key} must be an integer between 0 and 3."
                )

        return value

    def create(self, validated_data: Dict[str, Any]) -> Screener:
        """
        Create screener and compute total_score and zone.

        Zone thresholds:
        - vert: <= 10
        - orange: 11-20
        - rouge: > 20
        """
        answers = validated_data.get("answers", {})

        # Compute total score
        total_score = sum(answers.values())

        # Determine zone
        if total_score <= 10:
            zone = "vert"
        elif total_score <= 20:
            zone = "orange"
        else:
            zone = "rouge"

        validated_data["total_score"] = total_score
        validated_data["zone"] = zone

        return super().create(validated_data)

    def get_recommendations(self, obj: Screener) -> list[str]:
        """Get recommendations based on zone."""
        if obj.zone == "vert":
            return [
                "Continue monitoring your child's behavior.",
                "The Special Time module is a great starting point.",
            ]
        elif obj.zone == "orange":
            return [
                "Consider consulting a professional for further evaluation.",
                "Focus on behavioral strategies and routines.",
                "Start with the Special Time and Effective Commands modules.",
            ]
        else:  # rouge
            return [
                "We strongly recommend consulting a professional soon.",
                "Your child may benefit from a comprehensive evaluation.",
                "The modules can complement professional support.",
            ]

    def get_consult(self, obj: Screener) -> list[str]:
        """Get list of professionals to consult (shown for orange/rouge)."""
        if obj.zone in ["orange", "rouge"]:
            return [
                "pediatre",
                "neuropsychologue",
                "orthophoniste",
                "psychomotricien",
                "ergotherapeute",
                "orthoptiste",
            ]
        return []


class TargetBehaviorSerializer(serializers.ModelSerializer):
    """
    Serializer for TargetBehavior model.

    Validates that a child has no more than 3 active behaviors.
    """

    class Meta:
        model = TargetBehavior
        fields = [
            "id",
            "child",
            "name",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that child has no more than 3 active target behaviors."""
        child = attrs.get("child")
        active = attrs.get("active", True)

        if active:
            # Check if child already has 3 active behaviors
            existing_count = TargetBehavior.objects.filter(
                child=child, active=True
            ).count()

            # If updating, don't count the current instance
            if self.instance:
                if self.instance.child == child and self.instance.active:
                    existing_count -= 1

            if existing_count >= 3:
                raise serializers.ValidationError(
                    "A child can have a maximum of 3 active target behaviors."
                )

        return attrs


class DailyCheckinSerializer(serializers.ModelSerializer):
    """
    Serializer for DailyCheckin model.

    Handles upsert behavior (unique per child per date).
    """

    class Meta:
        model = DailyCheckin
        fields = [
            "id",
            "child",
            "date",
            "mood",
            "behaviors",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        # Remove unique_together validator since we handle upsert in create()
        validators = []

    def validate_behaviors(self, value: list) -> list:
        """Validate behaviors format."""
        if not isinstance(value, list):
            raise serializers.ValidationError("Behaviors must be a list.")

        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    "Each behavior entry must be a dictionary."
                )
            if "behavior_id" not in item or "done" not in item:
                raise serializers.ValidationError(
                    "Each behavior entry must have 'behavior_id' and 'done' fields."
                )
            if not isinstance(item["done"], bool):
                raise serializers.ValidationError("'done' field must be a boolean.")

        return value

    def create(self, validated_data: Dict[str, Any]) -> DailyCheckin:
        """
        Create or update daily check-in (upsert by child + date).

        If a check-in already exists for the same child and date, update it.
        """
        child = validated_data.pop("child")
        date = validated_data.pop("date")

        # Use update_or_create for proper upsert
        checkin, created = DailyCheckin.objects.update_or_create(
            child=child, date=date, defaults=validated_data
        )

        return checkin


class DashboardSerializer(serializers.Serializer):
    """
    Serializer for dashboard data (7-day view).

    Returns:
        - days: list of dates (YYYY-MM-DD)
        - routine_success: list of completion rates (0-1) per day
        - mood: list of mood values (1-5) per day, null if no check-in
        - special_time_count: list of session counts per day
        - enjoy_rate: list of enjoyment rates (0-1) per day
    """

    child_id = serializers.IntegerField(required=True)
    range_days = serializers.IntegerField(default=7, min_value=1, max_value=30)

    def validate_child_id(self, value: int) -> int:
        """Validate that child exists and belongs to current user."""
        user = self.context["request"].user
        if not Child.objects.filter(id=value, parent=user).exists():
            raise serializers.ValidationError("Child not found or access denied.")
        return value

    def to_representation(self, instance: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate dashboard data.

        Example payload: {child_id: 1, range_days: 7}
        """
        from .models import SpecialTimeSession

        child_id = instance.get("child_id")
        range_days = instance.get("range_days", 7)

        # Get child
        child = Child.objects.get(id=child_id)

        # Get date range (last N days including today)
        today = datetime.now().date()
        start_date = today - timedelta(days=range_days - 1)

        # Get all check-ins in range
        checkins = DailyCheckin.objects.filter(
            child=child, date__gte=start_date, date__lte=today
        ).order_by("date")

        # Get all Special Time sessions in range
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(today, datetime.max.time())
        sessions = SpecialTimeSession.objects.filter(
            child=child,
            datetime__gte=start_datetime,
            datetime__lte=end_datetime,
        )

        # Build data structures
        days = []
        routine_success = []
        mood = []
        special_time_count = []
        enjoy_rate = []

        for i in range(range_days):
            current_date = start_date + timedelta(days=i)
            days.append(current_date.strftime("%Y-%m-%d"))

            # Find check-in for this date
            checkin = next((c for c in checkins if c.date == current_date), None)

            if checkin:
                # Calculate routine success (% of behaviors marked done)
                if checkin.behaviors:
                    done_count = sum(1 for b in checkin.behaviors if b.get("done"))
                    total_count = len(checkin.behaviors)
                    success_rate = done_count / total_count if total_count > 0 else 0
                else:
                    success_rate = 0

                routine_success.append(round(success_rate, 2))
                mood.append(checkin.mood)
            else:
                routine_success.append(None)
                mood.append(None)

            # Count Special Time sessions for this day
            day_sessions = [s for s in sessions if s.datetime.date() == current_date]
            special_time_count.append(len(day_sessions))

            # Calculate enjoyment rate for this day
            if day_sessions:
                enjoyed_count = sum(1 for s in day_sessions if s.child_enjoyed)
                enjoy_rate.append(round(enjoyed_count / len(day_sessions), 2))
            else:
                enjoy_rate.append(None)

        return {
            "days": days,
            "routine_success": routine_success,
            "mood": mood,
            "special_time_count": special_time_count,
            "enjoy_rate": enjoy_rate,
        }

    def create(self, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - this is a read-only serializer."""
        raise NotImplementedError()

    def update(self, instance: Any, validated_data: Dict[str, Any]) -> Any:
        """Not implemented - this is a read-only serializer."""
        raise NotImplementedError()


class ModuleSerializer(serializers.ModelSerializer):
    """
    Serializer for Module model.
    """

    class Meta:
        model = Module
        fields = [
            "id",
            "key",
            "title",
            "order_index",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ModuleProgressSerializer(serializers.ModelSerializer):
    """
    Serializer for ModuleProgress model.

    Includes module details for convenience.
    """

    module_key = serializers.CharField(source="module.key", read_only=True)
    module_title = serializers.CharField(source="module.title", read_only=True)

    class Meta:
        model = ModuleProgress
        fields = [
            "id",
            "child",
            "module",
            "module_key",
            "module_title",
            "state",
            "counters",
            "passed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "module_key",
            "module_title",
            "created_at",
            "updated_at",
        ]


class SpecialTimeSessionSerializer(serializers.ModelSerializer):
    """
    Serializer for SpecialTimeSession model.

    Auto-sets datetime to now if not provided.
    """

    datetime = serializers.DateTimeField(required=False)

    class Meta:
        model = SpecialTimeSession
        fields = [
            "id",
            "child",
            "datetime",
            "duration_min",
            "activity",
            "child_enjoyed",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_duration_min(self, value: int) -> int:
        """Validate duration is between 5 and 60 minutes."""
        if value < 5 or value > 60:
            raise serializers.ValidationError(
                "Duration must be between 5 and 60 minutes."
            )
        return value

    def create(self, validated_data: Dict[str, Any]) -> SpecialTimeSession:
        """
        Create session and set datetime to now if not provided.
        """
        if "datetime" not in validated_data or validated_data["datetime"] is None:
            validated_data["datetime"] = timezone.now()

        return super().create(validated_data)


class ModuleWithProgressSerializer(serializers.Serializer):
    """
    Serializer combining Module data with child's progress.

    Used for GET /modules/ endpoint.
    """

    id = serializers.IntegerField(source="module.id")
    key = serializers.CharField(source="module.key")
    title = serializers.CharField(source="module.title")
    order_index = serializers.IntegerField(source="module.order_index")
    state = serializers.CharField()
    counters = serializers.JSONField()
    passed_at = serializers.DateTimeField()
