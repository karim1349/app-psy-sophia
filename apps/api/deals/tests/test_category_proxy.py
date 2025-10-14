"""
Tests for CategoryProxy business logic.

Comprehensive tests for all CategoryProxy methods with proper validation
and error handling testing.
"""

import pytest
from django.core.exceptions import ValidationError

from users.factories import UserFactory

from ..factories import DealCategoryFactory, DealFactory
from ..models import DealCategory
from ..proxy.category_proxy import CategoryProxy


@pytest.mark.django_db
class TestCategoryProxy:
    """Test CategoryProxy business logic."""

    def __init__(self) -> None:
        """Initialize test class."""
        super().__init__()
        self.proxy = CategoryProxy()

    def test_get_by_id_existing(self) -> None:
        """Test getting category by existing ID."""
        category = DealCategoryFactory()
        result = self.proxy.get_by_id(category.id)

        assert result is not None
        assert result.id == category.id

    def test_get_by_id_non_existing(self) -> None:
        """Test getting category by non-existing ID."""
        result = self.proxy.get_by_id(99999)
        assert result is None

    def test_get_by_slug_existing(self) -> None:
        """Test getting category by existing slug."""
        DealCategoryFactory(slug="electronics")
        result = self.proxy.get_by_slug("electronics")

        assert result is not None
        assert result.slug == "electronics"

    def test_get_by_slug_non_existing(self) -> None:
        """Test getting category by non-existing slug."""
        result = self.proxy.get_by_slug("non-existing")
        assert result is None

    def test_get_active_categories(self) -> None:
        """Test getting active categories."""
        DealCategoryFactory.create_batch(3, is_active=True)
        DealCategoryFactory(is_active=False)

        result = self.proxy.get_active_categories()
        assert result.count() == 3

    def test_get_categories_with_deal_count(self) -> None:
        """Test getting categories with deal counts."""
        category1 = DealCategoryFactory()
        category2 = DealCategoryFactory()

        # Create deals for categories
        DealFactory.create_batch(3, category=category1, status="active")
        DealFactory.create_batch(1, category=category2, status="active")
        DealFactory(category=category1, status="expired")  # Should not count

        result = self.proxy.get_categories_with_deal_count()

        # Check that deal counts are annotated
        for cat in result:
            if cat.id == category1.id:
                assert getattr(cat, "deal_count", 0) == 3
            elif cat.id == category2.id:
                assert getattr(cat, "deal_count", 0) == 1

    def test_create_category_valid(self) -> None:
        """Test creating valid category."""
        user = UserFactory(is_staff=True)

        category = self.proxy.create_category(
            name="Electronics", icon="laptop", color="#FF5722", user=user
        )

        assert category.name == "Electronics"
        assert category.slug == "electronics"
        assert category.icon == "laptop"
        assert category.color == "#FF5722"

    def test_create_category_non_staff(self) -> None:
        """Test creating category by non-staff user."""
        user = UserFactory(is_staff=False)

        with pytest.raises(
            ValidationError, match="Only staff members can create categories"
        ):
            self.proxy.create_category(name="Electronics", user=user)

    def test_create_category_no_user(self) -> None:
        """Test creating category without user (should work)."""
        category = self.proxy.create_category(
            name="Electronics", icon="laptop", color="#FF5722"
        )

        assert category.name == "Electronics"
        assert category.slug == "electronics"

    def test_create_category_duplicate_name(self) -> None:
        """Test creating category with duplicate name."""
        user = UserFactory(is_staff=True)
        DealCategoryFactory(name="Electronics")

        with pytest.raises(
            ValidationError, match="category with this name already exists"
        ):
            self.proxy.create_category(name="Electronics", user=user)

    def test_create_category_case_insensitive_duplicate(self) -> None:
        """Test creating category with case-insensitive duplicate name."""
        user = UserFactory(is_staff=True)
        DealCategoryFactory(name="Electronics")

        with pytest.raises(
            ValidationError, match="category with this name already exists"
        ):
            self.proxy.create_category(name="ELECTRONICS", user=user)

    def test_create_category_empty_name(self) -> None:
        """Test creating category with empty name."""
        user = UserFactory(is_staff=True)

        with pytest.raises(ValidationError, match="Category name cannot be empty"):
            self.proxy.create_category(name="", user=user)

    def test_create_category_whitespace_name(self) -> None:
        """Test creating category with whitespace-only name."""
        user = UserFactory(is_staff=True)

        with pytest.raises(ValidationError, match="Category name cannot be empty"):
            self.proxy.create_category(name="   ", user=user)

    def test_create_category_long_name(self) -> None:
        """Test creating category with too long name."""
        user = UserFactory(is_staff=True)
        long_name = "x" * 101  # Exceeds 100 character limit

        with pytest.raises(ValidationError, match="cannot exceed 100 characters"):
            self.proxy.create_category(name=long_name, user=user)

    def test_create_category_slug_generation(self) -> None:
        """Test automatic slug generation."""
        user = UserFactory(is_staff=True)

        category = self.proxy.create_category(name="Home & Garden", user=user)

        assert category.slug == "home-garden"

    def test_create_category_slug_uniqueness(self) -> None:
        """Test slug uniqueness when names are similar."""
        user = UserFactory(is_staff=True)

        # Create first category
        category1 = self.proxy.create_category(name="Electronics", user=user)
        assert category1.slug == "electronics"

        # Create category with name that would generate same slug
        # This should work because we check name uniqueness, not slug
        # But if we had slug conflicts, it would handle them
        DealCategoryFactory(name="Different Name", slug="electronics-test")

        category2 = self.proxy.create_category(name="Electronics Test", user=user)
        # Should generate unique slug
        assert category2.slug.startswith("electronics-test")

    def test_create_category_invalid_color(self) -> None:
        """Test creating category with invalid color format."""
        user = UserFactory(is_staff=True)

        with pytest.raises(ValidationError, match="valid hex code"):
            self.proxy.create_category(
                name="Electronics", color="invalid-color", user=user
            )

    def test_create_category_color_auto_format(self) -> None:
        """Test automatic color formatting."""
        user = UserFactory(is_staff=True)

        category = self.proxy.create_category(
            name="Electronics", color="FF5722", user=user  # Without #
        )

        assert category.color == "#FF5722"

    def test_update_category_by_staff(self) -> None:
        """Test updating category by staff."""
        user = UserFactory(is_staff=True)
        category = DealCategoryFactory(name="Old Name")

        result = self.proxy.update_category(
            category=category,
            user=user,
            name="New Name",
            color="#FF5722",
            icon="new-icon",
        )

        assert result.name == "New Name"
        assert result.color == "#FF5722"
        assert result.icon == "new-icon"

    def test_update_category_by_non_staff(self) -> None:
        """Test updating category by non-staff user."""
        user = UserFactory(is_staff=False)
        category = DealCategoryFactory()

        with pytest.raises(
            ValidationError, match="Only staff members can update categories"
        ):
            self.proxy.update_category(category=category, user=user, name="New Name")

    def test_update_category_name_with_slug_update(self) -> None:
        """Test updating category name updates slug."""
        user = UserFactory(is_staff=True)
        category = DealCategoryFactory(name="Old Name", slug="old-name")

        result = self.proxy.update_category(
            category=category, user=user, name="New Name"
        )

        assert result.name == "New Name"
        assert result.slug == "new-name"

    def test_update_category_duplicate_name(self) -> None:
        """Test updating category to duplicate name."""
        user = UserFactory(is_staff=True)
        DealCategoryFactory(name="Existing Name")
        category_to_update = DealCategoryFactory(name="Old Name")

        with pytest.raises(
            ValidationError, match="category with this name already exists"
        ):
            self.proxy.update_category(
                category=category_to_update, user=user, name="Existing Name"
            )

    def test_update_category_same_name(self) -> None:
        """Test updating category with same name (should work)."""
        user = UserFactory(is_staff=True)
        category = DealCategoryFactory(name="Same Name")

        result = self.proxy.update_category(
            category=category, user=user, name="Same Name", color="#FF5722"
        )

        assert result.name == "Same Name"
        assert result.color == "#FF5722"

    def test_update_category_is_active(self) -> None:
        """Test updating category active status."""
        user = UserFactory(is_staff=True)
        category = DealCategoryFactory(is_active=True)

        result = self.proxy.update_category(
            category=category, user=user, is_active=False
        )

        assert result.is_active is False

    def test_delete_category_by_staff(self) -> None:
        """Test deleting category by staff."""
        user = UserFactory(is_staff=True)
        category = DealCategoryFactory()
        category_id = category.id

        self.proxy.delete_category(category, user)

        assert not DealCategory.objects.filter(id=category_id).exists()

    def test_delete_category_by_non_staff(self) -> None:
        """Test deleting category by non-staff user."""
        user = UserFactory(is_staff=False)
        category = DealCategoryFactory()

        with pytest.raises(
            ValidationError, match="Only staff members can delete categories"
        ):
            self.proxy.delete_category(category, user)

    def test_delete_category_with_active_deals(self) -> None:
        """Test deleting category that has active deals."""
        user = UserFactory(is_staff=True)
        category = DealCategoryFactory()
        DealFactory(category=category, status="active")

        with pytest.raises(
            ValidationError, match="Cannot delete category with active deals"
        ):
            self.proxy.delete_category(category, user)

    def test_delete_category_with_expired_deals(self) -> None:
        """Test deleting category that has only expired deals."""
        user = UserFactory(is_staff=True)
        category = DealCategoryFactory()
        DealFactory(category=category, status="expired")
        category_id = category.id

        self.proxy.delete_category(category, user)

        assert not DealCategory.objects.filter(id=category_id).exists()

    def test_get_popular_categories(self) -> None:
        """Test getting popular categories by deal count."""
        category1 = DealCategoryFactory()
        category2 = DealCategoryFactory()
        category3 = DealCategoryFactory()

        # Create deals to make categories popular
        DealFactory.create_batch(5, category=category1, status="active")
        DealFactory.create_batch(3, category=category2, status="active")
        DealFactory.create_batch(1, category=category3, status="active")

        result = self.proxy.get_popular_categories(limit=2)

        assert result.count() == 2
        # Should be ordered by deal count descending
        categories = list(result)
        assert getattr(categories[0], "deal_count", 0) >= getattr(
            categories[1], "deal_count", 0
        )

    def test_get_popular_categories_excludes_empty(self) -> None:
        """Test that popular categories excludes categories with no deals."""
        category_with_deals = DealCategoryFactory()
        DealCategoryFactory()

        DealFactory.create_batch(3, category=category_with_deals, status="active")

        result = self.proxy.get_popular_categories()

        assert result.count() == 1
        first_result = result.first()
        assert first_result is not None
        assert first_result.id == category_with_deals.id

    def test_search_categories(self) -> None:
        """Test searching categories by name."""
        DealCategoryFactory(name="Electronics")
        DealCategoryFactory(name="Electronic Accessories")
        DealCategoryFactory(name="Home & Garden")
        DealCategoryFactory(name="Fashion", is_active=False)  # Should be excluded

        result = self.proxy.search_categories("electronic")

        assert result.count() == 2

        # Test case insensitive search
        result = self.proxy.search_categories("ELECTRONIC")
        assert result.count() == 2

    def test_search_categories_empty_query(self) -> None:
        """Test searching categories with empty query."""
        DealCategoryFactory.create_batch(3, is_active=True)

        result = self.proxy.search_categories("")

        assert result.count() == 3
