import pytest
from django.contrib.auth import get_user_model


User = get_user_model()


@pytest.mark.unit
@pytest.mark.django_db
class TestUserModel:
    """Unit tests for User model."""

    def test_create_user(self):
        """Test creating a regular user."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.check_password('testpass123')
        assert user.is_active
        assert not user.is_staff
        assert not user.is_superuser

    def test_create_superuser(self):
        """Test creating a superuser."""
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        assert admin.username == 'admin'
        assert admin.is_active
        assert admin.is_staff
        assert admin.is_superuser

    def test_user_str_representation(self):
        """Test user string representation."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        assert str(user) == 'testuser'
