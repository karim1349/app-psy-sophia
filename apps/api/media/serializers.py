"""DRF serializers for media files."""

from rest_framework import serializers

from .models import MediaFile


class MediaFileSerializer(serializers.ModelSerializer):
    """
    Serializer for MediaFile model with computed URL fields.

    Includes both origin_url (direct R2) and cf_image_url (with transformations).
    """

    origin_url: serializers.SerializerMethodField = serializers.SerializerMethodField()
    cf_image_url: serializers.SerializerMethodField = serializers.SerializerMethodField()
    owner: serializers.PrimaryKeyRelatedField = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = MediaFile
        fields = [
            'id',
            'key',
            'origin_url',
            'cf_image_url',
            'mime_type',
            'size_bytes',
            'width',
            'height',
            'kind',
            'visibility',
            'alt_text',
            'created_at',
            'uploaded_at',
            'owner',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'uploaded_at',
            'owner',
        ]

    def get_origin_url(self, obj: MediaFile) -> str:
        """Get the direct R2 public URL."""
        return obj.origin_url

    def get_cf_image_url(self, obj: MediaFile) -> str:
        """
        Get the Cloudflare transformed image URL with default parameters.

        Returns empty string if not an image or transformations not configured.
        """
        if obj.kind != 'image':
            return ''

        url = obj.cf_image_url(width=800, fit='cover', fmt='auto')
        return url or obj.origin_url  # Fallback to origin if transform unavailable


class CreateUploadRequestSerializer(serializers.Serializer):
    """
    Input serializer for requesting a presigned upload URL.
    """

    filename = serializers.CharField(
        max_length=255,
        help_text='Name of the file to upload'
    )
    content_type = serializers.CharField(
        max_length=100,
        help_text='MIME type of the file'
    )


class CreateUploadResponseSerializer(serializers.Serializer):
    """
    Response serializer for presigned upload URL data.
    """

    key = serializers.CharField(
        help_text='R2 object key where the file will be stored'
    )
    upload_url = serializers.URLField(
        help_text='Presigned POST URL for uploading'
    )
    upload_fields = serializers.DictField(
        help_text='Form fields to include in the upload POST request'
    )
    origin_url = serializers.URLField(
        help_text='Direct URL where the file will be accessible after upload'
    )
    cf_image_url = serializers.URLField(
        required=False,
        allow_null=True,
        help_text='Cloudflare transformed image URL (for images only)'
    )


class ConfirmUploadSerializer(serializers.Serializer):
    """
    Input serializer for confirming a successful upload.
    """

    key = serializers.CharField(
        max_length=500,
        help_text='R2 object key of the uploaded file'
    )
    mime_type = serializers.CharField(
        max_length=100,
        help_text='MIME type of the uploaded file'
    )
