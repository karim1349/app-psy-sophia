"""
Tests for Effective Commands module unlock rules.

Tests cover:
- Objective creation
- Log entry creation with validation
- Progress counter computation
- Unlock rule evaluation (3 objectives with 5+ satisfying days each)
- Edge cases (repetition threshold, failure reasons)
"""

from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from coaching.models import (
    Child,
    EffectiveCommandLog,
    EffectiveCommandObjective,
    Module,
    ModuleProgress,
)

User = get_user_model()


@pytest.mark.django_db
class TestEffectiveCommandsModule:
    """Test Effective Commands module."""

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
            key="effective_commands",
            title="Ordres Efficaces",
            order_index=2,
            is_active=True,
        )

    def test_create_objectives(self):
        """Test creating objectives for a child."""
        response = self.client.post(
            "/api/modules/effective-commands/objectives/",
            {
                "child": self.child.id,
                "labels": [
                    "Aller se brosser les dents",
                    "Se mettre en pyjama",
                    "Aller au lit",
                ],
            },
            format="json",
        )

        assert response.status_code == 201, f"Error: {response.json()}"
        data = response.json()
        assert len(data) == 3
        assert data[0]["label"] == "Aller se brosser les dents"
        assert data[0]["is_active"] is True

    def test_list_objectives(self):
        """Test listing objectives for a child."""
        # Create objectives
        EffectiveCommandObjective.objects.create(
            child=self.child, label="Test objective 1"
        )
        EffectiveCommandObjective.objects.create(
            child=self.child, label="Test objective 2"
        )

        response = self.client.get(
            f"/api/modules/effective-commands/objectives/?child_id={self.child.id}"
        )

        assert response.status_code == 200
        data = response.json()["results"]
        assert len(data) == 2

    def test_log_entry_first_try_success(self):
        """Test logging a successful first try."""
        objective = EffectiveCommandObjective.objects.create(
            child=self.child, label="Aller se brosser les dents"
        )

        response = self.client.post(
            "/api/modules/effective-commands/logs/",
            {
                "child": self.child.id,
                "objective": objective.id,
                "date": date.today().isoformat(),
                "gave_effective_command": True,
                "child_completed": "first_try",
            },
            format="json",
        )

        assert response.status_code == 201, f"Error: {response.json()}"
        log_data = response.json()["log"]
        assert log_data["gave_effective_command"] is True
        assert log_data["child_completed"] == "first_try"

    def test_log_entry_not_directly(self):
        """Test logging when child completed but not directly."""
        objective = EffectiveCommandObjective.objects.create(
            child=self.child, label="Test objective"
        )

        response = self.client.post(
            "/api/modules/effective-commands/logs/",
            {
                "child": self.child.id,
                "objective": objective.id,
                "date": date.today().isoformat(),
                "gave_effective_command": True,
                "child_completed": "not_directly",
                "repetitions_count": 3,
            },
            format="json",
        )

        assert response.status_code == 201
        log_data = response.json()["log"]
        assert log_data["child_completed"] == "not_directly"
        assert log_data["repetitions_count"] == 3

    def test_log_entry_not_completed_with_reason(self):
        """Test logging when child didn't complete."""
        objective = EffectiveCommandObjective.objects.create(
            child=self.child, label="Test objective"
        )

        response = self.client.post(
            "/api/modules/effective-commands/logs/",
            {
                "child": self.child.id,
                "objective": objective.id,
                "date": date.today().isoformat(),
                "gave_effective_command": True,
                "child_completed": "not_completed",
                "failure_reason": "distractions",
            },
            format="json",
        )

        assert response.status_code == 201
        log_data = response.json()["log"]
        assert log_data["child_completed"] == "not_completed"
        assert log_data["failure_reason"] == "distractions"

    def test_unlock_with_3_objectives_5_days_each(self):
        """Test that module unlocks with 3 objectives having 5+ satisfying days."""
        # Create 3 objectives
        objectives = []
        for i in range(3):
            obj = EffectiveCommandObjective.objects.create(
                child=self.child, label=f"Objective {i+1}"
            )
            objectives.append(obj)

        # Log 5 satisfying days for each objective
        today = date.today()
        for obj in objectives:
            for day_offset in range(5):
                log_date = today - timedelta(days=day_offset)
                self.client.post(
                    "/api/modules/effective-commands/logs/",
                    {
                        "child": self.child.id,
                        "objective": obj.id,
                        "date": log_date.isoformat(),
                        "gave_effective_command": True,
                        "child_completed": "first_try",
                    },
                    format="json",
                )

        # Check progress
        response = self.client.get(f"/api/modules/?child_id={self.child.id}")
        data = next(
            (m for m in response.json() if m["key"] == "effective_commands"), None
        )

        assert data is not None
        assert len(data["counters"]["objectives_with_5plus_days"]) == 3
        assert data["state"] == "passed"
        assert data["passed_at"] is not None

    def test_does_not_unlock_with_only_2_objectives(self):
        """Test that module doesn't unlock with only 2 objectives completed."""
        # Create 3 objectives
        objectives = []
        for i in range(3):
            obj = EffectiveCommandObjective.objects.create(
                child=self.child, label=f"Objective {i+1}"
            )
            objectives.append(obj)

        # Log 5 satisfying days for only 2 objectives
        today = date.today()
        for obj in objectives[:2]:  # Only first 2
            for day_offset in range(5):
                log_date = today - timedelta(days=day_offset)
                self.client.post(
                    "/api/modules/effective-commands/logs/",
                    {
                        "child": self.child.id,
                        "objective": obj.id,
                        "date": log_date.isoformat(),
                        "gave_effective_command": True,
                        "child_completed": "first_try",
                    },
                    format="json",
                )

        # Check progress
        response = self.client.get(f"/api/modules/?child_id={self.child.id}")
        data = next(
            (m for m in response.json() if m["key"] == "effective_commands"), None
        )

        assert data is not None
        assert len(data["counters"]["objectives_with_5plus_days"]) == 2
        assert data["state"] == "unlocked"  # Not passed yet

    def test_repetition_threshold_logic(self):
        """Test that repetitions below threshold count as satisfying."""
        objective = EffectiveCommandObjective.objects.create(
            child=self.child, label="Test objective"
        )

        # Set initial repetition average to 5
        progress, _ = ModuleProgress.objects.get_or_create(
            child=self.child,
            module=self.module,
            defaults={
                "state": "unlocked",
                "counters": {"initial_repetition_average": 5},
            },
        )

        today = date.today()

        # Log 5 days with repetitions < 5 (satisfying)
        for day_offset in range(5):
            log_date = today - timedelta(days=day_offset)
            self.client.post(
                "/api/modules/effective-commands/logs/",
                {
                    "child": self.child.id,
                    "objective": objective.id,
                    "date": log_date.isoformat(),
                    "gave_effective_command": True,
                    "child_completed": "not_directly",
                    "repetitions_count": 3,  # Below threshold of 5
                },
                format="json",
            )

        # Check progress
        response = self.client.get(f"/api/modules/?child_id={self.child.id}")
        data = next(
            (m for m in response.json() if m["key"] == "effective_commands"), None
        )

        assert len(data["counters"]["objectives_with_5plus_days"]) == 1

    def test_repetitions_above_threshold_not_satisfying(self):
        """Test that repetitions >= threshold don't count as satisfying."""
        objective = EffectiveCommandObjective.objects.create(
            child=self.child, label="Test objective"
        )

        # Set initial repetition average to 3
        progress, _ = ModuleProgress.objects.get_or_create(
            child=self.child,
            module=self.module,
            defaults={
                "state": "unlocked",
                "counters": {"initial_repetition_average": 3},
            },
        )

        today = date.today()

        # Log 5 days with repetitions >= 3 (not satisfying)
        for day_offset in range(5):
            log_date = today - timedelta(days=day_offset)
            self.client.post(
                "/api/modules/effective-commands/logs/",
                {
                    "child": self.child.id,
                    "objective": objective.id,
                    "date": log_date.isoformat(),
                    "gave_effective_command": True,
                    "child_completed": "not_directly",
                    "repetitions_count": 5,  # Above threshold of 3
                },
                format="json",
            )

        # Check progress
        response = self.client.get(f"/api/modules/?child_id={self.child.id}")
        data = next(
            (m for m in response.json() if m["key"] == "effective_commands"), None
        )

        assert len(data["counters"]["objectives_with_5plus_days"]) == 0

    def test_upsert_log_entry(self):
        """Test that logging for same date updates existing entry."""
        objective = EffectiveCommandObjective.objects.create(
            child=self.child, label="Test objective"
        )

        log_date = date.today().isoformat()

        # Create initial log
        self.client.post(
            "/api/modules/effective-commands/logs/",
            {
                "child": self.child.id,
                "objective": objective.id,
                "date": log_date,
                "gave_effective_command": True,
                "child_completed": "first_try",
            },
            format="json",
        )

        # Update with same date
        self.client.post(
            "/api/modules/effective-commands/logs/",
            {
                "child": self.child.id,
                "objective": objective.id,
                "date": log_date,
                "gave_effective_command": True,
                "child_completed": "not_completed",
                "failure_reason": "distractions",
            },
            format="json",
        )

        # Should only have one log entry
        logs = EffectiveCommandLog.objects.filter(
            child=self.child, objective=objective, date=log_date
        )
        assert logs.count() == 1
        assert logs.first().child_completed == "not_completed"

    def test_initial_repetition_average_update(self):
        """Test updating initial repetition average."""
        progress, _ = ModuleProgress.objects.get_or_create(
            child=self.child,
            module=self.module,
            defaults={"state": "unlocked", "counters": {}},
        )

        response = self.client.patch(
            f"/api/modules-progress/{progress.id}/initial-repetitions/",
            {"initial_repetition_average": 8},
            format="json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["counters"]["initial_repetition_average"] == 8

    def test_list_logs_with_filters(self):
        """Test listing logs with objective and date range filters."""
        objective1 = EffectiveCommandObjective.objects.create(
            child=self.child, label="Objective 1"
        )
        objective2 = EffectiveCommandObjective.objects.create(
            child=self.child, label="Objective 2"
        )

        today = date.today()

        # Create logs for both objectives
        for day_offset in range(10):
            log_date = today - timedelta(days=day_offset)
            for obj in [objective1, objective2]:
                self.client.post(
                    "/api/modules/effective-commands/logs/",
                    {
                        "child": self.child.id,
                        "objective": obj.id,
                        "date": log_date.isoformat(),
                        "gave_effective_command": True,
                        "child_completed": "first_try",
                    },
                    format="json",
                )

        # Filter by objective
        response = self.client.get(
            f"/api/modules/effective-commands/logs/"
            f"?child_id={self.child.id}&objective_id={objective1.id}"
        )
        assert response.status_code == 200
        data = response.json()["results"]
        assert len(data) == 10
        assert all(log["objective"] == objective1.id for log in data)

        # Filter by range (7 days)
        response = self.client.get(
            f"/api/modules/effective-commands/logs/?child_id={self.child.id}&range=7d"
        )
        assert response.status_code == 200
        data = response.json()["results"]
        # Should have 7 days * 2 objectives = 14 logs
        assert len(data) == 14
