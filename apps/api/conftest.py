"""
Pytest configuration for Django REST API tests.
"""

from typing import Any, Generator, Tuple

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient

UserModel = get_user_model()


@pytest.fixture(scope="session")
def django_db_setup() -> None:
    """
    Custom database setup for tests.
    Uses the default Django test database.
    """
    settings.DATABASES["default"] = {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
        "ATOMIC_REQUESTS": False,
    }


@pytest.fixture(autouse=True)
def clear_cache() -> Generator[None, None, None]:
    """
    Clear Django cache before each test to prevent rate limiting issues.
    """
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client() -> APIClient:
    """
    Provides a Django REST framework API client for testing.
    """
    return APIClient()


@pytest.fixture
def authenticated_client(
    api_client: APIClient, django_user_model: Any
) -> Tuple[APIClient, Any]:
    """
    Provides an authenticated API client with a test user.
    """
    user = django_user_model.objects.create_user(
        username="testuser", email="test@example.com", password="testpass123"
    )
    api_client.force_authenticate(user=user)
    return api_client, user
