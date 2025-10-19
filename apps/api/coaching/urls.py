"""
URL configuration for coaching app.

Routes for Child, Screener, TargetBehavior, and DailyCheckin.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ChildViewSet,
    DailyCheckinViewSet,
    ScreenerViewSet,
    TargetBehaviorViewSet,
)

router = DefaultRouter()
router.register(r"children", ChildViewSet, basename="child")
router.register(r"screeners", ScreenerViewSet, basename="screener")
router.register(r"target-behaviors", TargetBehaviorViewSet, basename="targetbehavior")
router.register(r"daily-checkins", DailyCheckinViewSet, basename="dailycheckin")

urlpatterns = [
    path("", include(router.urls)),
]
