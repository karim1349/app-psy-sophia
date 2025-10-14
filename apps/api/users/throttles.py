"""
Custom throttle classes for user authentication endpoints.

Implements rate limiting for sensitive operations:
- Registration: 5/hour per IP
- Login: 10/hour per IP
- Password Reset: 3/hour per IP
"""

from rest_framework.throttling import AnonRateThrottle


class RegisterThrottle(AnonRateThrottle):
    """
    Throttle for registration endpoint.

    Rate: 5 requests per hour per IP address.
    Prevents automated account creation and spam.
    """

    rate = "5/hour"


class LoginThrottle(AnonRateThrottle):
    """
    Throttle for login endpoint.

    Rate: 10 requests per hour per IP address.
    Provides basic brute-force protection (works alongside Django Axes).
    """

    rate = "10/hour"


class PasswordResetThrottle(AnonRateThrottle):
    """
    Throttle for password reset request endpoint.

    Rate: 3 requests per hour per IP address.
    Prevents abuse of password reset functionality.
    """

    rate = "3/hour"


class ResendVerificationThrottle(AnonRateThrottle):
    """
    Throttle for resend verification email endpoint.

    Rate: 3 requests per hour per IP address.
    Prevents abuse of email verification resend functionality.
    """

    rate = "3/hour"
