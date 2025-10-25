"""Signal handlers for media file cleanup."""

import logging
from typing import Any

from django.conf import settings
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import MediaFile

logger = logging.getLogger(__name__)


def get_s3_client():
    """
    Create and return an S3 client configured for R2.

    Returns:
        Configured boto3 S3 client
    """
    try:
        import boto3  # type: ignore[import-untyped]

        return boto3.client(
            "s3",
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
            aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
            region_name=settings.AWS_S3_REGION_NAME,
        )
    except ImportError:
        logger.warning("boto3 not available, R2 file deletion will be skipped")
        return None


@receiver(pre_delete, sender=MediaFile)
def delete_file_from_r2(
    sender: type[MediaFile], instance: MediaFile, **kwargs: Any
) -> None:
    """
    Delete the file from R2 storage when MediaFile is deleted.

    Args:
        sender: The model class (MediaFile)
        instance: The MediaFile instance being deleted
        **kwargs: Additional signal arguments
    """
    if not instance.key:
        logger.warning("MediaFile %s has no key, skipping R2 deletion", instance.id)
        return

    s3_client = get_s3_client()
    if not s3_client:
        logger.warning("S3 client not available, skipping R2 deletion")
        return

    try:
        s3_client.delete_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=instance.key,
        )

        logger.info("Successfully deleted R2 object: %s", instance.key)

    except Exception as e:
        try:
            from botocore.exceptions import ClientError  # type: ignore[import-untyped]

            if isinstance(e, ClientError):
                error_code = e.response.get("Error", {}).get("Code", "Unknown")
                # Don't fail deletion if object doesn't exist
                if error_code == "NoSuchKey":
                    logger.warning(
                        "R2 object not found during deletion: %s", instance.key
                    )
                else:
                    logger.error(
                        "Failed to delete R2 object %s: %s",
                        instance.key,
                        str(e),
                        exc_info=True,
                    )
            else:
                raise
        except ImportError:
            logger.error(
                "Failed to delete R2 object %s: %s",
                instance.key,
                str(e),
                exc_info=True,
            )
        # Don't raise - allow DB deletion to proceed even if R2 deletion fails
