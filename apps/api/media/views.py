"""DRF views for media upload and management."""

import io
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import boto3  # type: ignore[import-untyped]
from botocore.exceptions import ClientError  # type: ignore[import-untyped]
from django.conf import settings
from django.db.models import QuerySet
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .models import MediaFile
from .serializers import (
    ConfirmUploadSerializer,
    CreateUploadRequestSerializer,
    CreateUploadResponseSerializer,
    MediaFileSerializer,
)
from .utils.images import cf_image_url_from_key, origin_url_from_key

# MIME type whitelist for uploads
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
}

# Max file size: 10MB
MAX_FILE_SIZE_BYTES = 10_000_000


class MediaUploadThrottle(UserRateThrottle):
    """Custom throttle for media upload endpoints."""

    rate = "10/hour"


def get_s3_client() -> boto3.client:
    """
    Create and return an S3 client configured for R2.

    Returns:
        Configured boto3 S3 client
    """
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
        region_name=settings.AWS_S3_REGION_NAME,
    )


class R2CreateUploadView(APIView):
    """
    POST endpoint to generate presigned upload URL for R2.

    Returns presigned POST data that clients use to upload directly to R2.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [MediaUploadThrottle]
    serializer_class = CreateUploadRequestSerializer

    def post(self, request: Request) -> Response:
        """
        Generate presigned upload URL.

        Request body:
            - filename: Name of the file
            - content_type: MIME type

        Returns:
            - key: R2 object key
            - upload_url: Presigned POST URL
            - upload_fields: Form fields for the upload
            - origin_url: Direct URL to the uploaded file
            - cf_image_url: Cloudflare transformed URL (if image)
        """
        serializer = CreateUploadRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        filename = serializer.validated_data["filename"]
        content_type = serializer.validated_data["content_type"]

        # Validate MIME type
        if content_type not in ALLOWED_MIME_TYPES:
            allowed = ", ".join(ALLOWED_MIME_TYPES)
            return Response(
                {"error": f"Content type not allowed. Allowed types: {allowed}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build object key: users/<user_id>/<timestamp>_<filename>
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        key = f"users/{request.user.id}/{timestamp}_{filename}"

        try:
            s3_client = get_s3_client()

            # Generate presigned POST
            presigned_post = s3_client.generate_presigned_post(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=key,
                Fields={
                    "Content-Type": content_type,
                },
                Conditions=[
                    {"Content-Type": content_type},
                    ["content-length-range", 0, MAX_FILE_SIZE_BYTES],
                ],
                ExpiresIn=600,  # 10 minutes
            )

            # Build response URLs
            origin = origin_url_from_key(key)
            cf_url = None
            if content_type.startswith("image/"):
                cf_url = cf_image_url_from_key(key, width=800, fit="cover", fmt="auto")

            response_data = {
                "key": key,
                "upload_url": presigned_post["url"],
                "upload_fields": presigned_post["fields"],
                "origin_url": origin,
                "cf_image_url": cf_url,
            }

            response_serializer = CreateUploadResponseSerializer(data=response_data)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except ClientError as e:
            return Response(
                {"error": f"Failed to generate upload URL: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ConfirmUploadView(APIView):
    """
    POST endpoint to confirm a successful upload and create MediaFile record.

    Verifies the file exists in R2 and creates a database record.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [MediaUploadThrottle]
    serializer_class = ConfirmUploadSerializer

    def post(self, request: Request) -> Response:
        """
        Confirm upload and create MediaFile record.

        Request body:
            - key: R2 object key
            - mime_type: MIME type of the uploaded file

        Returns:
            MediaFile object with URLs
        """
        serializer = ConfirmUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        key = serializer.validated_data["key"]
        mime_type = serializer.validated_data["mime_type"]

        # Validate MIME type
        if mime_type not in ALLOWED_MIME_TYPES:
            return Response(
                {"error": "Invalid MIME type"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            s3_client = get_s3_client()

            # Verify file exists and get metadata
            head_response = s3_client.head_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=key,
            )

            content_length = head_response.get("ContentLength", 0)
            actual_content_type = head_response.get("ContentType", mime_type)

            # Verify content type matches
            if actual_content_type not in ALLOWED_MIME_TYPES:
                return Response(
                    {"error": "Uploaded file MIME type does not match allowed types"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Determine kind
            kind = "image" if mime_type.startswith("image/") else "file"

            # Optional: probe image dimensions (requires Pillow)
            width: Optional[int] = None
            height: Optional[int] = None

            if kind == "image":
                try:
                    from PIL import Image

                    # Download first few KB to get dimensions
                    response = s3_client.get_object(
                        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                        Key=key,
                        Range="bytes=0-50000",  # First 50KB should be enough
                    )
                    img_data = response["Body"].read()
                    img = Image.open(io.BytesIO(img_data))
                    width, height = img.size
                except (ImportError, Exception):
                    # Pillow not available or image probe failed - continue without dimensions
                    pass

            # Create or update MediaFile record
            media_file, created = MediaFile.objects.update_or_create(
                key=key,
                defaults={
                    "owner": request.user,
                    "kind": kind,
                    "visibility": "public",
                    "mime_type": actual_content_type,
                    "size_bytes": content_length,
                    "width": width,
                    "height": height,
                    "uploaded_at": timezone.now(),
                },
            )

            # Return serialized response
            response_serializer = MediaFileSerializer(media_file)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )

        except s3_client.exceptions.NoSuchKey:
            return Response(
                {"error": "File not found in storage"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ClientError as e:
            return Response(
                {"error": f"Failed to verify upload: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MediaFileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MediaFile CRUD operations.

    - list: Get user's media files
    - retrieve: Get a specific media file
    - destroy: Delete a media file (also deletes from R2)
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MediaFileSerializer
    queryset = MediaFile.objects.all()

    def get_queryset(self) -> QuerySet[MediaFile]:
        """Filter to only show user's own files."""
        # request.user is guaranteed to be authenticated due to permission_classes
        return MediaFile.objects.filter(owner=self.request.user.id)  # type: ignore[misc]

    def perform_destroy(self, instance: MediaFile) -> None:
        """
        Delete the MediaFile and its corresponding R2 object.

        The signal handler will take care of R2 deletion.
        """
        instance.delete()
