"""
Custom throttling classes for deals app.

Rate limiting for different deal-related actions to prevent abuse
and ensure fair usage of the API.
"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class DealCreateThrottle(UserRateThrottle):
    """
    Throttle deal creation to prevent spam.

    Allows authenticated users to create a limited number of deals per hour.
    """

    scope = "deal_create"


class DealUpdateThrottle(UserRateThrottle):
    """
    Throttle deal updates to prevent abuse.

    Allows users to update their deals with reasonable frequency.
    """

    scope = "deal_update"


class VoteThrottle(UserRateThrottle):
    """
    Throttle voting to prevent vote manipulation.

    Allows users to vote with reasonable frequency but prevents
    rapid vote changes that could manipulate rankings.
    """

    scope = "vote"


class CommentThrottle(UserRateThrottle):
    """
    Throttle commenting to prevent spam.

    Allows users to comment with reasonable frequency.
    """

    scope = "comment"


class CommentUpdateThrottle(UserRateThrottle):
    """
    Throttle comment updates to prevent abuse.

    Allows users to edit their comments but prevents excessive editing.
    """

    scope = "comment_update"


class CategoryCreateThrottle(UserRateThrottle):
    """
    Throttle category creation (staff only).

    Even staff members should have reasonable limits on category creation.
    """

    scope = "category_create"


class SearchThrottle(UserRateThrottle):
    """
    Throttle search requests to prevent abuse.

    Allows reasonable search frequency for authenticated users.
    """

    scope = "search"


class AnonSearchThrottle(AnonRateThrottle):
    """
    Throttle search requests for anonymous users.

    More restrictive than authenticated user search throttling.
    """

    scope = "anon_search"


class DealListThrottle(AnonRateThrottle):
    """
    Throttle deal listing for anonymous users.

    Prevents excessive API calls from anonymous users while
    allowing reasonable browsing.
    """

    scope = "anon_deal_list"
