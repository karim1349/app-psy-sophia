"""
Module unlock engine for sequential progression.

Handles initialization and unlocking of modules based on completion.
"""

from typing import Optional
from django.utils import timezone
from .models import Child, Module, ModuleProgress


def initialize_module_progress(child: Child) -> None:
    """
    Initialize module progress for a child.

    Called after onboarding completes. Sets up all modules:
    - First module (order_index=1) → state='unlocked'
    - All other modules → state='locked'

    Args:
        child: The child instance to initialize modules for
    """
    # Get all active modules ordered by order_index
    modules = Module.objects.filter(is_active=True).order_by("order_index")

    for i, module in enumerate(modules):
        # Check if progress already exists
        progress, created = ModuleProgress.objects.get_or_create(
            child=child,
            module=module,
            defaults={
                "state": "unlocked" if i == 0 else "locked",
                "counters": {},
            },
        )

        if created:
            print(
                f"✅ Created progress for {child} - {module.title} (state: {progress.state})"
            )
        else:
            print(f"ℹ️  Progress already exists for {child} - {module.title}")


def check_and_unlock_next_module(
    child: Child, current_module: Module
) -> Optional[ModuleProgress]:
    """
    When a module is marked as 'passed', unlock the next module.

    Args:
        child: The child who completed the module
        current_module: The module that was just completed

    Returns:
        The ModuleProgress for the next module if unlocked, None otherwise
    """
    # Find the next module (order_index = current + 1)
    next_module = (
        Module.objects.filter(
            is_active=True, order_index__gt=current_module.order_index
        )
        .order_by("order_index")
        .first()
    )

    if not next_module:
        print(f"ℹ️  No next module after {current_module.title}")
        return None

    # Get or create progress for next module
    next_progress, created = ModuleProgress.objects.get_or_create(
        child=child,
        module=next_module,
        defaults={
            "state": "unlocked",
            "counters": {},
        },
    )

    # If it exists but is locked, unlock it
    if not created and next_progress.state == "locked":
        next_progress.state = "unlocked"
        next_progress.save()
        print(f"🔓 Unlocked module: {next_module.title} for {child}")
    elif created:
        print(f"🔓 Created and unlocked module: {next_module.title} for {child}")
    else:
        print(f"ℹ️  Module {next_module.title} was already unlocked for {child}")

    return next_progress


def get_previous_module(module: Module) -> Optional[Module]:
    """
    Get the previous module in the sequence.

    Args:
        module: The current module

    Returns:
        The previous module if it exists, None otherwise
    """
    return (
        Module.objects.filter(is_active=True, order_index__lt=module.order_index)
        .order_by("-order_index")
        .first()
    )
