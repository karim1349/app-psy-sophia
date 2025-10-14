"""
Business logic layer for DealCategory model operations.

Contains all business logic for category management and validation
following the proxy pattern.
"""

from typing import TYPE_CHECKING, Optional

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models import Count, Q, QuerySet
from django.utils.text import slugify

from ..models import DealCategory

if TYPE_CHECKING:
    from users.models import User
else:
    User = get_user_model()


class CategoryProxy:
    """Business logic layer for DealCategory model operations."""

    def __init__(self) -> None:
        self.model = DealCategory

    def get_by_id(self, category_id: int) -> Optional[DealCategory]:
        """Get category by ID."""
        try:
            return self.model.objects.get(id=category_id)
        except self.model.DoesNotExist:
            return None

    def get_by_slug(self, slug: str) -> Optional[DealCategory]:
        """Get category by slug."""
        try:
            return self.model.objects.get(slug=slug)
        except self.model.DoesNotExist:
            return None

    def get_active_categories(self) -> QuerySet[DealCategory]:
        """Get all active categories."""
        return self.model.objects.filter(is_active=True).order_by("name")

    def get_categories_with_deal_count(self) -> QuerySet[DealCategory]:
        """Get active categories with deal counts."""
        return (
            self.model.objects.filter(is_active=True)
            .annotate(deal_count=Count("deals", filter=Q(deals__status="active")))
            .order_by("name")
        )

    def create_category(
        self,
        name: str,
        icon: str = "",
        color: str = "",
        user: Optional[User] = None,
    ) -> DealCategory:
        """
        Create a new category with validation.

        Args:
            name: Category name
            icon: Optional icon identifier
            color: Optional color code
            user: User creating the category (must be staff)

        Returns:
            DealCategory: Created category instance

        Raises:
            ValidationError: If validation fails
        """
        # Only staff can create categories
        if user and not user.is_staff:
            raise ValidationError("Only staff members can create categories.")

        # Validate name
        if not name or not name.strip():
            raise ValidationError("Category name cannot be empty.")

        name = name.strip()

        if len(name) > 100:
            raise ValidationError("Category name cannot exceed 100 characters.")

        # Check for duplicate names (case-insensitive)
        if self.model.objects.filter(name__iexact=name).exists():
            raise ValidationError("A category with this name already exists.")

        # Generate slug
        slug = slugify(name)
        if not slug:
            raise ValidationError("Category name must contain valid characters.")

        # Ensure slug is unique
        original_slug = slug
        counter = 1
        while self.model.objects.filter(slug=slug).exists():
            slug = f"{original_slug}-{counter}"
            counter += 1

        # Validate color format if provided
        if color and not color.startswith("#"):
            color = f"#{color}"

        if color and len(color) != 7:
            raise ValidationError("Color must be a valid hex code (e.g., #FF5722).")

        # Create the category
        category = self.model.objects.create(
            name=name,
            slug=slug,
            icon=icon,
            color=color,
        )

        return category

    def update_category(
        self,
        category: DealCategory,
        user: User,
        name: Optional[str] = None,
        icon: Optional[str] = None,
        color: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> DealCategory:
        """
        Update a category with validation.

        Args:
            category: Category to update
            user: User requesting the update (must be staff)
            name: New category name (optional)
            icon: New icon identifier (optional)
            color: New color code (optional)
            is_active: New active status (optional)

        Returns:
            DealCategory: Updated category instance

        Raises:
            ValidationError: If validation fails
        """
        # Only staff can update categories
        if not user.is_staff:
            raise ValidationError("Only staff members can update categories.")

        # Update name if provided
        if name is not None:
            name = name.strip()
            if not name:
                raise ValidationError("Category name cannot be empty.")

            if len(name) > 100:
                raise ValidationError("Category name cannot exceed 100 characters.")

            # Check for duplicate names (excluding current category)
            if (
                self.model.objects.filter(name__iexact=name)
                .exclude(id=category.id)
                .exists()
            ):
                raise ValidationError("A category with this name already exists.")

            category.name = name

            # Update slug if name changed
            new_slug = slugify(name)
            if new_slug != category.slug:
                # Ensure new slug is unique
                original_slug = new_slug
                counter = 1
                while (
                    self.model.objects.filter(slug=new_slug)
                    .exclude(id=category.id)
                    .exists()
                ):
                    new_slug = f"{original_slug}-{counter}"
                    counter += 1
                category.slug = new_slug

        # Update icon if provided
        if icon is not None:
            category.icon = icon

        # Update color if provided
        if color is not None:
            if color and not color.startswith("#"):
                color = f"#{color}"

            if color and len(color) != 7:
                raise ValidationError("Color must be a valid hex code (e.g., #FF5722).")

            category.color = color

        # Update active status if provided
        if is_active is not None:
            category.is_active = is_active

        category.save()
        return category

    def delete_category(self, category: DealCategory, user: User) -> None:
        """
        Delete a category (staff only).

        Args:
            category: Category to delete
            user: User requesting deletion (must be staff)

        Raises:
            ValidationError: If user is not staff or category has deals
        """
        # Only staff can delete categories
        if not user.is_staff:
            raise ValidationError("Only staff members can delete categories.")

        # Check if category has active deals
        if category.deals.filter(status="active").exists():
            raise ValidationError(
                "Cannot delete category with active deals. "
                "Please move deals to another category first."
            )

        # Delete the category
        category.delete()

    def get_popular_categories(self, limit: int = 10) -> QuerySet[DealCategory]:
        """
        Get most popular categories by deal count.

        Args:
            limit: Maximum number of categories to return

        Returns:
            QuerySet of popular categories
        """
        return (
            self.model.objects.filter(is_active=True)
            .annotate(deal_count=Count("deals", filter=Q(deals__status="active")))
            .filter(deal_count__gt=0)
            .order_by("-deal_count", "name")[:limit]
        )

    def search_categories(self, query: str) -> QuerySet[DealCategory]:
        """
        Search categories by name.

        Args:
            query: Search query

        Returns:
            QuerySet of matching categories
        """
        return (
            self.model.objects.filter(is_active=True)
            .filter(name__icontains=query)
            .order_by("name")
        )
