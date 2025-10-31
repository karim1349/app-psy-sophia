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


class Module(models.Model):
    """
    A coaching module (e.g., Special Time, Effective Commands).

    Modules have unlock rules and are completed in sequence.
    """

    key = models.CharField(
        _("key"),
        max_length=50,
        unique=True,
        help_text=_("Unique identifier for the module (e.g., 'special_time')"),
    )

    title = models.CharField(
        _("title"),
        max_length=100,
        help_text=_("Display title of the module"),
    )

    order_index = models.IntegerField(
        _("order index"),
        default=0,
        help_text=_("Order in which modules are presented"),
    )

    completion_rules = models.JSONField(
        _("completion rules"),
        default=dict,
        blank=True,
        help_text=_(
            "Criteria to mark module as passed (e.g., {'sessions_21d': 6, 'liked_last6': 4})"
        ),
    )

    is_active = models.BooleanField(
        _("is active"),
        default=True,
        help_text=_("Whether this module is available to users"),
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
        verbose_name = _("module")
        verbose_name_plural = _("modules")
        ordering = ["order_index", "created_at"]
        indexes = [
            models.Index(fields=["key"]),
            models.Index(fields=["order_index"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.key})"


class ModuleProgress(models.Model):
    """
    Tracks a child's progress through a module.

    State transitions: locked → unlocked → passed
    """

    STATE_CHOICES = [
        ("locked", _("Locked - prerequisites not met")),
        ("unlocked", _("Unlocked - available to start")),
        ("passed", _("Passed - module completed successfully")),
    ]

    child = models.ForeignKey(
        Child,
        on_delete=models.CASCADE,
        related_name="module_progress",
        verbose_name=_("child"),
    )

    module = models.ForeignKey(
        Module,
        on_delete=models.CASCADE,
        related_name="child_progress",
        verbose_name=_("module"),
    )

    state = models.CharField(
        _("state"),
        max_length=10,
        choices=STATE_CHOICES,
        default="locked",
        help_text=_("Current state of this module for this child"),
    )

    counters = models.JSONField(
        _("counters"),
        default=dict,
        help_text=_(
            "Module-specific counters (e.g., sessions_21d, liked_last6, goal_per_week)"
        ),
    )

    passed_at = models.DateTimeField(
        _("passed at"),
        null=True,
        blank=True,
        help_text=_("When the module was completed"),
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
        verbose_name = _("module progress")
        verbose_name_plural = _("module progress")
        unique_together = [["child", "module"]]
        ordering = ["module__order_index", "-created_at"]
        indexes = [
            models.Index(fields=["child", "state"]),
            models.Index(fields=["module"]),
        ]

    def __str__(self) -> str:
        return f"{self.child} - {self.module.title} ({self.state})"


class SpecialTimeSession(models.Model):
    """
    A session of Special Time (Moment Spécial) logged by the parent.

    Special Time is 10-20 minutes of child-led, 1-on-1 play time.
    """

    child = models.ForeignKey(
        Child,
        on_delete=models.CASCADE,
        related_name="special_time_sessions",
        verbose_name=_("child"),
    )

    datetime = models.DateTimeField(
        _("datetime"),
        help_text=_("When the session occurred (auto now if not provided)"),
    )

    duration_min = models.IntegerField(
        _("duration (minutes)"),
        validators=[MinValueValidator(5), MaxValueValidator(60)],
        help_text=_("Duration of the session in minutes (5-60)"),
    )

    activity = models.CharField(
        _("activity"),
        max_length=200,
        blank=True,
        help_text=_("What activity the child chose (e.g., 'Lego', 'Drawing')"),
    )

    child_enjoyed = models.BooleanField(
        _("child enjoyed"),
        help_text=_("Whether the child appeared to enjoy the session"),
    )

    notes = models.TextField(
        _("notes"),
        blank=True,
        help_text=_("Optional notes about the session"),
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
        verbose_name = _("special time session")
        verbose_name_plural = _("special time sessions")
        ordering = ["-datetime"]
        indexes = [
            models.Index(fields=["child", "datetime"]),
            models.Index(fields=["datetime"]),
        ]

    def __str__(self) -> str:
        enjoyed = "✓" if self.child_enjoyed else "✗"
        return f"Special Time for {self.child} on {self.datetime.date()} ({self.duration_min}min) {enjoyed}"


class EffectiveCommandObjective(models.Model):
    """
    An objective for the Effective Commands module.

    Represents a specific command the parent wants to improve
    (e.g., 'Aller se brosser les dents', 'Se mettre en pyjama').
    """

    child = models.ForeignKey(
        Child,
        on_delete=models.CASCADE,
        related_name="effective_command_objectives",
        verbose_name=_("child"),
    )

    label = models.CharField(
        _("label"),
        max_length=100,
        help_text=_("Description of the command (e.g., 'Aller se brosser les dents')"),
    )

    is_active = models.BooleanField(
        _("is active"),
        default=True,
        help_text=_("Whether this objective is currently being tracked"),
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
        verbose_name = _("effective command objective")
        verbose_name_plural = _("effective command objectives")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["child"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self) -> str:
        status = "active" if self.is_active else "inactive"
        return f"{self.label} for {self.child} ({status})"


class EffectiveCommandLog(models.Model):
    """
    Daily log entry for tracking effective command usage.

    Records whether parent gave an effective command and the outcome.
    Unique per child, objective, and date.
    """

    COMPLETION_CHOICES = [
        ("first_try", _("Yes, first try")),
        ("not_directly", _("Yes but not directly")),
        ("not_completed", _("No, they didn't do it")),
    ]

    FAILURE_REASON_CHOICES = [
        ("distractions", _("There were distractions around")),
        ("no_contact", _("Contact (visual and touch) was not made")),
        ("no_repeat", _("I didn't ask the child to repeat the command")),
        ("unsure_command", _("I wasn't sure of my command")),
        ("too_complex", _("The command was too complex")),
    ]

    child = models.ForeignKey(
        Child,
        on_delete=models.CASCADE,
        related_name="effective_command_logs",
        verbose_name=_("child"),
    )

    objective = models.ForeignKey(
        EffectiveCommandObjective,
        on_delete=models.CASCADE,
        related_name="logs",
        verbose_name=_("objective"),
    )

    date = models.DateField(
        _("date"),
        help_text=_("Date of this log entry"),
    )

    gave_effective_command = models.BooleanField(
        _("gave effective command"),
        help_text=_("Whether the parent gave an effective command"),
    )

    child_completed = models.CharField(
        _("child completed"),
        max_length=20,
        choices=COMPLETION_CHOICES,
        null=True,
        blank=True,
        help_text=_("How the child responded (if gave_effective_command is True)"),
    )

    repetitions_count = models.IntegerField(
        _("repetitions count"),
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        help_text=_("Number of times the command was repeated (for 'not_directly')"),
    )

    failure_reason = models.CharField(
        _("failure reason"),
        max_length=20,
        choices=FAILURE_REASON_CHOICES,
        null=True,
        blank=True,
        help_text=_("Reason the child didn't complete (for 'not_completed')"),
    )

    notes = models.TextField(
        _("notes"),
        blank=True,
        help_text=_("Optional notes about this log entry"),
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
        verbose_name = _("effective command log")
        verbose_name_plural = _("effective command logs")
        unique_together = [["child", "objective", "date"]]
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["child", "date"]),
            models.Index(fields=["objective", "date"]),
            models.Index(fields=["date"]),
        ]

    def __str__(self) -> str:
        gave = "✓" if self.gave_effective_command else "✗"
        return f"Log for {self.objective.label} on {self.date} ({gave})"


class AngerCrisisLog(models.Model):
    """
    Log entry for tracking anger crisis management.

    Records when a crisis occurred and how the parent intervened.
    Used to track progress in the Anger Management module.
    """

    INTERVENTION_STAGE_CHOICES = [
        ("before", _("Before the crisis")),
        ("during", _("During the crisis")),
        ("after", _("After the crisis")),
        ("none", _("No intervention")),
    ]

    TECHNIQUE_CHOICES = [
        # Before crisis techniques
        ("observe_signs", _("Observe non-verbal signs")),
        ("cushion_punch", _("Punch a cushion")),
        ("sensory_activity", _("Sensory activity")),
        ("calm_activity", _("Calm activity")),
        ("discussion", _("Discussion")),
        # During crisis techniques
        ("isolate", _("Isolate the child")),
        ("stay_calm", _("Stay calm")),
        ("no_escalation", _("Avoid escalation")),
        # After crisis techniques
        ("awareness", _("Raise awareness")),
        ("discuss_alternatives", _("Discuss alternatives")),
        ("teach_techniques", _("Teach techniques")),
    ]

    child = models.ForeignKey(
        Child,
        on_delete=models.CASCADE,
        related_name="anger_crisis_logs",
        verbose_name=_("child"),
    )

    date = models.DateField(
        _("date"),
        help_text=_("Date when the crisis occurred"),
    )

    time = models.TimeField(
        _("time"),
        null=True,
        blank=True,
        help_text=_("Optional time when the crisis occurred"),
    )

    intervention_stage = models.CharField(
        _("intervention stage"),
        max_length=20,
        choices=INTERVENTION_STAGE_CHOICES,
        help_text=_("At which stage did the parent intervene"),
    )

    techniques_used = models.JSONField(
        _("techniques used"),
        default=list,
        help_text=_("List of technique keys that were used"),
    )

    was_successful = models.BooleanField(
        _("was successful"),
        help_text=_("Whether the intervention was successful"),
    )

    notes = models.TextField(
        _("notes"),
        blank=True,
        default="",
        help_text=_("Optional notes about this crisis"),
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
        verbose_name = _("anger crisis log")
        verbose_name_plural = _("anger crisis logs")
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["child", "date"]),
            models.Index(fields=["child", "was_successful"]),
        ]

    def __str__(self) -> str:
        success = "✓" if self.was_successful else "✗"
        return f"Crisis log for {self.child.first_name or 'Child'} on {self.date} ({success})"


class TimeOutLog(models.Model):
    """
    Log entry for tracking time-out usage.

    Records daily whether parent needed to use time-out and if it was successful.
    Used to track progress in the Time Out module.
    """

    FAILURE_REASON_CHOICES = [
        ("negotiation", _("Child kept negotiating")),
        ("time_not_respected", _("Time was not respected")),
    ]

    child = models.ForeignKey(
        Child,
        on_delete=models.CASCADE,
        related_name="timeout_logs",
        verbose_name=_("child"),
    )

    date = models.DateField(
        _("date"),
        help_text=_("Date of this log entry"),
    )

    needed_timeout = models.BooleanField(
        _("needed timeout"),
        help_text=_("Did the parent need to use time-out today?"),
    )

    was_successful = models.BooleanField(
        _("was successful"),
        null=True,
        blank=True,
        help_text=_("Did the time-out work? (only if needed)"),
    )

    failure_reason = models.CharField(
        _("failure reason"),
        max_length=20,
        choices=FAILURE_REASON_CHOICES,
        null=True,
        blank=True,
        help_text=_("Why didn't it work? (only if unsuccessful)"),
    )

    notes = models.TextField(
        _("notes"),
        blank=True,
        default="",
        help_text=_("Optional notes about this time-out"),
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
        verbose_name = _("time-out log")
        verbose_name_plural = _("time-out logs")
        unique_together = [["child", "date"]]
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["child", "date"]),
            models.Index(fields=["child", "was_successful"]),
        ]

    def __str__(self) -> str:
        if not self.needed_timeout:
            return f"Time-out log for {self.child.first_name or 'Child'} on {self.date} (not needed)"
        success = "✓" if self.was_successful else "✗"
        return f"Time-out log for {self.child.first_name or 'Child'} on {self.date} ({success})"
