"""
URL routing for deals app using DefaultRouter.

Following the established patterns with proper namespacing
and comprehensive endpoint coverage.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CommentViewSet, DealCategoryViewSet, DealViewSet

app_name = "deals"

# Create router and register viewsets
router = DefaultRouter()
router.register(r"deals", DealViewSet, basename="deal")
router.register(r"categories", DealCategoryViewSet, basename="category")
router.register(r"comments", CommentViewSet, basename="comment")

urlpatterns = [
    path("", include(router.urls)),
]
