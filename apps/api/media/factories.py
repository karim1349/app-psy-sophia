"""
Factory Boy factories for creating media test data.

Provides factories for MediaFile model.
"""

from typing import Any, Dict

import factory
from django.contrib.auth import get_user_model

from .models import MediaFile

User = get_user_model()


class MediaFileFactory(factory.django.DjangoModelFactory):
    """Factory for creating MediaFile instances."""

    class Meta:
        model = MediaFile

    owner = factory.SubFactory("users.factories.UserFactory")
    key = factory.Sequence(lambda n: f"users/1/test_file_{n}.jpg")
    kind = "image"
    visibility = "public"
    mime_type = "image/jpeg"
    size_bytes = 102400  # 100KB
    width = 800
    height = 600
    sha256 = factory.Faker("sha256")
    alt_text = ""
    meta: Dict[str, Any] = {}
