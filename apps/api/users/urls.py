"""
Simple URL patterns for user endpoints using ViewSet router.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import UserViewSet

app_name = "users"

# Create router for UserViewSet
router = DefaultRouter()
router.register(r"", UserViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
]
