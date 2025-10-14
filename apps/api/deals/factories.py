"""
Factory Boy factories for creating test data.

Provides factories for all deal-related models following
the established patterns from the users app.
"""

from datetime import timedelta
from decimal import Decimal

import factory
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import Comment, Deal, DealCategory, Vote

User = get_user_model()


class DealCategoryFactory(factory.django.DjangoModelFactory):
    """Factory for creating DealCategory instances."""

    class Meta:
        model = DealCategory

    name = factory.Sequence(lambda n: f"Category {n}")
    slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(" ", "-"))
    icon = factory.Faker("word")
    color = factory.Faker("hex_color")
    is_active = True


class DealFactory(factory.django.DjangoModelFactory):
    """Factory for creating Deal instances."""

    class Meta:
        model = Deal

    title = factory.Faker("sentence", nb_words=4)
    description = factory.Faker("text", max_nb_chars=200)
    current_price = factory.LazyFunction(lambda: Decimal("99.99"))
    original_price = factory.LazyAttribute(
        lambda obj: obj.current_price + Decimal("10.00")
    )
    currency = "MAD"
    merchant = factory.Faker("company")
    channel = factory.Iterator(["online", "in_store"])
    city = factory.LazyAttribute(
        lambda obj: "Casablanca" if obj.channel == "in_store" else ""
    )
    url = factory.LazyAttribute(
        lambda obj: "https://example.com" if obj.channel == "online" else ""
    )
    proof_url = factory.Faker("url")
    status = "active"
    is_verified = factory.Faker("boolean", chance_of_getting_true=30)
    expires_at = factory.LazyFunction(lambda: timezone.now() + timedelta(days=7))

    # Relationships
    author = factory.SubFactory("users.factories.UserFactory")
    category = factory.SubFactory(DealCategoryFactory)

    @factory.post_generation  # type: ignore[misc]
    def ensure_valid_channel_data(
        self, create: bool, _extracted: None, **_kwargs: None
    ) -> None:
        """Ensure channel-specific data is valid."""
        if not create:
            return

        if self.channel == "online" and not self.url:
            self.url = "https://example.com"
        elif self.channel == "in_store" and not self.city:
            self.city = "Casablanca"

        self.save()


class OnlineDealFactory(DealFactory):
    """Factory for creating online deals."""

    channel = "online"
    city = ""
    url = factory.Faker("url")


class InStoreDealFactory(DealFactory):
    """Factory for creating in-store deals."""

    channel = "in_store"
    city = factory.Faker("city")
    url = ""


class ExpiredDealFactory(DealFactory):
    """Factory for creating expired deals."""

    status = "expired"
    expires_at = factory.LazyFunction(lambda: timezone.now() - timedelta(days=1))


class VerifiedDealFactory(DealFactory):
    """Factory for creating verified deals."""

    is_verified = True


class VoteFactory(factory.django.DjangoModelFactory):
    """Factory for creating Vote instances."""

    class Meta:
        model = Vote

    deal = factory.SubFactory(DealFactory)
    user = factory.SubFactory("users.factories.UserFactory")
    vote_type = factory.Iterator(["up", "down"])
    reason = factory.LazyAttribute(
        lambda obj: "Not a good deal" if obj.vote_type == "down" else ""
    )


class UpvoteFactory(VoteFactory):
    """Factory for creating upvotes."""

    vote_type = "up"
    reason = ""


class DownvoteFactory(VoteFactory):
    """Factory for creating downvotes."""

    vote_type = "down"
    reason = factory.Faker("sentence")


class CommentFactory(factory.django.DjangoModelFactory):
    """Factory for creating Comment instances."""

    class Meta:
        model = Comment

    deal = factory.SubFactory(DealFactory)
    user = factory.SubFactory("users.factories.UserFactory")
    content = factory.Faker("text", max_nb_chars=300)
    parent = None
    is_edited = False


class ReplyFactory(CommentFactory):
    """Factory for creating comment replies."""

    parent = factory.SubFactory(CommentFactory)

    @factory.post_generation  # type: ignore[misc]
    def ensure_same_deal(self, create: bool, _extracted: None, **_kwargs: None) -> None:
        """Ensure reply is on the same deal as parent."""
        if not create or not self.parent:
            return

        self.deal = self.parent.deal
        self.save()


class EditedCommentFactory(CommentFactory):
    """Factory for creating edited comments."""

    is_edited = True
