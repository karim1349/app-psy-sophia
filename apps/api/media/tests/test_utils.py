"""Tests for media utility functions."""

from django.test import TestCase, override_settings

from media.utils.images import cf_image_url_from_key, origin_url_from_key


class OriginUrlFromKeyTestCase(TestCase):
    """Test cases for origin_url_from_key function."""

    @override_settings(MEDIA_PUBLIC_BASE='https://pub-test.r2.dev')
    def test_basic_url_generation(self):
        """Test basic URL generation."""
        key = 'users/1/test.jpg'
        url = origin_url_from_key(key)

        self.assertEqual(url, 'https://pub-test.r2.dev/users/1/test.jpg')

    @override_settings(MEDIA_PUBLIC_BASE='https://pub-test.r2.dev/')
    def test_trailing_slash_handling(self):
        """Test that trailing slashes are handled correctly."""
        key = 'users/1/test.jpg'
        url = origin_url_from_key(key)

        self.assertEqual(url, 'https://pub-test.r2.dev/users/1/test.jpg')

    @override_settings(MEDIA_PUBLIC_BASE='https://pub-test.r2.dev')
    def test_leading_slash_in_key(self):
        """Test that leading slashes in keys are handled correctly."""
        key = '/users/1/test.jpg'
        url = origin_url_from_key(key)

        self.assertEqual(url, 'https://pub-test.r2.dev/users/1/test.jpg')

    @override_settings(MEDIA_PUBLIC_BASE='https://pub-test.r2.dev')
    def test_special_characters_encoding(self):
        """Test that special characters in keys are URL-encoded."""
        key = 'users/1/test file.jpg'
        url = origin_url_from_key(key)

        self.assertIn('test%20file.jpg', url)

    @override_settings(MEDIA_PUBLIC_BASE='')
    def test_empty_base_returns_empty_string(self):
        """Test that empty MEDIA_PUBLIC_BASE returns empty string."""
        key = 'users/1/test.jpg'
        url = origin_url_from_key(key)

        self.assertEqual(url, '')


class CfImageUrlFromKeyTestCase(TestCase):
    """Test cases for cf_image_url_from_key function."""

    @override_settings(
        MEDIA_PUBLIC_BASE='https://pub-test.r2.dev',
        TRANSFORM_BASE='https://example.com/cdn-cgi/image'
    )
    def test_basic_transformation_url(self):
        """Test basic transformation URL generation."""
        key = 'users/1/test.jpg'
        url = cf_image_url_from_key(key, width=800, fit='cover', fmt='auto')

        self.assertIsNotNone(url)
        self.assertIn('https://example.com/cdn-cgi/image', url)
        self.assertIn('width=800', url)
        self.assertIn('fit=cover', url)
        self.assertIn('format=auto', url)
        self.assertIn('users/1/test.jpg', url)

    @override_settings(
        MEDIA_PUBLIC_BASE='https://pub-test.r2.dev',
        TRANSFORM_BASE='https://example.com/cdn-cgi/image/'
    )
    def test_trailing_slash_in_transform_base(self):
        """Test that trailing slashes in TRANSFORM_BASE are handled."""
        key = 'users/1/test.jpg'
        url = cf_image_url_from_key(key, width=800, fit='cover', fmt='auto')

        # Should not have double slashes
        self.assertNotIn('//', url.replace('https://', ''))

    @override_settings(
        MEDIA_PUBLIC_BASE='https://pub-test.r2.dev',
        TRANSFORM_BASE='https://example.com/cdn-cgi/image'
    )
    def test_custom_parameters(self):
        """Test custom transformation parameters."""
        key = 'users/1/test.jpg'
        url = cf_image_url_from_key(key, width=400, fit='contain', fmt='webp')

        self.assertIn('width=400', url)
        self.assertIn('fit=contain', url)
        self.assertIn('format=webp', url)

    @override_settings(
        MEDIA_PUBLIC_BASE='https://pub-test.r2.dev',
        TRANSFORM_BASE=''
    )
    def test_fallback_to_origin_when_no_transform_base(self):
        """Test fallback to origin URL when TRANSFORM_BASE not set."""
        key = 'users/1/test.jpg'
        url = cf_image_url_from_key(key, width=800, fit='cover', fmt='auto')

        # Should return origin URL
        self.assertEqual(url, 'https://pub-test.r2.dev/users/1/test.jpg')

    @override_settings(
        MEDIA_PUBLIC_BASE='',
        TRANSFORM_BASE='https://example.com/cdn-cgi/image'
    )
    def test_none_when_no_media_public_base(self):
        """Test returns None when MEDIA_PUBLIC_BASE not set."""
        key = 'users/1/test.jpg'
        url = cf_image_url_from_key(key, width=800, fit='cover', fmt='auto')

        self.assertIsNone(url)
