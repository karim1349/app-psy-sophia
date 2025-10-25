"""URL routing for media app."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ConfirmUploadView, MediaFileViewSet, R2CreateUploadView

app_name = "media"

# Create router for viewsets
router = DefaultRouter()
router.register(r"files", MediaFileViewSet, basename="mediafile")

urlpatterns = [
    # Presigned upload creation
    path("r2/create-upload/", R2CreateUploadView.as_view(), name="r2-create-upload"),
    # Upload confirmation
    path("files/confirm/", ConfirmUploadView.as_view(), name="confirm-upload"),
    # ViewSet routes (list, retrieve, destroy)
    path("", include(router.urls)),
]
