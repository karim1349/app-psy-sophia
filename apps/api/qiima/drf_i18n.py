"""
Django Rest Framework i18n Error Code Patching

This module patches DRF's default error messages to use i18n keys instead of
plain English messages. This allows the frontend to translate errors based on
the user's language preference.

The patch is applied globally at startup and affects all serializers.
"""

from rest_framework import serializers


def patch_drf_error_messages() -> None:
    """
    Patch all DRF field classes to use i18n keys in their error messages.

    This function modifies the default_error_messages class attribute for each
    DRF field type to use i18n keys (e.g., 'validation.required') instead of
    plain text messages (e.g., 'This field is required').

    The frontend receives these keys and translates them based on the user's
    selected language.

    Call this once at startup (in __init__.py or apps.py).
    """

    # Base Field - applies to all field types
    serializers.Field.default_error_messages.update(
        {
            "required": "validation.required",
            "null": "validation.required",
        }
    )

    # CharField and subclasses (EmailField, URLField, etc. inherit these)
    serializers.CharField.default_error_messages.update(
        {
            "blank": "validation.required",
            "max_length": "validation.maxLength",
            "min_length": "validation.minLength",
        }
    )

    # EmailField - specific email validation
    serializers.EmailField.default_error_messages.update(
        {
            "invalid": "validation.email",
        }
    )

    # IntegerField
    serializers.IntegerField.default_error_messages.update(
        {
            "invalid": "validation.invalidNumber",
            "max_value": "validation.maxValue",
            "min_value": "validation.minValue",
            "max_string_length": "validation.invalidNumber",
        }
    )

    # FloatField
    serializers.FloatField.default_error_messages.update(
        {
            "invalid": "validation.invalidNumber",
            "max_value": "validation.maxValue",
            "min_value": "validation.minValue",
            "max_string_length": "validation.invalidNumber",
        }
    )

    # DecimalField
    serializers.DecimalField.default_error_messages.update(
        {
            "invalid": "validation.invalidNumber",
            "max_value": "validation.maxValue",
            "min_value": "validation.minValue",
            "max_digits": "validation.invalidNumber",
            "max_decimal_places": "validation.invalidNumber",
            "max_whole_digits": "validation.invalidNumber",
        }
    )

    # BooleanField
    serializers.BooleanField.default_error_messages.update(
        {
            "invalid": "validation.invalidBoolean",
        }
    )

    # ChoiceField
    serializers.ChoiceField.default_error_messages.update(
        {
            "invalid_choice": "validation.invalidChoice",
        }
    )

    # DateField
    serializers.DateField.default_error_messages.update(
        {
            "invalid": "validation.invalidDate",
            "datetime": "validation.invalidDate",
        }
    )

    # DateTimeField
    serializers.DateTimeField.default_error_messages.update(
        {
            "invalid": "validation.invalidDateTime",
            "date": "validation.invalidDateTime",
        }
    )

    # TimeField
    serializers.TimeField.default_error_messages.update(
        {
            "invalid": "validation.invalidTime",
        }
    )

    # DurationField
    serializers.DurationField.default_error_messages.update(
        {
            "invalid": "validation.invalidDuration",
        }
    )

    # FileField
    serializers.FileField.default_error_messages.update(
        {
            "invalid": "validation.invalidFile",
            "required": "validation.required",
            "empty": "validation.required",
            "max_length": "validation.fileMaxSize",
        }
    )

    # ImageField
    serializers.ImageField.default_error_messages.update(
        {
            "invalid_image": "validation.invalidImage",
            "invalid": "validation.invalidFile",
        }
    )

    # URLField
    serializers.URLField.default_error_messages.update(
        {
            "invalid": "validation.invalidUrl",
        }
    )

    # UUIDField
    serializers.UUIDField.default_error_messages.update(
        {
            "invalid": "validation.invalidFormat",
        }
    )

    # IPAddressField
    serializers.IPAddressField.default_error_messages.update(
        {
            "invalid": "validation.invalidIpAddress",
        }
    )

    # ListField
    serializers.ListField.default_error_messages.update(
        {
            "not_a_list": "validation.invalidFormat",
            "empty": "validation.required",
            "min_length": "validation.minLength",
            "max_length": "validation.maxLength",
        }
    )

    # DictField
    serializers.DictField.default_error_messages.update(
        {
            "not_a_dict": "validation.invalidFormat",
        }
    )

    # JSONField
    serializers.JSONField.default_error_messages.update(
        {
            "invalid": "validation.invalidFormat",
        }
    )

    print("✓ DRF error messages patched with i18n keys")


# Alternative: Custom base serializers (optional, for more control)
