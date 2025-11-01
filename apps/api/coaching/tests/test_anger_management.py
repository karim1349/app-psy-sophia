"""
Tests for Anger Management module API endpoints.

Tests cover:
- Setting initial frequency
- Creating anger crisis logs
- Listing logs
- Unlock criteria (1 successful crisis)
- Techniques validation
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from coaching.models import AngerCrisisLog, Child, Module, ModuleProgress

User = get_user_model()


class TestAngerManagementAPI(TestCase):
    """Test suite for Anger Management API endpoints."""

    def setUp(self):
        """Set up test fixtures."""
        # Create user
        self.user = User.objects.create_user(
            email="parent@test.com",
            username="parent",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Create child
        self.child = Child.objects.create(
            parent=self.user,
            first_name="Test Child",
            schooling_stage="6-13",
            diagnosed_adhd="yes",
        )

        # Create anger management module
        self.module = Module.objects.create(
            key="anger_management",
            title="Gestion de la colère",
            order_index=3,
            is_active=True,
        )

    def test_set_initial_frequency_success(self):
        """Test setting initial anger crisis frequency."""
        response = self.client.post(
            "/api/modules/anger-management/initial-frequency/",
            {
                "child_id": self.child.id,
                "frequency": "weekly_multiple",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("counters", response.data)
        self.assertEqual(
            response.data["counters"]["initial_frequency"], "weekly_multiple"
        )

        # Verify progress was created
        progress = ModuleProgress.objects.get(child=self.child, module=self.module)
        self.assertEqual(progress.counters["initial_frequency"], "weekly_multiple")
        self.assertEqual(progress.counters["successful_crises_count"], 0)

    def test_set_initial_frequency_invalid(self):
        """Test setting invalid frequency."""
        response = self.client.post(
            "/api/modules/anger-management/initial-frequency/",
            {
                "child_id": self.child.id,
                "frequency": "invalid_frequency",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_create_anger_log_before_crisis(self):
        """Test creating anger log with 'before' intervention."""
        today = date.today()
        response = self.client.post(
            "/api/modules/anger-management/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "time": "14:30:00",
                "intervention_stage": "before",
                "techniques_used": ["observe_signs", "cushion_punch"],
                "was_successful": True,
                "notes": "Noticed signs early and redirected",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("log", response.data)
        self.assertIn("progress", response.data)

        log = response.data["log"]
        self.assertEqual(log["intervention_stage"], "before")
        self.assertEqual(len(log["techniques_used"]), 2)
        self.assertTrue(log["was_successful"])

        # Verify progress updated
        progress = response.data["progress"]
        self.assertEqual(progress["counters"]["successful_crises_count"], 1)
        self.assertEqual(progress["state"], "passed")  # Should pass with 1 success

    def test_create_anger_log_during_crisis(self):
        """Test creating anger log with 'during' intervention."""
        today = date.today()
        response = self.client.post(
            "/api/modules/anger-management/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "intervention_stage": "during",
                "techniques_used": ["isolate", "stay_calm"],
                "was_successful": False,
                "notes": "Crisis escalated despite efforts",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        log = response.data["log"]
        self.assertEqual(log["intervention_stage"], "during")
        self.assertFalse(log["was_successful"])

        # Progress should NOT pass with unsuccessful crisis
        progress = response.data["progress"]
        self.assertEqual(progress["counters"]["successful_crises_count"], 0)
        self.assertEqual(progress["state"], "unlocked")

    def test_create_anger_log_after_crisis(self):
        """Test creating anger log with 'after' intervention."""
        today = date.today()
        response = self.client.post(
            "/api/modules/anger-management/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "intervention_stage": "after",
                "techniques_used": ["awareness", "discuss_alternatives"],
                "was_successful": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["log"]["intervention_stage"], "after")
        self.assertTrue(response.data["log"]["was_successful"])

    def test_create_anger_log_no_intervention(self):
        """Test creating anger log with no intervention."""
        today = date.today()
        response = self.client.post(
            "/api/modules/anger-management/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "intervention_stage": "none",
                "techniques_used": [],
                "was_successful": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["log"]["intervention_stage"], "none")
        self.assertEqual(len(response.data["log"]["techniques_used"]), 0)

    def test_create_anger_log_invalid_technique(self):
        """Test creating log with invalid technique."""
        today = date.today()
        response = self.client.post(
            "/api/modules/anger-management/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "intervention_stage": "before",
                "techniques_used": ["invalid_technique"],
                "was_successful": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_anger_logs(self):
        """Test listing anger crisis logs."""
        # Create several logs
        today = date.today()
        for i in range(3):
            AngerCrisisLog.objects.create(
                child=self.child,
                date=today - timedelta(days=i),
                intervention_stage="before" if i % 2 == 0 else "after",
                techniques_used=["observe_signs"],
                was_successful=i == 0,  # Only first one successful
            )

        response = self.client.get(
            f"/api/modules/anger-management/logs/?child_id={self.child.id}&range=30d"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 3)

        # Check ordering (most recent first)
        results = response.data["results"]
        self.assertEqual(results[0]["date"], today.isoformat())

    def test_list_anger_logs_with_range(self):
        """Test listing logs with custom range."""
        today = date.today()

        # Create log from 5 days ago
        AngerCrisisLog.objects.create(
            child=self.child,
            date=today - timedelta(days=5),
            intervention_stage="before",
            techniques_used=["observe_signs"],
            was_successful=True,
        )

        # Create log from 35 days ago (outside 30d range)
        AngerCrisisLog.objects.create(
            child=self.child,
            date=today - timedelta(days=35),
            intervention_stage="before",
            techniques_used=["observe_signs"],
            was_successful=True,
        )

        # Query with 30d range
        response = self.client.get(
            f"/api/modules/anger-management/logs/?child_id={self.child.id}&range=30d"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)  # Only recent log

        # Query with 60d range
        response = self.client.get(
            f"/api/modules/anger-management/logs/?child_id={self.child.id}&range=60d"
        )

        self.assertEqual(len(response.data["results"]), 2)  # Both logs

    def test_module_passes_with_one_successful_crisis(self):
        """Test that module passes when 1 successful crisis is logged."""
        # Create progress
        progress = ModuleProgress.objects.create(
            child=self.child,
            module=self.module,
            state="unlocked",
            counters={"successful_crises_count": 0},
        )

        # Create unsuccessful log
        today = date.today()
        self.client.post(
            "/api/modules/anger-management/logs/",
            {
                "child": self.child.id,
                "date": (today - timedelta(days=1)).isoformat(),
                "intervention_stage": "before",
                "techniques_used": ["observe_signs"],
                "was_successful": False,
            },
            format="json",
        )

        progress.refresh_from_db()
        self.assertEqual(progress.state, "unlocked")
        self.assertEqual(progress.counters["successful_crises_count"], 0)

        # Create successful log
        response = self.client.post(
            "/api/modules/anger-management/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "intervention_stage": "before",
                "techniques_used": ["observe_signs", "cushion_punch"],
                "was_successful": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check module passed
        progress.refresh_from_db()
        self.assertEqual(progress.state, "passed")
        self.assertIsNotNone(progress.passed_at)
        self.assertEqual(progress.counters["successful_crises_count"], 1)

    def test_multiple_successful_crises(self):
        """Test that counter increments with multiple successful crises."""
        # Create multiple successful logs
        for i in range(3):
            response = self.client.post(
                "/api/modules/anger-management/logs/",
                {
                    "child": self.child.id,
                    "date": (date.today() - timedelta(days=i)).isoformat(),
                    "intervention_stage": "before",
                    "techniques_used": ["observe_signs"],
                    "was_successful": True,
                },
                format="json",
            )

            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check final count
        progress = ModuleProgress.objects.get(child=self.child, module=self.module)
        self.assertEqual(progress.counters["successful_crises_count"], 3)
        self.assertEqual(progress.state, "passed")

    def test_cannot_access_other_user_child(self):
        """Test that users cannot access other users' children."""
        # Create another user and child
        other_user = User.objects.create_user(
            email="other@test.com",
            username="other",
            password="testpass123",
        )
        other_child = Child.objects.create(
            parent=other_user,
            first_name="Other Child",
            schooling_stage="6-13",
            diagnosed_adhd="no",
        )

        # Try to create log for other user's child
        response = self.client.post(
            "/api/modules/anger-management/logs/",
            {
                "child": other_child.id,
                "date": date.today().isoformat(),
                "intervention_stage": "before",
                "techniques_used": ["observe_signs"],
                "was_successful": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", response.data)

    def test_list_logs_requires_child_id(self):
        """Test that listing logs requires child_id parameter."""
        response = self.client.get("/api/modules/anger-management/logs/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_all_technique_types_valid(self):
        """Test that all technique types from the model are valid."""
        today = date.today()

        # Test all before techniques
        before_techniques = [
            "observe_signs",
            "cushion_punch",
            "sensory_activity",
            "calm_activity",
            "discussion",
        ]
        response = self.client.post(
            "/api/modules/anger-management/logs/",
            {
                "child": self.child.id,
                "date": today.isoformat(),
                "intervention_stage": "before",
                "techniques_used": before_techniques,
                "was_successful": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Test all during techniques
        during_techniques = ["isolate", "stay_calm", "no_escalation"]
        response = self.client.post(
            "/api/modules/anger-management/logs/",
            {
                "child": self.child.id,
                "date": (today - timedelta(days=1)).isoformat(),
                "intervention_stage": "during",
                "techniques_used": during_techniques,
                "was_successful": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Test all after techniques
        after_techniques = ["awareness", "discuss_alternatives", "teach_techniques"]
        response = self.client.post(
            "/api/modules/anger-management/logs/",
            {
                "child": self.child.id,
                "date": (today - timedelta(days=2)).isoformat(),
                "intervention_stage": "after",
                "techniques_used": after_techniques,
                "was_successful": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_update_frequency_after_initial_set(self):
        """Test updating frequency after it's already been set."""
        # Set initial frequency
        self.client.post(
            "/api/modules/anger-management/initial-frequency/",
            {
                "child_id": self.child.id,
                "frequency": "daily",
            },
            format="json",
        )

        # Update to different frequency
        response = self.client.post(
            "/api/modules/anger-management/initial-frequency/",
            {
                "child_id": self.child.id,
                "frequency": "monthly_once",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["counters"]["initial_frequency"], "monthly_once")

        # Verify in database
        progress = ModuleProgress.objects.get(child=self.child, module=self.module)
        self.assertEqual(progress.counters["initial_frequency"], "monthly_once")
