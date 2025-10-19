"""
Comprehensive API tests for coaching app and auth flows.

Tests guest creation, guest conversion, onboarding flow, and all coaching endpoints.
"""

from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from coaching.models import Child, DailyCheckin, Screener, TargetBehavior

User = get_user_model()


@pytest.fixture
def api_client():
    """Return an API client for testing."""
    return APIClient()


@pytest.fixture
def guest_user(api_client):
    """Create and return a guest user with auth tokens."""
    response = api_client.post("/api/auth/users/guest/")
    assert response.status_code == status.HTTP_201_CREATED
    return {
        "user": User.objects.get(id=response.data["user"]["id"]),
        "access": response.data["access"],
        "refresh": response.data["refresh"],
    }


@pytest.fixture
def full_user(db):
    """Create and return a full (non-guest) user."""
    user = User.objects.create_user(
        email="test@example.com", username="testuser", password="TestPass123!"
    )
    user.is_active = True
    user.save()
    return user


@pytest.fixture
def child(full_user):
    """Create and return a child for the full user."""
    return Child.objects.create(
        parent=full_user, schooling_stage="6-13", diagnosed_adhd="unknown"
    )


@pytest.mark.django_db
class TestGuestAuth:
    """Test guest user creation and conversion."""

    def test_create_guest_user(self, api_client):
        """Test creating a guest user."""
        response = api_client.post("/api/auth/users/guest/")

        assert response.status_code == status.HTTP_201_CREATED
        assert "access" in response.data
        assert "refresh" in response.data
        assert "user" in response.data
        assert response.data["user"]["is_guest"] is True
        assert response.data["user"]["is_active"] is True

    def test_convert_guest_to_full_account(self, api_client, guest_user):
        """Test converting a guest user to a full account."""
        # Authenticate as guest
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {guest_user['access']}")

        # Convert to full account
        response = api_client.post(
            "/api/auth/users/convert/",
            {
                "email": "converted@example.com",
                "username": "converteduser",
                "password": "ConvertPass123!",
                "password_confirm": "ConvertPass123!",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        assert response.data["user"]["is_guest"] is False
        assert response.data["user"]["email"] == "converted@example.com"
        assert response.data["user"]["username"] == "converteduser"

    def test_convert_non_guest_fails(self, api_client, full_user):
        """Test that converting a non-guest user fails."""
        # Login as full user
        response = api_client.post(
            "/api/auth/users/login/",
            {"email": "test@example.com", "password": "TestPass123!"},
        )
        access_token = response.data["access"]

        # Try to convert (should fail)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = api_client.post(
            "/api/auth/users/convert/",
            {
                "email": "another@example.com",
                "username": "anotheruser",
                "password": "AnotherPass123!",
                "password_confirm": "AnotherPass123!",
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestChildAPI:
    """Test Child CRUD operations."""

    def test_create_child(self, api_client, guest_user):
        """Test creating a child as a guest user."""
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {guest_user['access']}")

        response = api_client.post(
            "/api/children/",
            {
                "first_name": "Jean",
                "schooling_stage": "preK",
                "diagnosed_adhd": "no",
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["first_name"] == "Jean"
        assert response.data["schooling_stage"] == "preK"

    def test_list_children(self, api_client, full_user, child):
        """Test listing children (only user's own)."""
        # Login
        response = api_client.post(
            "/api/auth/users/login/",
            {"email": "test@example.com", "password": "TestPass123!"},
        )
        access_token = response.data["access"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # List children
        response = api_client.get("/api/children/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == child.id

    def test_cannot_access_others_child(self, api_client, guest_user, child):
        """Test that a user cannot access another user's child."""
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {guest_user['access']}")

        response = api_client.get(f"/api/children/{child.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestScreenerAPI:
    """Test Screener creation and scoring."""

    def test_create_screener_vert(self, api_client, full_user, child):
        """Test creating a screener with low score (vert)."""
        # Login
        response = api_client.post(
            "/api/auth/users/login/",
            {"email": "test@example.com", "password": "TestPass123!"},
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

        # Create screener with low scores (total = 10)
        response = api_client.post(
            f"/api/children/{child.id}/screener/",
            {
                "answers": {
                    "q1": 1,
                    "q2": 1,
                    "q3": 1,
                    "q4": 1,
                    "q5": 1,
                    "q6": 1,
                    "q7": 1,
                    "q8": 1,
                    "q9": 1,
                    "q10": 1,
                }
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["total_score"] == 10
        assert response.data["zone"] == "vert"
        assert len(response.data["recommendations"]) > 0
        assert len(response.data["consult"]) == 0  # No consult for vert

    def test_create_screener_orange(self, api_client, full_user, child):
        """Test creating a screener with moderate score (orange)."""
        response = api_client.post(
            "/api/auth/users/login/",
            {"email": "test@example.com", "password": "TestPass123!"},
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

        # Create screener with moderate scores (total = 15)
        response = api_client.post(
            f"/api/children/{child.id}/screener/",
            {
                "answers": {
                    "q1": 2,
                    "q2": 2,
                    "q3": 1,
                    "q4": 2,
                    "q5": 1,
                    "q6": 2,
                    "q7": 1,
                    "q8": 2,
                    "q9": 1,
                    "q10": 1,
                }
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["total_score"] == 15
        assert response.data["zone"] == "orange"
        assert len(response.data["consult"]) > 0  # Consult list for orange

    def test_create_screener_rouge(self, api_client, full_user, child):
        """Test creating a screener with high score (rouge)."""
        response = api_client.post(
            "/api/auth/users/login/",
            {"email": "test@example.com", "password": "TestPass123!"},
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

        # Create screener with high scores (total = 25)
        response = api_client.post(
            f"/api/children/{child.id}/screener/",
            {
                "answers": {
                    "q1": 3,
                    "q2": 3,
                    "q3": 2,
                    "q4": 3,
                    "q5": 2,
                    "q6": 3,
                    "q7": 2,
                    "q8": 3,
                    "q9": 2,
                    "q10": 2,
                }
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["total_score"] == 25
        assert response.data["zone"] == "rouge"
        assert len(response.data["consult"]) > 0


@pytest.mark.django_db
class TestTargetBehaviorAPI:
    """Test TargetBehavior creation and limits."""

    def test_create_target_behaviors(self, api_client, full_user, child):
        """Test creating up to 3 target behaviors."""
        response = api_client.post(
            "/api/auth/users/login/",
            {"email": "test@example.com", "password": "TestPass123!"},
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

        # Create 3 behaviors
        response = api_client.post(
            f"/api/children/{child.id}/targets/",
            {
                "behaviors": [
                    {"name": "Brush teeth"},
                    {"name": "Bedtime"},
                    {"name": "Homework"},
                ]
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 3

    def test_cannot_create_more_than_3_behaviors(self, api_client, full_user, child):
        """Test that creating more than 3 behaviors fails."""
        response = api_client.post(
            "/api/auth/users/login/",
            {"email": "test@example.com", "password": "TestPass123!"},
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

        # Try to create 4 behaviors
        response = api_client.post(
            f"/api/children/{child.id}/targets/",
            {
                "behaviors": [
                    {"name": "Brush teeth"},
                    {"name": "Bedtime"},
                    {"name": "Homework"},
                    {"name": "Chores"},
                ]
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestDailyCheckinAPI:
    """Test DailyCheckin creation and idempotency."""

    def test_create_daily_checkin(self, api_client, full_user, child):
        """Test creating a daily check-in."""
        response = api_client.post(
            "/api/auth/users/login/",
            {"email": "test@example.com", "password": "TestPass123!"},
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

        # Create target behaviors first
        behavior1 = TargetBehavior.objects.create(
            child=child, name="Brush teeth", active=True
        )
        behavior2 = TargetBehavior.objects.create(
            child=child, name="Bedtime", active=True
        )

        # Create check-in
        today = date.today()
        response = api_client.post(
            f"/api/children/{child.id}/checkins/",
            {
                "date": str(today),
                "mood": 4,
                "behaviors": [
                    {"behavior_id": behavior1.id, "done": True},
                    {"behavior_id": behavior2.id, "done": False},
                ],
                "notes": "Good day!",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["mood"] == 4
        assert len(response.data["behaviors"]) == 2

    def test_daily_checkin_idempotent(self, api_client, full_user, child):
        """Test that daily check-in is idempotent (same date updates)."""
        response = api_client.post(
            "/api/auth/users/login/",
            {"email": "test@example.com", "password": "TestPass123!"},
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

        # Create first check-in
        today = date.today()
        response1 = api_client.post(
            f"/api/children/{child.id}/checkins/",
            {"date": str(today), "mood": 3, "behaviors": []},
            format="json",
        )

        # Create second check-in for same date (should update)
        response2 = api_client.post(
            f"/api/children/{child.id}/checkins/",
            {"date": str(today), "mood": 5, "behaviors": []},
            format="json",
        )

        assert response1.status_code == status.HTTP_201_CREATED

        # Debug: print the error if second call fails
        if response2.status_code != status.HTTP_201_CREATED:
            print(f"Response2 error: {response2.data}")

        assert response2.status_code == status.HTTP_201_CREATED

        # Check that only one check-in exists for this date
        checkins = DailyCheckin.objects.filter(child=child, date=today)
        assert checkins.count() == 1
        assert checkins.first().mood == 5  # Updated value


@pytest.mark.django_db
class TestDashboardAPI:
    """Test dashboard data generation."""

    def test_dashboard_with_data(self, api_client, full_user, child):
        """Test dashboard returns correct data."""
        response = api_client.post(
            "/api/auth/users/login/",
            {"email": "test@example.com", "password": "TestPass123!"},
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

        # Create some check-ins
        today = date.today()
        for i in range(3):
            check_date = today - timedelta(days=i)
            DailyCheckin.objects.create(
                child=child,
                date=check_date,
                mood=4 + i % 2,
                behaviors=[
                    {"behavior_id": 1, "done": True},
                    {"behavior_id": 2, "done": False},
                ],
            )

        # Get dashboard
        response = api_client.get(f"/api/children/{child.id}/dashboard/?range=7")

        assert response.status_code == status.HTTP_200_OK
        assert "days" in response.data
        assert "routine_success" in response.data
        assert "mood" in response.data
        assert len(response.data["days"]) == 7


@pytest.mark.django_db
class TestOnboardingFlow:
    """Test complete onboarding flow end-to-end."""

    def test_complete_onboarding_as_guest(self, api_client):
        """Test the full onboarding flow as a guest user."""
        # Step 1: Create guest session
        response = api_client.post("/api/auth/users/guest/")
        assert response.status_code == status.HTTP_201_CREATED
        access_token = response.data["access"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Step 2: Create a child
        response = api_client.post(
            "/api/children/",
            {
                "first_name": "Marie",
                "schooling_stage": "6-13",
                "diagnosed_adhd": "unknown",
            },
        )
        assert response.status_code == status.HTTP_201_CREATED
        child_id = response.data["id"]

        # Step 3: Complete screener
        response = api_client.post(
            f"/api/children/{child_id}/screener/",
            {
                "answers": {
                    "q1": 2,
                    "q2": 2,
                    "q3": 1,
                    "q4": 2,
                    "q5": 1,
                    "q6": 2,
                    "q7": 1,
                    "q8": 2,
                    "q9": 1,
                    "q10": 1,
                }
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["zone"] in ["vert", "orange", "rouge"]

        # Step 4: Set target behaviors
        response = api_client.post(
            f"/api/children/{child_id}/targets/",
            {
                "behaviors": [
                    {"name": "Se brosser les dents"},
                    {"name": "Aller au lit a l'heure"},
                    {"name": "Faire les devoirs"},
                ]
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 3

        # Step 5: Convert to full account
        response = api_client.post(
            "/api/auth/users/convert/",
            {
                "email": "marie.parent@example.com",
                "username": "marieparent",
                "password": "SecurePass123!",
                "password_confirm": "SecurePass123!",
            },
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["user"]["is_guest"] is False

        # Verify all data is preserved
        new_access = response.data["access"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {new_access}")

        response = api_client.get("/api/children/")
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["first_name"] == "Marie"
