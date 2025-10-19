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
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework import serializers, status
from rest_framework.decorators import action
from rest_framework.permissions import (AllowAny, BasePermission,
                                        IsAuthenticated)
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import \
    TokenRefreshView as SimpleJWTRefreshView


from .models import User
from .permissions import IsOwnerOrStaff
from .proxy.user_proxy import UserProxy
from .serializers import (ConvertGuestSerializer, LoginSerializer,
                          RegisterSerializer, UserSerializer,
                          UserUpdateSerializer)
from .throttles import (LoginThrottle, PasswordResetThrottle,
                        ResendVerificationThrottle)


class UserViewSet(GenericViewSet):
    """
    Simple ViewSet for all user operations.
    """

    permission_classes = [IsAuthenticated]  # Default to authenticated only
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def _get_authenticated_user(self, request: Request) -> User:
        """Get the authenticated user with proper type checking."""
        # Django's IsAuthenticated permission ensures this is always a User
        # We add a runtime check for extra safety
        if not hasattr(request.user, "id") or not request.user.is_authenticated:
            raise ValueError("User is not authenticated")
        return request.user

    def get_permissions(self) -> List[BasePermission]:
        # Override permissions per action
        if self.action in [
            "create",
            "login",
            "refresh",
            "verify_email",
            "resend_verification",
            "request_password_reset",
            "confirm_password_reset",
            "list",  # Allow anyone to see the list is disabled
            "guest",  # Allow anyone to create a guest session
        ]:
            return [cast(BasePermission, AllowAny())]
        elif self.action in ["retrieve", "update", "partial_update", "deactivate"]:
            return [IsOwnerOrStaff()]
        elif self.action == "convert":
            # Convert requires authentication (guest or full)
            return [IsAuthenticated()]
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
                {"non_field_errors": ["auth.login.accountInactive"]},
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
        refresh_view.request = request
        refresh_view.format_kwarg = None
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
        except ValidationError:
            return Response(
                {"non_field_errors": ["auth.verifyEmail.invalidCode"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
        email = request.data.get("email", "")
        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {"email": ["validation.email"]}, status=status.HTTP_400_BAD_REQUEST
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

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def deactivate(self, request: Request) -> Response:
        """Deactivate user account (set is_active=False)."""
        user = cast(User, request.user)
        self.user_proxy.deactivate_user(user)
        return Response(
            {"detail": "Account deactivated successfully."}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def change_password(self, request: Request) -> Response:
        """Change user password with current password verification."""

        class ChangePasswordSerializer(serializers.Serializer):
            current_password = serializers.CharField(required=True)
            new_password = serializers.CharField(required=True)
            new_password_confirm = serializers.CharField(required=True)

            def create(self, validated_data: Dict[str, Any]) -> Any:
                """Not used - this is a validation-only serializer."""
                raise NotImplementedError("This serializer is for validation only.")

            def update(self, instance: Any, validated_data: Dict[str, Any]) -> Any:
                """Not used - this is a validation-only serializer."""
                raise NotImplementedError("This serializer is for validation only.")

            def validate_current_password(self, value: str) -> str:
                """Verify current password is correct."""
                user = self.context["request"].user
                if not user.check_password(value):
                    raise serializers.ValidationError("Current password is incorrect.")
                return value

            def validate_new_password(self, value: str) -> str:
                """Validate new password strength."""
                try:
                    validate_password(value)
                except ValidationError as e:
                    raise serializers.ValidationError(list(e.messages))
                return value

            def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
                """Validate that new passwords match."""
                if attrs["new_password"] != attrs["new_password_confirm"]:
                    raise serializers.ValidationError(
                        {"new_password_confirm": "New passwords do not match."}
                    )
                return attrs

        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        # Update password
        user = self._get_authenticated_user(request)
        user.set_password(serializer.validated_data["new_password"])
        user.save()

        return Response(
            {"detail": "Password changed successfully."}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def guest(self, request: Request) -> Response:
        """
        Create a guest user and return tokens.

        Guest users are temporary users that can be converted to full accounts later.
        They don't require email or password.

        Returns:
            - access: JWT access token
            - refresh: JWT refresh token
            - user: User data with is_guest=True
        """
        # Create guest user with unique generated email/username
        import uuid
        guest_id = uuid.uuid4().hex[:12]

        user = User.objects.create(
            email=None,
            username=None,
            is_guest=True,
            is_active=True,  # Guests are active by default
        )

        # Generate tokens
        tokens = self.user_proxy.generate_tokens(user)

        # Serialize user data
        user_data = UserSerializer(user).data

        result = {
            "user": user_data,
            "refresh": tokens["refresh"],
            "access": tokens["access"],
            "message": "Guest session created successfully.",
        }

        client_type = request.headers.get("X-Client-Type", "").lower()
        return self._handle_cookie_response(
            result, client_type, status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def convert(self, request: Request) -> Response:
        """
        Convert a guest user to a full account.

        Requires:
            - email: Email address for the account
            - username: Username for the account
            - password: Password for the account

        Preserves all data (children, screeners, etc.) associated with the guest user.

        Returns:
            - access: New JWT access token
            - refresh: New JWT refresh token
            - user: Updated user data with is_guest=False
        """
        user = cast(User, request.user)

        # Verify user is a guest
        if not user.is_guest:
            return Response(
                {"non_field_errors": ["User is already a full account."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate and convert
        serializer = ConvertGuestSerializer(data=request.data, context={"user": user})
        serializer.is_valid(raise_exception=True)

        # Update user
        user.email = serializer.validated_data["email"]
        user.username = serializer.validated_data["username"]
        user.set_password(serializer.validated_data["password"])
        user.is_guest = False
        user.save()

        # Generate verification token
        user.generate_verification_token()

        # Generate new tokens
        tokens = self.user_proxy.generate_tokens(user)

        # Serialize user data
        user_data = UserSerializer(user).data

        result = {
            "user": user_data,
            "refresh": tokens["refresh"],
            "access": tokens["access"],
            "message": "Account converted successfully. Please verify your email.",
        }

        client_type = request.headers.get("X-Client-Type", "").lower()
        return self._handle_cookie_response(result, client_type)
