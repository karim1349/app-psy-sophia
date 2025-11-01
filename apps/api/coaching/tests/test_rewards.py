"""
Tests for Rewards (Point System) module API endpoints and unlock rules.
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from coaching.models import (
    Child,
    DailyTaskCompletion,
    Module,
    ModuleProgress,
    Privilege,
    PrivilegeRedemption,
    Task,
)

User = get_user_model()


class TestRewardsSetupAPI(APITestCase):
    """Test Rewards system setup endpoint."""

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

        # Create rewards module
        self.rewards_module = Module.objects.create(
            key="rewards",
            title="Le système de point",
            order_index=5,
            is_active=True,
            completion_rules={"consecutive_days_50pct": 5},
        )

        # Create module progress
        self.progress = ModuleProgress.objects.create(
            child=self.child,
            module=self.rewards_module,
            state="unlocked",
            counters={},
        )

    def test_setup_valid_tasks_and_privileges(self):
        """Test setup with valid tasks and privileges."""
        response = self.client.post(
            "/api/modules/rewards/setup/",
            {
                "child_id": self.child.id,
                "tasks": [
                    {"title": "Faire son lit", "points_reward": 1},
                    {"title": "Ranger sa chambre", "points_reward": 3},
                    {"title": "Prendre sa douche", "points_reward": 5},
                ],
                "privileges": [
                    {"title": "10 minutes d'écran", "points_cost": 3},
                    {"title": "Un bonbon", "points_cost": 5},
                    {"title": "Une sortie", "points_cost": 10},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Task.objects.filter(child=self.child).count(), 3)
        self.assertEqual(Privilege.objects.filter(child=self.child).count(), 3)
        self.progress.refresh_from_db()
        self.assertTrue(self.progress.counters.get("setup_complete", False))

    def test_setup_invalid_task_points(self):
        """Test setup with invalid task points."""
        response = self.client.post(
            "/api/modules/rewards/setup/",
            {
                "child_id": self.child.id,
                "tasks": [
                    {"title": "Invalid task", "points_reward": 7},  # Invalid
                ],
                "privileges": [
                    {"title": "Some privilege", "points_cost": 3},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_setup_invalid_privilege_points(self):
        """Test setup with invalid privilege points."""
        response = self.client.post(
            "/api/modules/rewards/setup/",
            {
                "child_id": self.child.id,
                "tasks": [
                    {"title": "Valid task", "points_reward": 1},
                ],
                "privileges": [
                    {"title": "Invalid privilege", "points_cost": 7},  # Invalid
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_setup_missing_child_id(self):
        """Test setup without child_id."""
        response = self.client.post(
            "/api/modules/rewards/setup/",
            {
                "tasks": [{"title": "Task", "points_reward": 1}],
                "privileges": [{"title": "Privilege", "points_cost": 3}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_setup_other_user_child(self):
        """Test setup for another user's child fails."""
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

        response = self.client.post(
            "/api/modules/rewards/setup/",
            {
                "child_id": other_child.id,
                "tasks": [{"title": "Task", "points_reward": 1}],
                "privileges": [{"title": "Privilege", "points_cost": 3}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestTasksAndPrivilegesAPI(APITestCase):
    """Test listing tasks and privileges."""

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

        # Create tasks
        self.task1 = Task.objects.create(
            child=self.child,
            title="Faire son lit",
            points_reward=1,
            is_active=True,
        )
        self.task2 = Task.objects.create(
            child=self.child,
            title="Ranger sa chambre",
            points_reward=3,
            is_active=True,
        )
        self.task3 = Task.objects.create(
            child=self.child,
            title="Tâche désactivée",
            points_reward=1,
            is_active=False,  # Inactive
        )

        # Create privileges
        self.privilege1 = Privilege.objects.create(
            child=self.child,
            title="10 minutes d'écran",
            points_cost=3,
            is_active=True,
        )
        self.privilege2 = Privilege.objects.create(
            child=self.child,
            title="Un bonbon",
            points_cost=5,
            is_active=True,
        )

    def test_list_tasks(self):
        """Test listing active tasks."""
        response = self.client.get(
            f"/api/modules/rewards/tasks/?child_id={self.child.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only return active tasks
        self.assertEqual(len(response.data["tasks"]), 2)
        titles = [task["title"] for task in response.data["tasks"]]
        self.assertIn("Faire son lit", titles)
        self.assertNotIn("Tâche désactivée", titles)

    def test_list_tasks_missing_child_id(self):
        """Test listing tasks without child_id."""
        response = self.client.get("/api/modules/rewards/tasks/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_privileges(self):
        """Test listing active privileges."""
        response = self.client.get(
            f"/api/modules/rewards/privileges/?child_id={self.child.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["privileges"]), 2)

    def test_list_privileges_missing_child_id(self):
        """Test listing privileges without child_id."""
        response = self.client.get("/api/modules/rewards/privileges/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TestDailyCompletionAPI(APITestCase):
    """Test daily task completion endpoint."""

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

        # Create rewards module and progress
        self.rewards_module = Module.objects.create(
            key="rewards",
            title="Le système de point",
            order_index=5,
            is_active=True,
            completion_rules={"consecutive_days_50pct": 5},
        )
        self.progress = ModuleProgress.objects.create(
            child=self.child,
            module=self.rewards_module,
            state="unlocked",
            counters={"setup_complete": True},
        )

        # Create tasks
        self.task1 = Task.objects.create(
            child=self.child, title="Task 1", points_reward=1, is_active=True
        )
        self.task2 = Task.objects.create(
            child=self.child, title="Task 2", points_reward=3, is_active=True
        )
        self.task3 = Task.objects.create(
            child=self.child, title="Task 3", points_reward=5, is_active=True
        )

    def test_daily_completion_valid(self):
        """Test logging daily completion with valid data."""
        today = date.today()
        response = self.client.post(
            "/api/modules/rewards/daily-completion/",
            {
                "child_id": self.child.id,
                "date": today.isoformat(),
                "completed_task_ids": [self.task1.id, self.task2.id],
                "notes": "Good day",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check completion was created
        completion = DailyTaskCompletion.objects.get(child=self.child, date=today)
        self.assertEqual(len(completion.completed_task_ids), 2)
        self.assertEqual(completion.total_points_earned, 4)  # 1 + 3
        # 2 out of 3 tasks = 66.67%
        self.assertAlmostEqual(completion.completion_rate, 66.67, places=1)

    def test_daily_completion_empty_tasks(self):
        """Test logging daily completion with no tasks completed."""
        today = date.today()
        response = self.client.post(
            "/api/modules/rewards/daily-completion/",
            {
                "child_id": self.child.id,
                "date": today.isoformat(),
                "completed_task_ids": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        completion = DailyTaskCompletion.objects.get(child=self.child, date=today)
        self.assertEqual(completion.total_points_earned, 0)
        self.assertEqual(completion.completion_rate, 0.0)

    def test_daily_completion_all_tasks(self):
        """Test logging daily completion with all tasks completed."""
        today = date.today()
        response = self.client.post(
            "/api/modules/rewards/daily-completion/",
            {
                "child_id": self.child.id,
                "date": today.isoformat(),
                "completed_task_ids": [
                    self.task1.id,
                    self.task2.id,
                    self.task3.id,
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        completion = DailyTaskCompletion.objects.get(child=self.child, date=today)
        self.assertEqual(completion.total_points_earned, 9)  # 1 + 3 + 5
        self.assertEqual(completion.completion_rate, 100.0)

    def test_daily_completion_upsert(self):
        """Test updating existing daily completion."""
        today = date.today()
        # First completion
        self.client.post(
            "/api/modules/rewards/daily-completion/",
            {
                "child_id": self.child.id,
                "date": today.isoformat(),
                "completed_task_ids": [self.task1.id],
            },
            format="json",
        )
        # Update completion
        response = self.client.post(
            "/api/modules/rewards/daily-completion/",
            {
                "child_id": self.child.id,
                "date": today.isoformat(),
                "completed_task_ids": [self.task1.id, self.task2.id, self.task3.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Should still be only one record
        self.assertEqual(
            DailyTaskCompletion.objects.filter(child=self.child, date=today).count(), 1
        )
        completion = DailyTaskCompletion.objects.get(child=self.child, date=today)
        self.assertEqual(len(completion.completed_task_ids), 3)

    def test_daily_completion_invalid_task_id(self):
        """Test logging with invalid task ID."""
        today = date.today()
        response = self.client.post(
            "/api/modules/rewards/daily-completion/",
            {
                "child_id": self.child.id,
                "date": today.isoformat(),
                "completed_task_ids": [99999],  # Non-existent task
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_daily_completions(self):
        """Test listing daily completions."""
        today = date.today()
        yesterday = today - timedelta(days=1)

        # Create completions
        DailyTaskCompletion.objects.create(
            child=self.child,
            date=yesterday,
            completed_task_ids=[self.task1.id],
            total_points_earned=1,
            completion_rate=33.33,
        )
        DailyTaskCompletion.objects.create(
            child=self.child,
            date=today,
            completed_task_ids=[self.task1.id, self.task2.id],
            total_points_earned=4,
            completion_rate=66.67,
        )

        response = self.client.get(
            f"/api/modules/rewards/daily-completion/?child_id={self.child.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["completions"]), 2)


class TestPrivilegeRedemptionAPI(APITestCase):
    """Test privilege redemption endpoint."""

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

        # Create rewards module and progress
        self.rewards_module = Module.objects.create(
            key="rewards",
            title="Le système de point",
            order_index=5,
            is_active=True,
            completion_rules={"consecutive_days_50pct": 5},
        )
        self.progress = ModuleProgress.objects.create(
            child=self.child,
            module=self.rewards_module,
            state="unlocked",
            counters={"setup_complete": True, "points_balance": 10},
        )

        # Create tasks and privileges
        self.task = Task.objects.create(
            child=self.child, title="Task", points_reward=5, is_active=True
        )
        self.privilege = Privilege.objects.create(
            child=self.child,
            title="10 minutes d'écran",
            points_cost=3,
            is_active=True,
        )

        # Add some points to balance
        today = date.today()
        DailyTaskCompletion.objects.create(
            child=self.child,
            date=today,
            completed_task_ids=[self.task.id, self.task.id],
            total_points_earned=10,
            completion_rate=100.0,
        )

    def test_redeem_privilege_sufficient_balance(self):
        """Test redeeming privilege with sufficient balance."""
        response = self.client.post(
            "/api/modules/rewards/redeem/",
            {
                "child_id": self.child.id,
                "privilege_id": self.privilege.id,
                "notes": "Earned today",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check redemption was created
        redemption = PrivilegeRedemption.objects.get(
            child=self.child, privilege=self.privilege
        )
        self.assertEqual(redemption.points_spent, 3)
        self.assertEqual(redemption.privilege_title, "10 minutes d'écran")

        # Check balance updated
        self.progress.refresh_from_db()
        self.assertEqual(self.progress.counters.get("points_balance"), 7)  # 10 - 3

    def test_redeem_privilege_insufficient_balance(self):
        """Test redeeming privilege with insufficient balance."""
        # Create expensive privilege
        expensive_privilege = Privilege.objects.create(
            child=self.child,
            title="Expensive privilege",
            points_cost=20,  # More than balance
            is_active=True,
        )

        response = self.client.post(
            "/api/modules/rewards/redeem/",
            {
                "child_id": self.child.id,
                "privilege_id": expensive_privilege.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_redeem_invalid_privilege(self):
        """Test redeeming non-existent privilege."""
        response = self.client.post(
            "/api/modules/rewards/redeem/",
            {
                "child_id": self.child.id,
                "privilege_id": 99999,  # Non-existent
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestBalanceAPI(APITestCase):
    """Test balance calculation endpoint."""

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

        # Create rewards module and progress
        self.rewards_module = Module.objects.create(
            key="rewards",
            title="Le système de point",
            order_index=5,
            is_active=True,
            completion_rules={"consecutive_days_50pct": 5},
        )
        self.progress = ModuleProgress.objects.create(
            child=self.child,
            module=self.rewards_module,
            state="unlocked",
            counters={"setup_complete": True},
        )

        # Create tasks and privileges
        self.task = Task.objects.create(
            child=self.child, title="Task", points_reward=5, is_active=True
        )
        self.privilege = Privilege.objects.create(
            child=self.child, title="Privilege", points_cost=3, is_active=True
        )

    def test_balance_no_activity(self):
        """Test balance with no activity."""
        response = self.client.get(
            f"/api/modules/rewards/balance/?child_id={self.child.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["balance"], 0)
        self.assertEqual(response.data["total_earned"], 0)
        self.assertEqual(response.data["total_spent"], 0)

    def test_balance_with_earnings(self):
        """Test balance with only earnings."""
        today = date.today()
        DailyTaskCompletion.objects.create(
            child=self.child,
            date=today,
            completed_task_ids=[self.task.id],
            total_points_earned=5,
            completion_rate=100.0,
        )

        response = self.client.get(
            f"/api/modules/rewards/balance/?child_id={self.child.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["balance"], 5)
        self.assertEqual(response.data["total_earned"], 5)
        self.assertEqual(response.data["total_spent"], 0)

    def test_balance_with_earnings_and_redemptions(self):
        """Test balance with both earnings and redemptions."""
        today = date.today()
        # Add earnings
        DailyTaskCompletion.objects.create(
            child=self.child,
            date=today,
            completed_task_ids=[self.task.id, self.task.id],
            total_points_earned=10,
            completion_rate=100.0,
        )
        # Add redemption
        PrivilegeRedemption.objects.create(
            child=self.child,
            privilege=self.privilege,
            privilege_title="Privilege",
            points_spent=3,
        )

        response = self.client.get(
            f"/api/modules/rewards/balance/?child_id={self.child.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["balance"], 7)  # 10 - 3
        self.assertEqual(response.data["total_earned"], 10)
        self.assertEqual(response.data["total_spent"], 3)


class TestRewardsUnlockRules(APITestCase):
    """Test rewards module unlock criteria (5 consecutive days >50%)."""

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

        # Create rewards module and progress
        self.rewards_module = Module.objects.create(
            key="rewards",
            title="Le système de point",
            order_index=5,
            is_active=True,
            completion_rules={"consecutive_days_50pct": 5},
        )
        self.progress = ModuleProgress.objects.create(
            child=self.child,
            module=self.rewards_module,
            state="unlocked",
            counters={"setup_complete": True},
        )

        # Create tasks
        self.task1 = Task.objects.create(
            child=self.child, title="Task 1", points_reward=1, is_active=True
        )
        self.task2 = Task.objects.create(
            child=self.child, title="Task 2", points_reward=3, is_active=True
        )

    def test_module_passes_with_5_consecutive_days_above_50_percent(self):
        """Test module passes with 5 consecutive days >50% completion."""
        today = date.today()
        # Log 5 consecutive days with >50% completion
        for i in range(5):
            day = today - timedelta(days=4 - i)
            self.client.post(
                "/api/modules/rewards/daily-completion/",
                {
                    "child_id": self.child.id,
                    "date": day.isoformat(),
                    "completed_task_ids": [self.task1.id, self.task2.id],  # 100%
                },
                format="json",
            )

        self.progress.refresh_from_db()
        self.assertEqual(self.progress.state, "passed")
        self.assertEqual(self.progress.counters.get("consecutive_days_above_50pct"), 5)

    def test_module_does_not_pass_with_4_consecutive_days(self):
        """Test module stays unlocked with only 4 consecutive days."""
        today = date.today()
        # Log 4 consecutive days
        for i in range(4):
            day = today - timedelta(days=3 - i)
            self.client.post(
                "/api/modules/rewards/daily-completion/",
                {
                    "child_id": self.child.id,
                    "date": day.isoformat(),
                    "completed_task_ids": [self.task1.id, self.task2.id],
                },
                format="json",
            )

        self.progress.refresh_from_db()
        self.assertEqual(self.progress.state, "unlocked")
        self.assertEqual(self.progress.counters.get("consecutive_days_above_50pct"), 4)

    def test_module_does_not_pass_with_below_50_percent(self):
        """Test module stays unlocked when completion rate is below 50%."""
        today = date.today()
        # Log 5 days with <50% completion
        for i in range(5):
            day = today - timedelta(days=4 - i)
            self.client.post(
                "/api/modules/rewards/daily-completion/",
                {
                    "child_id": self.child.id,
                    "date": day.isoformat(),
                    "completed_task_ids": [],  # 0%
                },
                format="json",
            )

        self.progress.refresh_from_db()
        self.assertEqual(self.progress.state, "unlocked")
        self.assertEqual(self.progress.counters.get("consecutive_days_above_50pct"), 0)

    def test_consecutive_days_reset_on_gap(self):
        """Test consecutive days counter resets when there's a gap."""
        today = date.today()
        # Log 3 consecutive days
        for i in range(3):
            day = today - timedelta(days=6 - i)
            self.client.post(
                "/api/modules/rewards/daily-completion/",
                {
                    "child_id": self.child.id,
                    "date": day.isoformat(),
                    "completed_task_ids": [self.task1.id, self.task2.id],
                },
                format="json",
            )

        # Skip a day (gap)
        # Then log 2 more consecutive days
        for i in range(2):
            day = today - timedelta(days=1 - i)
            self.client.post(
                "/api/modules/rewards/daily-completion/",
                {
                    "child_id": self.child.id,
                    "date": day.isoformat(),
                    "completed_task_ids": [self.task1.id, self.task2.id],
                },
                format="json",
            )

        self.progress.refresh_from_db()
        self.assertEqual(self.progress.state, "unlocked")
        # Should only count the last 2 consecutive days
        self.assertEqual(self.progress.counters.get("consecutive_days_above_50pct"), 2)

    def test_module_passes_exactly_at_50_percent(self):
        """Test that exactly 50% completion counts toward unlock."""
        # This test verifies the >= 50% logic
        today = date.today()
        # Log 5 consecutive days with exactly 50% completion
        for i in range(5):
            day = today - timedelta(days=4 - i)
            self.client.post(
                "/api/modules/rewards/daily-completion/",
                {
                    "child_id": self.child.id,
                    "date": day.isoformat(),
                    "completed_task_ids": [self.task1.id],  # 50% (1 out of 2)
                },
                format="json",
            )

        self.progress.refresh_from_db()
        self.assertEqual(self.progress.state, "passed")
