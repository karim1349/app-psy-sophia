"""
Pytest configuration for Django REST API tests.
"""
import pytest
from django.conf import settings


@pytest.fixture(scope='session')
def django_db_setup():
    """
    Custom database setup for tests.
    Uses the default Django test database.
    """
    settings.DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }


@pytest.fixture
def api_client():
    """
    Provides a Django REST framework API client for testing.
    """
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, django_user_model):
    """
    Provides an authenticated API client with a test user.
    """
    user = django_user_model.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )
    api_client.force_authenticate(user=user)
    return api_client, user
