"""Tests for media models."""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from media.models import MediaFile

User = get_user_model()


class MediaFileModelTestCase(TestCase):
    """Test cases for MediaFile model."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )

    def test_create_media_file(self):
        """Test creating a MediaFile instance."""
        media_file = MediaFile.objects.create(
            owner=self.user,
            key='users/1/test.jpg',
            kind='image',
            visibility='public',
            mime_type='image/jpeg',
            size_bytes=1024,
            width=800,
            height=600,
        )

        self.assertEqual(media_file.owner, self.user)
        self.assertEqual(media_file.key, 'users/1/test.jpg')
        self.assertEqual(media_file.kind, 'image')
        self.assertEqual(media_file.visibility, 'public')
        self.assertEqual(media_file.mime_type, 'image/jpeg')
        self.assertEqual(media_file.size_bytes, 1024)
        self.assertEqual(media_file.width, 800)
        self.assertEqual(media_file.height, 600)

    def test_unique_key_constraint(self):
        """Test that key must be unique."""
        MediaFile.objects.create(
            owner=self.user,
            key='users/1/test.jpg',
            kind='image',
            mime_type='image/jpeg',
        )

        with self.assertRaises(Exception):
            MediaFile.objects.create(
                owner=self.user,
                key='users/1/test.jpg',
                kind='image',
                mime_type='image/jpeg',
            )

    @override_settings(
        MEDIA_PUBLIC_BASE='https://pub-test.r2.dev',
        TRANSFORM_BASE=''
    )
    def test_origin_url(self):
        """Test origin_url property."""
        media_file = MediaFile.objects.create(
            owner=self.user,
            key='users/1/test.jpg',
            kind='image',
            mime_type='image/jpeg',
        )

        expected_url = 'https://pub-test.r2.dev/users/1/test.jpg'
        self.assertEqual(media_file.origin_url, expected_url)

    @override_settings(
        MEDIA_PUBLIC_BASE='https://pub-test.r2.dev',
        TRANSFORM_BASE='https://example.com/cdn-cgi/image'
    )
    def test_cf_image_url_for_image(self):
        """Test cf_image_url for image files."""
        media_file = MediaFile.objects.create(
            owner=self.user,
            key='users/1/test.jpg',
            kind='image',
            mime_type='image/jpeg',
        )

        url = media_file.cf_image_url(width=800, fit='cover', fmt='auto')
        self.assertIsNotNone(url)
        self.assertIn('https://example.com/cdn-cgi/image', url)
        self.assertIn('width=800', url)
        self.assertIn('fit=cover', url)
        self.assertIn('format=auto', url)
        self.assertIn('users/1/test.jpg', url)

    @override_settings(
        MEDIA_PUBLIC_BASE='https://pub-test.r2.dev',
        TRANSFORM_BASE='https://example.com/cdn-cgi/image'
    )
    def test_cf_image_url_for_non_image(self):
        """Test cf_image_url returns None for non-image files."""
        media_file = MediaFile.objects.create(
            owner=self.user,
            key='users/1/document.pdf',
            kind='file',
            mime_type='application/pdf',
        )

        url = media_file.cf_image_url(width=800, fit='cover', fmt='auto')
        self.assertIsNone(url)

    @override_settings(
        MEDIA_PUBLIC_BASE='https://pub-test.r2.dev',
        TRANSFORM_BASE=''
    )
    def test_cf_image_url_without_transform_base(self):
        """Test cf_image_url returns None when TRANSFORM_BASE not set."""
        media_file = MediaFile.objects.create(
            owner=self.user,
            key='users/1/test.jpg',
            kind='image',
            mime_type='image/jpeg',
        )

        url = media_file.cf_image_url(width=800, fit='cover', fmt='auto')
        self.assertIsNone(url)

    def test_str_method(self):
        """Test string representation."""
        media_file = MediaFile.objects.create(
            owner=self.user,
            key='users/1/test.jpg',
            kind='image',
            mime_type='image/jpeg',
        )

        self.assertEqual(str(media_file), 'image: users/1/test.jpg')

    def test_ordering(self):
        """Test that MediaFiles are ordered by created_at descending."""
        file1 = MediaFile.objects.create(
            owner=self.user,
            key='users/1/file1.jpg',
            kind='image',
            mime_type='image/jpeg',
        )
        file2 = MediaFile.objects.create(
            owner=self.user,
            key='users/1/file2.jpg',
            kind='image',
            mime_type='image/jpeg',
        )

        files = list(MediaFile.objects.all())
        self.assertEqual(files[0], file2)  # Most recent first
        self.assertEqual(files[1], file1)
