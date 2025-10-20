"""
Management command to seed initial module data.

Usage:
    python manage.py seed_modules
"""

from django.core.management.base import BaseCommand

from coaching.models import Module


class Command(BaseCommand):
    help = "Seed initial module data (Special Time, etc.)"

    def handle(self, *args, **kwargs):
        """Create or update module records."""
        self.stdout.write("Seeding modules...")

        # Create Special Time module
        special_time, created = Module.objects.get_or_create(
            key="special_time",
            defaults={
                "title": "Moment Spécial (Special Time)",
                "order_index": 1,
                "is_active": True,
            },
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(f"✅ Created module: {special_time.title}")
            )
        else:
            self.stdout.write(
                self.style.WARNING(f"⚠️  Module already exists: {special_time.title}")
            )

        # Create Effective Commands module (skeleton)
        effective_commands, created = Module.objects.get_or_create(
            key="effective_commands",
            defaults={
                "title": "Ordres Efficaces (Effective Commands)",
                "order_index": 2,
                "is_active": False,  # Not yet implemented
            },
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ Created module: {effective_commands.title} (inactive)"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"⚠️  Module already exists: {effective_commands.title}"
                )
            )

        self.stdout.write(self.style.SUCCESS("\n✅ Module seeding complete!"))
