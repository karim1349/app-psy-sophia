"""
Models for the coaching (onboarding) app.

Includes Child, Screener, TargetBehavior, and DailyCheckin models
for tracking child development and behavioral coaching.
"""

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class Child(models.Model):
    """
    Child profile for coaching and behavior tracking.

    Each child belongs to a parent (User) and has schooling stage info.
    """

    SCHOOLING_STAGE_CHOICES = [
        ("preK", _("Pre-kindergarten (0-6 ans)")),
        ("6-13", _("Elementary/Middle (6-13 ans)")),
        ("13-18", _("Secondary (13-18 ans)")),
    ]

    DIAGNOSED_ADHD_CHOICES = [
        ("yes", _("Yes")),
        ("no", _("No")),
        ("unknown", _("Unknown / Not sure")),
    ]

    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="children",
        verbose_name=_("parent"),
    )

    first_name = models.CharField(
        _("first name"),
        max_length=50,
        blank=True,
        null=True,
        help_text=_("Optional first name of the child"),
    )

    schooling_stage = models.CharField(
        _("schooling stage"),
        max_length=10,
        choices=SCHOOLING_STAGE_CHOICES,
        help_text=_("Current schooling stage of the child"),
    )

    diagnosed_adhd = models.CharField(
        _("diagnosed ADHD"),
        max_length=10,
        choices=DIAGNOSED_ADHD_CHOICES,
        default="unknown",
        help_text=_("Whether the child has been diagnosed with ADHD"),
    )

    created_at = models.DateTimeField(
        _("created at"),
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        _("updated at"),
        auto_now=True,
    )

    class Meta:
        verbose_name = _("child")
        verbose_name_plural = _("children")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["parent"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        if self.first_name:
            return f"{self.first_name} (Parent: {self.parent.email or self.parent.id})"
        return f"Child {self.id} (Parent: {self.parent.email or self.parent.id})"


class Screener(models.Model):
    """
    ADHD screening assessment for a child.

    Stores answers as JSON and computes a zone (vert/orange/rouge)
    based on the total score.
    """

    ZONE_CHOICES = [
        ("vert", _("Green - Low concern")),
        ("orange", _("Orange - Moderate concern")),
        ("rouge", _("Red - High concern")),
    ]

    child = models.ForeignKey(
        Child,
        on_delete=models.CASCADE,
        related_name="screeners",
        verbose_name=_("child"),
    )

    instrument = models.CharField(
        _("instrument"),
        max_length=50,
        default="mini_adhd_v1",
        help_text=_("Name/version of the screening instrument used"),
    )

    answers = models.JSONField(
        _("answers"),
        help_text=_("Responses to screening questions (JSON)"),
    )

    total_score = models.IntegerField(
        _("total score"),
        validators=[MinValueValidator(0)],
        help_text=_("Sum of all question scores"),
    )

    zone = models.CharField(
        _("zone"),
        max_length=10,
        choices=ZONE_CHOICES,
        help_text=_("Risk zone: vert (<=10), orange (11-20), rouge (>20)"),
    )

    created_at = models.DateTimeField(
        _("created at"),
        auto_now_add=True,
    )

    class Meta:
        verbose_name = _("screener")
        verbose_name_plural = _("screeners")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["child"]),
            models.Index(fields=["zone"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"Screener for {self.child} - {self.zone} ({self.total_score})"


class TargetBehavior(models.Model):
    """
    A behavior the parent wants to improve (e.g., 'brush teeth', 'bedtime').

    Limited to 3 per child.
    """

    child = models.ForeignKey(
        Child,
        on_delete=models.CASCADE,
        related_name="target_behaviors",
        verbose_name=_("child"),
    )

    name = models.CharField(
        _("behavior name"),
        max_length=100,
        help_text=_("Short description of the target behavior"),
    )

    active = models.BooleanField(
        _("active"),
        default=True,
        help_text=_("Whether this behavior is currently being tracked"),
    )

    created_at = models.DateTimeField(
        _("created at"),
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        _("updated at"),
        auto_now=True,
    )

    class Meta:
        verbose_name = _("target behavior")
        verbose_name_plural = _("target behaviors")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["child"]),
            models.Index(fields=["active"]),
        ]

    def __str__(self) -> str:
        status = "active" if self.active else "inactive"
        return f"{self.name} for {self.child} ({status})"


class DailyCheckin(models.Model):
    """
    Daily check-in for tracking mood and behavior completion.

    Unique per child per date.
    """

    child = models.ForeignKey(
        Child,
        on_delete=models.CASCADE,
        related_name="daily_checkins",
        verbose_name=_("child"),
    )

    date = models.DateField(
        _("date"),
        help_text=_("Date of this check-in"),
    )

    mood = models.IntegerField(
        _("mood"),
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text=_("Child mood on a scale of 1-5"),
    )

    behaviors = models.JSONField(
        _("behaviors"),
        default=list,
        help_text=_("List of behavior completions: [{behavior_id, done}, ...]"),
    )

    notes = models.TextField(
        _("notes"),
        blank=True,
        null=True,
        help_text=_("Optional notes from the parent"),
    )

    created_at = models.DateTimeField(
        _("created at"),
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        _("updated at"),
        auto_now=True,
    )

    class Meta:
        verbose_name = _("daily check-in")
        verbose_name_plural = _("daily check-ins")
        ordering = ["-date"]
        unique_together = [["child", "date"]]
        indexes = [
            models.Index(fields=["child", "date"]),
            models.Index(fields=["date"]),
        ]

    def __str__(self) -> str:
        return f"Check-in for {self.child} on {self.date} (mood: {self.mood})"
