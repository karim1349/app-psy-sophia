from django.contrib import admin

from .models import (
    Child,
    DailyCheckin,
    Module,
    ModuleProgress,
    Screener,
    SpecialTimeSession,
    TargetBehavior,
)


@admin.register(Child)
class ChildAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "first_name",
        "parent",
        "schooling_stage",
        "diagnosed_adhd",
        "created_at",
    ]
    list_filter = ["schooling_stage", "diagnosed_adhd", "created_at"]
    search_fields = ["first_name", "parent__email"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Screener)
class ScreenerAdmin(admin.ModelAdmin):
    list_display = ["id", "child", "instrument", "total_score", "zone", "created_at"]
    list_filter = ["zone", "instrument", "created_at"]
    search_fields = ["child__first_name"]
    readonly_fields = ["created_at"]


@admin.register(TargetBehavior)
class TargetBehaviorAdmin(admin.ModelAdmin):
    list_display = ["id", "child", "name", "active", "created_at"]
    list_filter = ["active", "created_at"]
    search_fields = ["name", "child__first_name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(DailyCheckin)
class DailyCheckinAdmin(admin.ModelAdmin):
    list_display = ["id", "child", "date", "mood", "created_at"]
    list_filter = ["date", "mood", "created_at"]
    search_fields = ["child__first_name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ["id", "key", "title", "order_index", "is_active", "created_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["key", "title"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ModuleProgress)
class ModuleProgressAdmin(admin.ModelAdmin):
    list_display = ["id", "child", "module", "state", "passed_at", "created_at"]
    list_filter = ["state", "module", "created_at"]
    search_fields = ["child__first_name", "module__title"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(SpecialTimeSession)
class SpecialTimeSessionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "child",
        "datetime",
        "duration_min",
        "child_enjoyed",
        "created_at",
    ]
    list_filter = ["child_enjoyed", "datetime", "created_at"]
    search_fields = ["child__first_name", "activity"]
    readonly_fields = ["created_at", "updated_at"]
