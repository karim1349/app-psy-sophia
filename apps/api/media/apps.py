from django.apps import AppConfig


class MediaConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "media"

    def ready(self) -> None:
        """Import signal handlers when app is ready."""
        import media.signals  # noqa: F401
