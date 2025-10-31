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
                "title": "Moment Spécial",
                "order_index": 1,
                "is_active": True,
                "completion_rules": {"sessions_21d": 6, "liked_last6": 4},
            },
        )

        if not created:
            # Update existing module with completion rules
            special_time.completion_rules = {"sessions_21d": 6, "liked_last6": 4}
            special_time.save()
            self.stdout.write(
                self.style.WARNING(f"⚠️  Updated module: {special_time.title}")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"✅ Created module: {special_time.title}")
            )

        # Create Effective Commands module
        effective_commands, created = Module.objects.get_or_create(
            key="effective_commands",
            defaults={
                "title": "Ordres Efficaces",
                "order_index": 2,
                "is_active": True,
                "completion_rules": {"objectives_count": 3, "days_per_objective": 5},
            },
        )

        if not created:
            # Update existing module
            effective_commands.is_active = True
            effective_commands.completion_rules = {
                "objectives_count": 3,
                "days_per_objective": 5,
            }
            effective_commands.save()
            self.stdout.write(
                self.style.WARNING(f"⚠️  Updated module: {effective_commands.title}")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"✅ Created module: {effective_commands.title}")
            )

        # Create Anger Management module
        anger_management, created = Module.objects.get_or_create(
            key="anger_management",
            defaults={
                "title": "Gestion de la colère",
                "order_index": 3,
                "is_active": True,
                "completion_rules": {"successful_crises": 1},
            },
        )

        if not created:
            # Update existing module
            anger_management.is_active = True
            anger_management.completion_rules = {"successful_crises": 1}
            anger_management.save()
            self.stdout.write(
                self.style.WARNING(f"⚠️  Updated module: {anger_management.title}")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"✅ Created module: {anger_management.title}")
            )

        # Create Time Out module
        timeout, created = Module.objects.get_or_create(
            key="timeout",
            defaults={
                "title": "Time Out",
                "order_index": 4,
                "is_active": True,
                "completion_rules": {"successful_timeouts": 1},
            },
        )

        if not created:
            # Update existing module
            timeout.is_active = True
            timeout.completion_rules = {"successful_timeouts": 1}
            timeout.save()
            self.stdout.write(
                self.style.WARNING(f"⚠️  Updated module: {timeout.title}")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"✅ Created module: {timeout.title}")
            )

        self.stdout.write(self.style.SUCCESS("\n✅ Module seeding complete!"))
