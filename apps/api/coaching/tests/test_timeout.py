"""
Tests for Time Out module API endpoints and unlock rules.
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from coaching.models import Child, Module, ModuleProgress, TimeOutLog

User = get_user_model()


class TestTimeOutAPI(APITestCase):
    """Test Time Out module API endpoints."""

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

        # Create timeout module
        self.timeout_module = Module.objects.create(
            key="timeout",
            title="Time Out",
            order_index=4,
            is_active=True,
            completion_rules={"successful_timeouts": 1},
        )

        # Create module progress
        self.progress = ModuleProgress.objects.create(
            child=self.child,
            module=self.timeout_module,
            state="unlocked",
            counters={},
        )

    def test_set_goal_valid_2_minutes(self):
        """Test setting goal with 2 minutes duration."""
        response = self.client.post(
            "/api/modules/timeout/goal/",
            {"child_id": self.child.id, "target_duration": 2},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.progress.refresh_from_db()
        self.assertEqual(self.progress.counters.get("target_duration"), 2)

    def test_set_goal_valid_5_minutes(self):
        """Test setting goal with 5 minutes duration."""
        response = self.client.post(
            "/api/modules/timeout/goal/",
            {"child_id": self.child.id, "target_duration": 5},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.progress.refresh_from_db()
        self.assertEqual(self.progress.counters.get("target_duration"), 5)

    def test_set_goal_invalid_duration(self):
        """Test setting goal with invalid duration."""
        response = self.client.post(
            "/api/modules/timeout/goal/",
            {"child_id": self.child.id, "target_duration": 6},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_set_goal_updates_existing_progress(self):
        """Test that setting goal updates existing progress."""
        # Set initial goal
        self.client.post(
            "/api/modules/timeout/goal/",
            {"child_id": self.child.id, "target_duration": 2},
        )
        # Update goal
        response = self.client.post(
            "/api/modules/timeout/goal/",
            {"child_id": self.child.id, "target_duration": 4},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.progress.refresh_from_db()
        self.assertEqual(self.progress.counters.get("target_duration"), 4)

    def test_create_log_no_timeout_needed(self):
        """Test creating log when timeout was not needed."""
        today = date.today()
        response = self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "needed_timeout": False,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        log = TimeOutLog.objects.get(child=self.child, date=today)
        self.assertFalse(log.needed_timeout)
        self.assertIsNone(log.was_successful)
        self.assertIsNone(log.failure_reason)

    def test_create_log_successful_timeout(self):
        """Test creating log when timeout was successful."""
        today = date.today()
        response = self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "needed_timeout": True,
                "was_successful": True,
                "notes": "Went well",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        log = TimeOutLog.objects.get(child=self.child, date=today)
        self.assertTrue(log.needed_timeout)
        self.assertTrue(log.was_successful)
        self.assertIsNone(log.failure_reason)
        self.assertEqual(log.notes, "Went well")

    def test_create_log_unsuccessful_with_negotiation(self):
        """Test creating log when timeout failed due to negotiation."""
        today = date.today()
        response = self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "needed_timeout": True,
                "was_successful": False,
                "failure_reason": "negotiation",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        log = TimeOutLog.objects.get(child=self.child, date=today)
        self.assertTrue(log.needed_timeout)
        self.assertFalse(log.was_successful)
        self.assertEqual(log.failure_reason, "negotiation")

    def test_create_log_unsuccessful_with_time_not_respected(self):
        """Test creating log when timeout failed because time wasn't respected."""
        today = date.today()
        response = self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "needed_timeout": True,
                "was_successful": False,
                "failure_reason": "time_not_respected",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        log = TimeOutLog.objects.get(child=self.child, date=today)
        self.assertEqual(log.failure_reason, "time_not_respected")

    def test_validation_not_needed_but_has_was_successful(self):
        """Test validation fails when timeout not needed but was_successful provided."""
        today = date.today()
        response = self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "needed_timeout": False,
                "was_successful": True,  # Should not be provided
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validation_needed_but_missing_was_successful(self):
        """Test validation fails when timeout needed but was_successful missing."""
        today = date.today()
        response = self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "needed_timeout": True,
                # Missing was_successful
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validation_unsuccessful_but_missing_failure_reason(self):
        """Test validation fails when unsuccessful but failure_reason missing."""
        today = date.today()
        response = self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "needed_timeout": True,
                "was_successful": False,
                # Missing failure_reason
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upsert_updates_existing_log(self):
        """Test that posting same date updates existing log."""
        today = date.today()
        # Create initial log
        TimeOutLog.objects.create(
            child=self.child,
            date=today,
            needed_timeout=False,
        )
        # Update it
        response = self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "needed_timeout": True,
                "was_successful": True,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Should still be only one log
        self.assertEqual(TimeOutLog.objects.filter(child=self.child, date=today).count(), 1)
        log = TimeOutLog.objects.get(child=self.child, date=today)
        self.assertTrue(log.needed_timeout)
        self.assertTrue(log.was_successful)

    def test_list_logs(self):
        """Test listing timeout logs."""
        today = date.today()
        yesterday = today - timedelta(days=1)
        # Create logs
        TimeOutLog.objects.create(
            child=self.child, date=yesterday, needed_timeout=False
        )
        TimeOutLog.objects.create(
            child=self.child,
            date=today,
            needed_timeout=True,
            was_successful=True,
        )

        response = self.client.get(
            f"/api/modules/timeout/logs/?child_id={self.child.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_list_logs_with_range(self):
        """Test listing logs with date range filter."""
        today = date.today()
        old_date = today - timedelta(days=60)
        # Create old log
        TimeOutLog.objects.create(
            child=self.child, date=old_date, needed_timeout=False
        )
        # Create recent log
        TimeOutLog.objects.create(
            child=self.child, date=today, needed_timeout=False
        )

        response = self.client.get(
            f"/api/modules/timeout/logs/?child_id={self.child.id}&range=30d"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only return recent log
        self.assertEqual(len(response.data["results"]), 1)

    def test_module_passes_with_one_successful_timeout(self):
        """Test module passes when one successful timeout is logged."""
        today = date.today()
        self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "needed_timeout": True,
                "was_successful": True,
            },
        )
        self.progress.refresh_from_db()
        self.assertEqual(self.progress.state, "passed")
        self.assertEqual(self.progress.counters.get("successful_timeouts_count"), 1)

    def test_module_does_not_pass_with_unsuccessful_timeout(self):
        """Test module stays unlocked with unsuccessful timeout."""
        today = date.today()
        self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "needed_timeout": True,
                "was_successful": False,
                "failure_reason": "negotiation",
            },
        )
        self.progress.refresh_from_db()
        self.assertEqual(self.progress.state, "unlocked")
        self.assertEqual(self.progress.counters.get("successful_timeouts_count"), 0)

    def test_module_does_not_pass_when_no_timeout_needed(self):
        """Test module stays unlocked when timeout not needed."""
        today = date.today()
        self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "needed_timeout": False,
            },
        )
        self.progress.refresh_from_db()
        self.assertEqual(self.progress.state, "unlocked")

    def test_cannot_access_other_user_child(self):
        """Test user cannot log timeout for another user's child."""
        other_user = User.objects.create_user(
            email="other@test.com",
            username="other",
            password="testpass123",
        )
        other_child = Child.objects.create(
            parent=other_user,
            first_name="Other",
            schooling_stage="primary",
            diagnosed_adhd=False,
        )

        today = date.today()
        response = self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": other_child.id,
                "date": today.isoformat(),
                "needed_timeout": False,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_logs_requires_child_id(self):
        """Test listing logs requires child parameter."""
        response = self.client.get("/api/modules/timeout/logs/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_multiple_successful_timeouts_counted(self):
        """Test multiple successful timeouts are counted correctly."""
        today = date.today()
        yesterday = today - timedelta(days=1)

        # Create first successful timeout
        self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": self.child.id,
                "date": yesterday.isoformat(),
                "needed_timeout": True,
                "was_successful": True,
            },
        )

        # Create second successful timeout
        self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "needed_timeout": True,
                "was_successful": True,
            },
        )

        self.progress.refresh_from_db()
        self.assertEqual(self.progress.state, "passed")
        self.assertEqual(self.progress.counters.get("successful_timeouts_count"), 2)

    def test_invalid_failure_reason(self):
        """Test validation fails with invalid failure reason."""
        today = date.today()
        response = self.client.post(
            "/api/modules/timeout/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "needed_timeout": True,
                "was_successful": False,
                "failure_reason": "invalid_reason",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
