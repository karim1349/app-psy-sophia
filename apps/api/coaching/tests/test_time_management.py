"""
Tests for Time Management module API endpoints and unlock rules.
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from coaching.models import (
    Child,
    Module,
    ModuleProgress,
    Routine,
    RoutineCompletion,
    Schedule,
    ScheduleBlock,
    TimeManagementChoice,
)

User = get_user_model()


class TestTimeManagementChoiceAPI(APITestCase):
    """Test Time Management choice API endpoint."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="parent@test.com",
            username="parent",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.child = Child.objects.create(
            parent=self.user,
            first_name="Test",
            schooling_stage="primary",
            diagnosed_adhd=False,
        )

    def test_set_choice_routines(self):
        """Test setting choice to routines only."""
        response = self.client.post(
            "/api/modules/time-management/choice/",
            {"child_id": self.child.id, "approach": "routines"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["approach"], "routines")

        # Verify choice was created
        choice = TimeManagementChoice.objects.get(child=self.child)
        self.assertEqual(choice.approach, "routines")

    def test_set_choice_schedule(self):
        """Test setting choice to schedule only."""
        response = self.client.post(
            "/api/modules/time-management/choice/",
            {"child_id": self.child.id, "approach": "schedule"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["approach"], "schedule")

    def test_set_choice_both(self):
        """Test setting choice to both routines and schedule."""
        response = self.client.post(
            "/api/modules/time-management/choice/",
            {"child_id": self.child.id, "approach": "both"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["approach"], "both")

    def test_set_choice_invalid_approach(self):
        """Test setting choice with invalid approach."""
        response = self.client.post(
            "/api/modules/time-management/choice/",
            {"child_id": self.child.id, "approach": "invalid"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_update_existing_choice(self):
        """Test updating existing choice."""
        # Create initial choice
        TimeManagementChoice.objects.create(child=self.child, approach="routines")

        # Update to different approach
        response = self.client.post(
            "/api/modules/time-management/choice/",
            {"child_id": self.child.id, "approach": "both"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["approach"], "both")

        # Verify only one choice exists
        self.assertEqual(
            TimeManagementChoice.objects.filter(child=self.child).count(), 1
        )


class TestRoutineAPI(APITestCase):
    """Test Routine API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="parent@test.com",
            username="parent",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.child = Child.objects.create(
            parent=self.user,
            first_name="Test",
            schooling_stage="primary",
            diagnosed_adhd=False,
        )

    def test_create_routine_morning(self):
        """Test creating a morning routine."""
        response = self.client.post(
            "/api/modules/time-management/routines/",
            {
                "child": self.child.id,
                "routine_type": "morning",
                "title": "Ma routine du matin",
                "steps": ["Se réveiller", "Se brosser les dents", "S'habiller"],
                "target_time": "08:00",
                "is_custom": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["routine_type"], "morning")
        self.assertEqual(len(response.data["steps"]), 3)

    def test_create_routine_evening(self):
        """Test creating an evening routine."""
        response = self.client.post(
            "/api/modules/time-management/routines/",
            {
                "child": self.child.id,
                "routine_type": "evening",
                "title": "Ma routine du soir",
                "steps": ["Dîner", "Se brosser les dents", "Dormir"],
                "target_time": "20:30",
                "is_custom": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["routine_type"], "evening")

    def test_create_routine_sunday(self):
        """Test creating a Sunday evening routine."""
        response = self.client.post(
            "/api/modules/time-management/routines/",
            {
                "child": self.child.id,
                "routine_type": "sunday",
                "title": "Routine du dimanche soir",
                "steps": ["Préparer les vêtements", "Vérifier le sac"],
                "target_time": "19:00",
                "is_custom": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["routine_type"], "sunday")

    def test_create_routine_invalid_type(self):
        """Test creating routine with invalid type."""
        response = self.client.post(
            "/api/modules/time-management/routines/",
            {
                "child": self.child.id,
                "routine_type": "invalid",
                "title": "Test",
                "steps": ["Step 1"],
                "target_time": "08:00",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_routine_empty_steps(self):
        """Test creating routine with empty steps."""
        response = self.client.post(
            "/api/modules/time-management/routines/",
            {
                "child": self.child.id,
                "routine_type": "morning",
                "title": "Test",
                "steps": [],
                "target_time": "08:00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_routine_too_many_steps(self):
        """Test creating routine with too many steps (>20)."""
        response = self.client.post(
            "/api/modules/time-management/routines/",
            {
                "child": self.child.id,
                "routine_type": "morning",
                "title": "Test",
                "steps": [f"Step {i}" for i in range(21)],
                "target_time": "08:00",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_routines(self):
        """Test listing routines for a child."""
        # Create multiple routines
        Routine.objects.create(
            child=self.child,
            routine_type="morning",
            title="Morning",
            steps=["Step 1"],
            target_time="08:00",
            is_active=True,
        )
        Routine.objects.create(
            child=self.child,
            routine_type="evening",
            title="Evening",
            steps=["Step 1"],
            target_time="20:00",
            is_active=True,
        )
        Routine.objects.create(
            child=self.child,
            routine_type="sunday",
            title="Sunday",
            steps=["Step 1"],
            target_time="19:00",
            is_active=False,  # Inactive
        )

        response = self.client.get(
            f"/api/modules/time-management/routines/?child_id={self.child.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only return active routines
        self.assertEqual(len(response.data["results"]), 2)


class TestRoutineCompletionAPI(APITestCase):
    """Test Routine Completion API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="parent@test.com",
            username="parent",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.child = Child.objects.create(
            parent=self.user,
            first_name="Test",
            schooling_stage="primary",
            diagnosed_adhd=False,
        )

        self.routine = Routine.objects.create(
            child=self.child,
            routine_type="morning",
            title="Morning Routine",
            steps=["Wake up", "Brush teeth"],
            target_time="08:00",
        )

        # Create time management module
        self.time_management_module = Module.objects.create(
            key="time_management",
            title="La gestion du temps",
            order_index=6,
            is_active=True,
            completion_rules={"on_time_days_out_of_five": 3},
        )

    def test_log_completion_on_time(self):
        """Test logging a routine completion that was on time."""
        today = date.today()
        response = self.client.post(
            "/api/modules/time-management/routine-completion/",
            {
                "child": self.child.id,
                "routine": self.routine.id,
                "routine_type": "morning",
                "date": today.isoformat(),
                "was_on_time": True,
                "completion_time": "07:45",
                "notes": "Great job!",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["completion"]["was_on_time"], True)

        # Verify completion was created
        completion = RoutineCompletion.objects.get(child=self.child, date=today)
        self.assertTrue(completion.was_on_time)

    def test_log_completion_late(self):
        """Test logging a routine completion that was late."""
        today = date.today()
        response = self.client.post(
            "/api/modules/time-management/routine-completion/",
            {
                "child": self.child.id,
                "routine": self.routine.id,
                "routine_type": "morning",
                "date": today.isoformat(),
                "was_on_time": False,
                "completion_time": "08:30",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["completion"]["was_on_time"], False)

    def test_list_completions(self):
        """Test listing routine completions."""
        # Create completions for last 5 days
        for i in range(5):
            completion_date = date.today() - timedelta(days=i)
            RoutineCompletion.objects.create(
                child=self.child,
                routine=self.routine,
                routine_type="morning",
                date=completion_date,
                was_on_time=i % 2 == 0,  # Alternate on-time/late
            )

        response = self.client.get(
            f"/api/modules/time-management/routine-completion/?child_id={self.child.id}&range=7d"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 5)


class TestScheduleAPI(APITestCase):
    """Test Schedule API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="parent@test.com",
            username="parent",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.child = Child.objects.create(
            parent=self.user,
            first_name="Test",
            schooling_stage="primary",
            diagnosed_adhd=False,
        )

    def test_create_schedule(self):
        """Test creating a schedule."""
        response = self.client.post(
            "/api/modules/time-management/schedule/",
            {"child": self.child.id, "title": "Mon emploi du temps"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Mon emploi du temps")

        # Verify schedule was created
        schedule = Schedule.objects.get(child=self.child)
        self.assertTrue(schedule.is_active)

    def test_create_schedule_deactivates_existing(self):
        """Test that creating a new schedule deactivates existing ones."""
        # Create first schedule
        first_schedule = Schedule.objects.create(
            child=self.child, title="Old Schedule", is_active=True
        )

        # Create second schedule
        response = self.client.post(
            "/api/modules/time-management/schedule/",
            {"child": self.child.id, "title": "New Schedule"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify first schedule is now inactive
        first_schedule.refresh_from_db()
        self.assertFalse(first_schedule.is_active)

    def test_get_active_schedule(self):
        """Test getting the active schedule."""
        schedule = Schedule.objects.create(
            child=self.child, title="Active Schedule", is_active=True
        )

        response = self.client.get(
            f"/api/modules/time-management/schedule/?child_id={self.child.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], schedule.id)

    def test_get_schedule_not_found(self):
        """Test getting schedule when none exists."""
        response = self.client.get(
            f"/api/modules/time-management/schedule/?child_id={self.child.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestScheduleBlockAPI(APITestCase):
    """Test Schedule Block API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="parent@test.com",
            username="parent",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.child = Child.objects.create(
            parent=self.user,
            first_name="Test",
            schooling_stage="primary",
            diagnosed_adhd=False,
        )

        self.schedule = Schedule.objects.create(
            child=self.child, title="Test Schedule", is_active=True
        )

    def test_create_school_block(self):
        """Test creating a school block."""
        response = self.client.post(
            "/api/modules/time-management/schedule-blocks/",
            {
                "schedule": self.schedule.id,
                "day_of_week": 0,  # Monday
                "start_time": "08:00",
                "end_time": "09:00",
                "activity_type": "school",
                "title": "Mathématiques",
                "subject": "Math",
                "color": "#4F46E5",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["activity_type"], "school")
        self.assertEqual(response.data["subject"], "Math")

    def test_create_leisure_block(self):
        """Test creating a leisure block."""
        response = self.client.post(
            "/api/modules/time-management/schedule-blocks/",
            {
                "schedule": self.schedule.id,
                "day_of_week": 2,  # Wednesday
                "start_time": "14:00",
                "end_time": "15:30",
                "activity_type": "leisure",
                "title": "Football",
                "color": "#10B981",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["activity_type"], "leisure")

    def test_create_block_invalid_time_range(self):
        """Test creating block where end_time is before start_time."""
        response = self.client.post(
            "/api/modules/time-management/schedule-blocks/",
            {
                "schedule": self.schedule.id,
                "day_of_week": 0,
                "start_time": "10:00",
                "end_time": "09:00",  # Before start_time
                "activity_type": "school",
                "title": "Test",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_block_invalid_day(self):
        """Test creating block with invalid day_of_week."""
        response = self.client.post(
            "/api/modules/time-management/schedule-blocks/",
            {
                "schedule": self.schedule.id,
                "day_of_week": 7,  # Invalid (should be 0-6)
                "start_time": "08:00",
                "end_time": "09:00",
                "activity_type": "school",
                "title": "Test",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_block_invalid_color(self):
        """Test creating block with invalid color format."""
        response = self.client.post(
            "/api/modules/time-management/schedule-blocks/",
            {
                "schedule": self.schedule.id,
                "day_of_week": 0,
                "start_time": "08:00",
                "end_time": "09:00",
                "activity_type": "school",
                "title": "Test",
                "color": "blue",  # Invalid format
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_schedule_blocks(self):
        """Test listing schedule blocks."""
        # Create multiple blocks
        ScheduleBlock.objects.create(
            schedule=self.schedule,
            day_of_week=0,
            start_time="08:00",
            end_time="09:00",
            activity_type="school",
            title="Math",
        )
        ScheduleBlock.objects.create(
            schedule=self.schedule,
            day_of_week=0,
            start_time="09:00",
            end_time="10:00",
            activity_type="school",
            title="French",
        )
        ScheduleBlock.objects.create(
            schedule=self.schedule,
            day_of_week=1,
            start_time="08:00",
            end_time="09:00",
            activity_type="school",
            title="Science",
        )

        response = self.client.get(
            f"/api/modules/time-management/schedule-blocks/?schedule_id={self.schedule.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 3)


class TestTimeManagementTemplates(APITestCase):
    """Test Time Management templates endpoint."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="parent@test.com",
            username="parent",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_get_templates(self):
        """Test getting routine templates."""
        response = self.client.get("/api/modules/time-management/templates/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("morning", response.data)
        self.assertIn("evening", response.data)
        self.assertIn("sunday", response.data)

        # Verify morning template structure
        morning_template = response.data["morning"][0]
        self.assertIn("title", morning_template)
        self.assertIn("steps", morning_template)
        self.assertIn("target_time", morning_template)
        self.assertIsInstance(morning_template["steps"], list)
        self.assertGreater(len(morning_template["steps"]), 0)


class TestTimeManagementUnlockRules(APITestCase):
    """Test Time Management module unlock rules."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="parent@test.com",
            username="parent",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.child = Child.objects.create(
            parent=self.user,
            first_name="Test",
            schooling_stage="primary",
            diagnosed_adhd=False,
        )

        self.routine = Routine.objects.create(
            child=self.child,
            routine_type="morning",
            title="Morning",
            steps=["Wake up"],
            target_time="08:00",
        )

        # Create time management module
        self.time_management_module = Module.objects.create(
            key="time_management",
            title="La gestion du temps",
            order_index=6,
            is_active=True,
            completion_rules={"on_time_days_out_of_five": 3},
        )

        self.progress = ModuleProgress.objects.create(
            child=self.child,
            module=self.time_management_module,
            state="unlocked",
            counters={"on_time_days_count": 0},
        )

    def test_unlock_with_3_on_time_days(self):
        """Test module unlocks with 3 on-time days in last 5."""
        # Create 2 on-time completions in last 5 days (yesterday and 2 days ago)
        for i in range(1, 3):
            completion_date = date.today() - timedelta(days=i)
            RoutineCompletion.objects.create(
                child=self.child,
                routine=self.routine,
                routine_type="morning",
                date=completion_date,
                was_on_time=True,
            )

        # Log a new completion for today to get 3 total on-time days
        response = self.client.post(
            "/api/modules/time-management/routine-completion/",
            {
                "child": self.child.id,
                "routine": self.routine.id,
                "routine_type": "morning",
                "date": date.today().isoformat(),
                "was_on_time": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        progress_data = response.data["progress"]
        self.assertEqual(progress_data["state"], "passed")
        self.assertIsNotNone(progress_data["passed_at"])

    def test_no_unlock_with_2_on_time_days(self):
        """Test module does not unlock with only 2 on-time days."""
        # Create 1 on-time completion yesterday
        completion_date = date.today() - timedelta(days=1)
        RoutineCompletion.objects.create(
            child=self.child,
            routine=self.routine,
            routine_type="morning",
            date=completion_date,
            was_on_time=True,
        )

        # Log a late completion today (total: 1 on-time, 1 late = not enough)
        response = self.client.post(
            "/api/modules/time-management/routine-completion/",
            {
                "child": self.child.id,
                "routine": self.routine.id,
                "routine_type": "morning",
                "date": date.today().isoformat(),
                "was_on_time": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        progress_data = response.data["progress"]
        self.assertEqual(progress_data["state"], "unlocked")
        self.assertIsNone(progress_data["passed_at"])

    def test_on_time_counts_once_per_day(self):
        """Test that on-time status counts once per day even with multiple routines."""
        # Create evening routine
        evening_routine = Routine.objects.create(
            child=self.child,
            routine_type="evening",
            title="Evening",
            steps=["Sleep"],
            target_time="20:00",
        )

        today = date.today()

        # Log morning completion (on-time)
        RoutineCompletion.objects.create(
            child=self.child,
            routine=self.routine,
            routine_type="morning",
            date=today,
            was_on_time=True,
        )

        # Log evening completion (on-time) for same day
        response = self.client.post(
            "/api/modules/time-management/routine-completion/",
            {
                "child": self.child.id,
                "routine": evening_routine.id,
                "routine_type": "evening",
                "date": today.isoformat(),
                "was_on_time": True,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        progress_data = response.data["progress"]
        # Should count as 1 day, not 2
        self.assertEqual(progress_data["counters"]["on_time_days_count"], 1)

    def test_rolling_5_day_window(self):
        """Test that unlock check uses rolling 5-day window."""
        # Create 3 on-time days, but days 6-8 ago (outside window)
        for i in range(6, 9):
            completion_date = date.today() - timedelta(days=i)
            RoutineCompletion.objects.create(
                child=self.child,
                routine=self.routine,
                routine_type="morning",
                date=completion_date,
                was_on_time=True,
            )

        # Log a completion today to trigger recompute
        response = self.client.post(
            "/api/modules/time-management/routine-completion/",
            {
                "child": self.child.id,
                "routine": self.routine.id,
                "routine_type": "morning",
                "date": date.today().isoformat(),
                "was_on_time": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        progress_data = response.data["progress"]
        # Old completions should not count
        self.assertEqual(progress_data["state"], "unlocked")
