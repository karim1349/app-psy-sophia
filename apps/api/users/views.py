"""
Simple ViewSet for all user operations.

Standard REST endpoints:
- POST /users/ - Create user (register)
- PATCH /users/me/ - Update current user

Custom actions:
- POST /users/login/ - Login
- POST /users/logout/ - Logout
- POST /users/refresh/ - Refresh token
- GET /users/me/ - Get current user
- PATCH /users/me/ - Update current user
- POST /users/verify_email/ - Verify email
- POST /users/resend_verification/ - Resend verification
- POST /users/request_password_reset/ - Request password reset
- POST /users/confirm_password_reset/ - Confirm password reset
- POST /users/{id}/deactivate/ - Deactivate user account
"""

from datetime import timedelta
from typing import Any, Dict, List, cast

from django.conf import settings
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTRefreshView

from .models import User
from .permissions import IsOwnerOrStaff
from .proxy.user_proxy import UserProxy
from .serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from .throttles import LoginThrottle, PasswordResetThrottle, ResendVerificationThrottle


class UserViewSet(GenericViewSet):
    """
    Simple ViewSet for all user operations.
    """

    permission_classes = [IsAuthenticated]  # Default to authenticated only
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self) -> List[BasePermission]:
        # Override permissions per action
        if self.action in [
            "create",
            "login",
            "verify_email",
            "resend_verification",
            "request_password_reset",
            "confirm_password_reset",
            "list",  # Allow anyone to see the list is disabled
        ]:
            return [cast(BasePermission, AllowAny())]
        elif self.action in ["retrieve", "update", "partial_update", "deactivate"]:
            return [IsOwnerOrStaff()]
        return [IsAuthenticated()]

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.user_proxy = UserProxy()

    def _handle_cookie_response(
        self,
        result: Dict[str, Any],
        client_type: str,
        status_code: int = status.HTTP_200_OK,
    ) -> Response:
        """Handle setting cookies in response for web clients."""
        access_lifetime = cast(timedelta, settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"])
        refresh_lifetime = cast(
            timedelta, settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
        )

        if client_type == "web":
            # Set cookies and return empty response
            response = Response(status=status_code)
            # Access token
            response.set_cookie(
                "access_token",
                result["access"],
                max_age=int(access_lifetime.total_seconds()),
                httponly=True,
                secure=not settings.DEBUG,
                samesite="Lax",
            )
            # Refresh token
            response.set_cookie(
                "refresh_token",
                result["refresh"],
                max_age=int(refresh_lifetime.total_seconds()),
                httponly=True,
                secure=not settings.DEBUG,
                samesite="Lax",
            )
            return response
        else:
            # Return tokens in response body (mobile client)
            return Response(result, status=status_code)

    def create(self, request: Request) -> Response:
        """Create user (register)."""

        # Validate and create user
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate verification token
        user.generate_verification_token()

        # Generate tokens
        tokens = self.user_proxy.generate_tokens(user)

        # Serialize user data
        user_data = UserSerializer(user).data

        result = {
            "user": user_data,
            "refresh": tokens["refresh"],
            "access": tokens["access"],
            "message": "Registration successful. Please verify your email.",
        }

        client_type = request.headers.get("X-Client-Type", "").lower()
        return self._handle_cookie_response(
            result, client_type, status.HTTP_201_CREATED
        )

    # Authentication actions
    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        throttle_classes=[LoginThrottle],
    )
    def login(self, request: Request) -> Response:
        """Authenticate user and return tokens."""

        # Validate credentials
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        # Check if user is active
        if not user.is_active:
            return Response(
                {"detail": "Account is not active. Please verify your email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate tokens
        tokens = self.user_proxy.generate_tokens(user)

        # Serialize user data
        user_data = UserSerializer(user).data

        result = {
            "user": user_data,
            "refresh": tokens["refresh"],
            "access": tokens["access"],
            "message": "Login successful.",
        }

        client_type = request.headers.get("X-Client-Type", "").lower()
        return self._handle_cookie_response(result, client_type)

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def refresh(self, request: Request) -> Response:
        """Refresh access token."""
        # Check if refresh token is in cookies (web client)
        refresh_token = request.COOKIES.get("refresh_token")

        if refresh_token:
            # Use token from cookie
            request.data["refresh"] = refresh_token

        # Use SimpleJWT's refresh view logic
        refresh_view = SimpleJWTRefreshView()
        return cast(Response, refresh_view.post(request))

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def verify_email(self, request: Request) -> Response:
        try:
            user = self.user_proxy.verify_email(
                request.data["email"], request.data["code"]
            )
            # Generate tokens since email is now verified
            tokens = self.user_proxy.generate_tokens(user)
            return Response(
                {
                    "user": UserSerializer(user).data,
                    "refresh": tokens["refresh"],
                    "access": tokens["access"],
                    "detail": "Email verified successfully.",
                }
            )
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        throttle_classes=[ResendVerificationThrottle],
    )
    def resend_verification(self, request: Request) -> Response:
        """Resend verification email."""
        result = self.user_proxy.resend_verification(request.data["email"])
        return Response(result, status=status.HTTP_200_OK)

    # Password reset actions
    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        throttle_classes=[PasswordResetThrottle],
    )
    def request_password_reset(self, request: Request) -> Response:
        """Send password reset email."""
        from django.core.validators import validate_email

        email = request.data.get("email", "")
        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {"detail": "Invalid email format."}, status=status.HTTP_400_BAD_REQUEST
            )

        result = self.user_proxy.request_password_reset(email)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def confirm_password_reset(self, request: Request) -> Response:
        """Reset password with token."""
        result = self.user_proxy.confirm_password_reset(
            request.data["token"],
            request.data["password"],
            request.data["password_confirm"],
        )
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def logout(self, request: Request) -> Response:
        """Logout user by blacklisting refresh token."""
        # Check cookies first for web clients
        refresh_token = request.COOKIES.get("refresh_token") or request.data.get(
            "refresh"
        )

        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from rest_framework_simplejwt.exceptions import TokenError
            from rest_framework_simplejwt.tokens import RefreshToken

            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                return Response(
                    {"detail": "Invalid or expired token."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            response = Response({"detail": "Logged out successfully."})

            # Clear cookies for web clients
            if request.headers.get("X-Client-Type", "").lower() == "web":
                response.delete_cookie("access_token")
                response.delete_cookie("refresh_token")

            return response
        except (ValidationError, TokenError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    # Profile actions
    @action(
        detail=False, methods=["get", "patch"], permission_classes=[IsAuthenticated]
    )
    def me(self, request: Request) -> Response:
        """Return or update current user data."""
        user = cast(User, request.user)

        if request.method == "PATCH":
            update_serializer = UserUpdateSerializer(
                user, data=request.data, partial=True
            )
            update_serializer.is_valid(raise_exception=True)
            update_serializer.save()
            return Response(update_serializer.data)

        user_serializer = UserSerializer(user)
        return Response(user_serializer.data)

    def list(self, _request: Request) -> Response:
        """List endpoint is disabled for security reasons."""
        return Response(
            {"detail": "Listing all users is not allowed."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def retrieve(
        self, _request: Request
    ) -> Response:  # pylint: disable=unused-argument
        """Retrieve a specific user."""
        user = self.get_object()
        serializer = UserSerializer(user)
        return Response(serializer.data)

    def update(
        self, request: Request, _pk: Any = None, partial: bool = False
    ) -> Response:
        """Update user profile."""
        user = self.get_object()
        serializer = UserUpdateSerializer(user, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request: Request, pk: Any = None) -> Response:
        """Partially update user profile."""
        return self.update(request, pk, partial=True)

    @action(detail=True, methods=["post"], permission_classes=[IsOwnerOrStaff])
    def deactivate(
        self, _request: Request
    ) -> Response:  # pylint: disable=unused-argument
        """Deactivate user account (set is_active=False)."""
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response(
            {"detail": "Account deactivated successfully."}, status=status.HTTP_200_OK
        )
