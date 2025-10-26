"""
Custom JWT token serializers to include is_guest field in token payload.
"""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken


class CustomRefreshToken(RefreshToken):
    """Custom refresh token that includes is_guest field in access token payload."""

    @classmethod
    def for_user(cls, user):
        token = super().for_user(user)
        
        # Add custom claims to the access token
        token.access_token['is_guest'] = user.is_guest
        token.access_token['is_active'] = user.is_active
        
        return token


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT serializer that includes is_guest field in token payload."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['is_guest'] = user.is_guest
        token['is_active'] = user.is_active
        
        return token
