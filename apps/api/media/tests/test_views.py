"""Tests for media views with mocked boto3."""

from unittest.mock import MagicMock, patch

from botocore.exceptions import ClientError  # type: ignore[import-untyped]
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from media.models import MediaFile

User = get_user_model()


class R2CreateUploadViewTestCase(TestCase):
    """Test cases for R2CreateUploadView."""

    def setUp(self):
        """Set up test data and client."""
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)
        self.url = "/api/media/r2/create-upload/"

    @patch("media.views.get_s3_client")
    @override_settings(
        AWS_STORAGE_BUCKET_NAME="test-bucket",
        MEDIA_PUBLIC_BASE="https://pub-test.r2.dev",
        TRANSFORM_BASE="https://example.com/cdn-cgi/image",
    )
    def test_create_upload_success(self, mock_get_client):
        """Test successful presigned upload creation."""
        # Mock boto3 client
        mock_client = MagicMock()
        mock_client.generate_presigned_post.return_value = {
            "url": "https://test-bucket.r2.cloudflarestorage.com",
            "fields": {
                "key": "users/1/test.jpg",
                "Content-Type": "image/jpeg",
            },
        }
        mock_get_client.return_value = mock_client

        data = {
            "filename": "test.jpg",
            "content_type": "image/jpeg",
        }

        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("key", response.data)
        self.assertIn("upload_url", response.data)
        self.assertIn("upload_fields", response.data)
        self.assertIn("origin_url", response.data)
        self.assertIn("cf_image_url", response.data)

        # Verify key format
        self.assertIn(f"users/{self.user.id}/", response.data["key"])
        self.assertIn("test.jpg", response.data["key"])

    def test_create_upload_unauthorized(self):
        """Test that unauthenticated requests are rejected."""
        self.client.force_authenticate(user=None)

        data = {
            "filename": "test.jpg",
            "content_type": "image/jpeg",
        }

        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_upload_invalid_mime_type(self):
        """Test that invalid MIME types are rejected."""
        data = {
            "filename": "test.pdf",
            "content_type": "application/pdf",
        }

        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    @patch("media.views.get_s3_client")
    def test_create_upload_boto_error(self, mock_get_client):
        """Test handling of boto3 errors."""
        mock_client = MagicMock()
        mock_client.generate_presigned_post.side_effect = ClientError(
            {"Error": {"Code": "AccessDenied", "Message": "Access Denied"}},
            "generate_presigned_post",
        )
        mock_get_client.return_value = mock_client

        data = {
            "filename": "test.jpg",
            "content_type": "image/jpeg",
        }

        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("error", response.data)


class ConfirmUploadViewTestCase(TestCase):
    """Test cases for ConfirmUploadView."""

    def setUp(self):
        """Set up test data and client."""
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)
        self.url = "/api/media/files/confirm/"

    @patch("media.views.get_s3_client")
    def test_confirm_upload_success(self, mock_get_client):
        """Test successful upload confirmation."""
        # Mock boto3 client
        mock_client = MagicMock()
        mock_client.head_object.return_value = {
            "ContentLength": 1024,
            "ContentType": "image/jpeg",
        }
        mock_get_client.return_value = mock_client

        data = {
            "key": f"users/{self.user.id}/test.jpg",
            "mime_type": "image/jpeg",
        }

        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
        self.assertEqual(response.data["key"], data["key"])
        self.assertEqual(response.data["mime_type"], "image/jpeg")

        # Verify MediaFile was created
        media_file = MediaFile.objects.get(key=data["key"])
        self.assertEqual(media_file.owner, self.user)
        self.assertEqual(media_file.kind, "image")
        self.assertEqual(media_file.size_bytes, 1024)

    def test_confirm_upload_unauthorized(self):
        """Test that unauthenticated requests are rejected."""
        self.client.force_authenticate(user=None)

        data = {
            "key": "users/1/test.jpg",
            "mime_type": "image/jpeg",
        }

        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_confirm_upload_invalid_mime_type(self):
        """Test that invalid MIME types are rejected."""
        data = {
            "key": "users/1/test.pdf",
            "mime_type": "application/pdf",
        }

        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("media.views.get_s3_client")
    def test_confirm_upload_file_not_found(self, mock_get_client):
        """Test handling of missing files in R2."""
        mock_client = MagicMock()
        mock_client.exceptions.NoSuchKey = type("NoSuchKey", (Exception,), {})
        mock_client.head_object.side_effect = mock_client.exceptions.NoSuchKey()
        mock_get_client.return_value = mock_client

        data = {
            "key": "users/1/missing.jpg",
            "mime_type": "image/jpeg",
        }

        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class MediaFileViewSetTestCase(TestCase):
    """Test cases for MediaFileViewSet."""

    def setUp(self):
        """Set up test data and client."""
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )
        self.other_user = User.objects.create_user(
            email="other@example.com", username="otheruser", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

        # Create test media files
        self.media_file = MediaFile.objects.create(
            owner=self.user,
            key="users/1/test.jpg",
            kind="image",
            mime_type="image/jpeg",
            size_bytes=1024,
        )
        self.other_media_file = MediaFile.objects.create(
            owner=self.other_user,
            key="users/2/other.jpg",
            kind="image",
            mime_type="image/jpeg",
            size_bytes=2048,
        )

    def test_list_media_files(self):
        """Test listing user's media files."""
        url = "/api/media/files/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.media_file.id))

    def test_retrieve_media_file(self):
        """Test retrieving a specific media file."""
        url = f"/api/media/files/{self.media_file.id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.media_file.id))
        self.assertEqual(response.data["key"], self.media_file.key)

    def test_retrieve_other_user_file_denied(self):
        """Test that users cannot retrieve other users' files."""
        url = f"/api/media/files/{self.other_media_file.id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("media.signals.get_s3_client")
    def test_delete_media_file(self, mock_get_client):
        """Test deleting a media file."""
        # Mock boto3 client for signal handler
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        url = f"/api/media/files/{self.media_file.id}/"
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(MediaFile.objects.filter(id=self.media_file.id).exists())

        # Verify delete was called in signal handler
        mock_client.delete_object.assert_called_once()

    def test_list_unauthorized(self):
        """Test that unauthenticated requests are rejected."""
        self.client.force_authenticate(user=None)

        url = "/api/media/files/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
