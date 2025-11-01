"""
Tests for module progress and Special Time unlock rules.

Tests cover:
- Special Time session logging
- Progress counter computation
- Unlock rule evaluation (6 sessions, 4 liked)
- Edge cases (window boundaries, liked_last6 rolling)
"""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from coaching.models import Child, Module, ModuleProgress, SpecialTimeSession

User = get_user_model()


@pytest.mark.django_db
class TestSpecialTimeUnlockRules:
    """Test Special Time module unlock rules."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="parent", email="parent@test.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

        self.child = Child.objects.create(
            parent=self.user, schooling_stage="6-13", diagnosed_adhd="unknown"
        )

        self.module = Module.objects.create(
            key="special_time",
            title="Moment Spécial",
            order_index=1,
            is_active=True,
        )

    def test_initial_progress_state(self):
        """Test that progress is initialized with correct defaults."""
        response = self.client.get(f"/api/modules/?child_id={self.child.id}")

        assert response.status_code == 200
        data = response.json()[0]
        assert data["state"] == "unlocked"
        assert data["counters"]["sessions_21d"] == 0
        assert data["counters"]["liked_last6"] == 0
        assert data["counters"]["goal_per_week"] == 5

    def test_session_logging_increments_counters(self):
        """Test that logging a session updates counters."""
        response = self.client.post(
            "/api/modules/special-time/sessions/",
            {
                "child": self.child.id,
                "datetime": timezone.now().isoformat(),
                "duration_min": 15,
                "activity": "Lego",
                "child_enjoyed": True,
            },
            format="json",
        )

        assert response.status_code == 201, f"Error: {response.json()}"
        progress_data = response.json()["progress"]
        assert progress_data["counters"]["sessions_21d"] == 1
        assert progress_data["counters"]["liked_last6"] == 1
        assert progress_data["state"] == "active"  # Not passed yet

    def test_unlock_with_6_sessions_and_4_liked(self):
        """Test that module unlocks with 6 sessions (4 enjoyed)."""
        now = timezone.now()

        # Log 6 sessions within 21 days, 4 enjoyed
        for i in range(6):
            enjoyed = i < 4  # First 4 enjoyed, last 2 not
            self.client.post(
                "/api/modules/special-time/sessions/",
                {
                    "child": self.child.id,
                    "datetime": (now - timedelta(days=i)).isoformat(),
                    "duration_min": 15,
                    "activity": f"Activity {i}",
                    "child_enjoyed": enjoyed,
                },
                format="json",
            )

        # Check progress
        response = self.client.get(f"/api/modules/?child_id={self.child.id}")
        data = response.json()[0]

        assert data["counters"]["sessions_21d"] == 6
        assert data["counters"]["liked_last6"] == 4
        assert data["state"] == "passed"
        assert data["passed_at"] is not None

    def test_does_not_unlock_with_insufficient_sessions(self):
        """Test that module doesn't unlock with only 5 sessions."""
        now = timezone.now()

        # Log only 5 sessions (all enjoyed)
        for i in range(5):
            self.client.post(
                "/api/modules/special-time/sessions/",
                {
                    "child": self.child.id,
                    "datetime": (now - timedelta(days=i)).isoformat(),
                    "duration_min": 15,
                    "child_enjoyed": True,
                },
                format="json",
            )

        response = self.client.get(f"/api/modules/?child_id={self.child.id}")
        data = response.json()[0]

        assert data["counters"]["sessions_21d"] == 5
        assert data["state"] == "active"  # Not passed

    def test_does_not_unlock_with_insufficient_enjoyed(self):
        """Test that module doesn't unlock with only 3 enjoyed sessions."""
        now = timezone.now()

        # Log 6 sessions but only 3 enjoyed
        for i in range(6):
            enjoyed = i < 3
            self.client.post(
                "/api/modules/special-time/sessions/",
                {
                    "child": self.child.id,
                    "datetime": (now - timedelta(days=i)).isoformat(),
                    "duration_min": 15,
                    "child_enjoyed": enjoyed,
                },
                format="json",
            )

        response = self.client.get(f"/api/modules/?child_id={self.child.id}")
        data = response.json()[0]

        assert data["counters"]["sessions_21d"] == 6
        assert data["counters"]["liked_last6"] == 3
        assert data["state"] == "active"  # Not passed

    def test_21_day_window_boundary(self):
        """Test that sessions outside 21-day window don't count."""
        now = timezone.now()

        # Log 5 sessions within 21 days
        for i in range(5):
            self.client.post(
                "/api/modules/special-time/sessions/",
                {
                    "child": self.child.id,
                    "datetime": (now - timedelta(days=i)).isoformat(),
                    "duration_min": 15,
                    "child_enjoyed": True,
                },
                format="json",
            )

        # Log 2 sessions outside 21-day window
        for i in range(22, 24):
            self.client.post(
                "/api/modules/special-time/sessions/",
                {
                    "child": self.child.id,
                    "datetime": (now - timedelta(days=i)).isoformat(),
                    "duration_min": 15,
                    "child_enjoyed": True,
                },
                format="json",
            )

        response = self.client.get(f"/api/modules/?child_id={self.child.id}")
        data = response.json()[0]

        # Should only count 5 sessions (within 21 days)
        assert data["counters"]["sessions_21d"] == 5
        # But liked_last6 should count the most recent 6 (regardless of date)
        assert data["counters"]["liked_last6"] == 6
        assert data["state"] == "active"  # Not passed (need 6 in 21d)

    def test_liked_last6_rolls_correctly(self):
        """Test that liked_last6 only counts most recent 6 sessions."""
        now = timezone.now()

        # Log 10 sessions, with FIRST 3 enjoyed (most recent)
        # Sessions are posted in reverse chronological order
        for i in range(10):
            # i=0 is most recent (now), i=9 is oldest (now - 9 hours)
            # Enjoy the first 3 (i=0,1,2)
            enjoyed = i < 3
            self.client.post(
                "/api/modules/special-time/sessions/",
                {
                    "child": self.child.id,
                    "datetime": (now - timedelta(hours=i)).isoformat(),
                    "duration_min": 15,
                    "child_enjoyed": enjoyed,
                },
                format="json",
            )

        response = self.client.get(f"/api/modules/?child_id={self.child.id}")
        data = response.json()[0]

        # Most recent 6 sessions: i=0,1,2,3,4,5
        # Enjoyed: i=0,1,2 (3 sessions)
        assert data["counters"]["liked_last6"] == 3
        assert data["state"] == "active"  # Not enough sessions in 21d AND not 4 enjoyed

    def test_recompute_endpoint(self):
        """Test manual recompute endpoint."""
        # Create sessions directly in DB
        now = timezone.now()
        for i in range(6):
            SpecialTimeSession.objects.create(
                child=self.child,
                datetime=now - timedelta(days=i),
                duration_min=15,
                child_enjoyed=True,
            )

        # Recompute
        response = self.client.post(
            "/api/modules/special-time/recompute/",
            {"child": self.child.id},
            format="json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["counters"]["sessions_21d"] == 6
        assert data["counters"]["liked_last6"] == 6
        assert data["state"] == "passed"

    def test_permissions_block_other_users(self):
        """Test that users can't access other users' children."""
        other_user = User.objects.create_user(
            username="other", email="other@test.com", password="testpass123"
        )
        other_client = APIClient()
        other_client.force_authenticate(user=other_user)

        # Try to log session for first user's child
        response = other_client.post(
            "/api/modules/special-time/sessions/",
            {
                "child": self.child.id,  # Different user's child
                "duration_min": 15,
                "child_enjoyed": True,
            },
            format="json",
        )

        assert response.status_code == 404
        assert "not found" in response.json()["error"].lower()

    def test_list_sessions_endpoint(self):
        """Test listing Special Time sessions."""
        now = timezone.now()

        # Create 5 sessions
        for i in range(5):
            self.client.post(
                "/api/modules/special-time/sessions/",
                {
                    "child": self.child.id,
                    "datetime": (now - timedelta(days=i)).isoformat(),
                    "duration_min": 15,
                    "child_enjoyed": i % 2 == 0,
                },
                format="json",
            )

        # List sessions - URL should NOT have trailing slash for GET with custom actions
        response = self.client.get(
            f"/api/modules/special-time/sessions/?child_id={self.child.id}&range=21d"
        )

        assert response.status_code == 200, f"Error: {response.json()}"
        results = response.json()["results"]
        assert len(results) == 5
        # Should be ordered by datetime DESC
        assert results[0]["duration_min"] == 15

    def test_update_goal_per_week(self):
        """Test updating goal_per_week counter."""
        # Get progress
        response = self.client.get(f"/api/modules/?child_id={self.child.id}")
        progress_id = response.json()[0]["id"]

        # Update goal
        response = self.client.patch(
            f"/api/modules-progress/{progress_id}/goal/",
            {"goal_per_week": 3},
            format="json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["counters"]["goal_per_week"] == 3

    def test_session_without_datetime_defaults_to_now(self):
        """Test that sessions can be created without datetime (defaults to now)."""
        response = self.client.post(
            "/api/modules/special-time/sessions/",
            {
                "child": self.child.id,
                # No datetime provided
                "duration_min": 20,
                "activity": "Drawing",
                "child_enjoyed": True,
            },
            format="json",
        )

        assert response.status_code == 201, f"Error: {response.json()}"
        session_data = response.json()["session"]

        # Verify datetime was set (should be recent)
        assert session_data["datetime"] is not None
        session_datetime = timezone.datetime.fromisoformat(
            session_data["datetime"].replace("Z", "+00:00")
        )
        now = timezone.now()
        time_diff = abs((now - session_datetime).total_seconds())
        assert time_diff < 5  # Should be within 5 seconds of now


@pytest.mark.django_db
class TestModuleLocking:
    """Test module locking mechanism."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="parent", email="parent@test.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

        self.child = Child.objects.create(
            parent=self.user, schooling_stage="6-13", diagnosed_adhd="unknown"
        )

        # Create 3 modules in sequence
        self.module1 = Module.objects.create(
            key="special_time",
            title="Moment Spécial",
            order_index=1,
            is_active=True,
        )
        self.module2 = Module.objects.create(
            key="effective_commands",
            title="Ordres Efficaces",
            order_index=2,
            is_active=True,
        )
        self.module3 = Module.objects.create(
            key="anger_management",
            title="Gestion de la colère",
            order_index=3,
            is_active=True,
        )

    def test_first_module_unlocked_rest_locked(self):
        """Test that first module is unlocked, rest are locked."""
        response = self.client.get(f"/api/modules/?child_id={self.child.id}")

        assert response.status_code == 200
        data = response.json()

        assert len(data) == 3
        assert data[0]["key"] == "special_time"
        assert data[0]["state"] == "unlocked"
        assert data[1]["key"] == "effective_commands"
        assert data[1]["state"] == "locked"
        assert data[2]["key"] == "anger_management"
        assert data[2]["state"] == "locked"

    def test_unlocking_second_module(self):
        """Test that completing first module unlocks second."""
        # First, get modules to initialize progress
        self.client.get(f"/api/modules/?child_id={self.child.id}")

        # Log 6 sessions to complete Special Time module
        # (Need 6 sessions with at least 4 enjoyed to pass)
        now = timezone.now()
        for i in range(6):
            SpecialTimeSession.objects.create(
                child=self.child,
                datetime=now - timedelta(days=i),
                duration_min=15,
                activity=f"Activity {i}",
                child_enjoyed=i < 4,  # First 4 enjoyed, last 2 not
            )

        # Now check if module is passed and second module is unlocked
        response = self.client.get(f"/api/modules/?child_id={self.child.id}")
        data = response.json()

        assert data[0]["state"] == "passed"
        assert data[1]["state"] == "unlocked"
        assert data[2]["state"] == "locked"
