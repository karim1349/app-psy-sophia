"""
Custom user manager for the User model.
"""

from typing import Any, Optional, TypeVar

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.utils.translation import gettext_lazy as _

# Type variable for the User model
_T = TypeVar("_T", bound=AbstractBaseUser)


class UserManager(BaseUserManager[_T]):
    """
    Custom user manager where email is the unique identifier
    for authentication instead of usernames.
    """

    def create_user(
        self,
        email: str,
        username: str,
        password: Optional[str] = None,
        **extra_fields: Any
    ) -> _T:
        """
        Create and save a user with the given email, username, and password.
        """
        if not email:
            raise ValueError(_("The Email field must be set"))
        if not username:
            raise ValueError(_("The Username field must be set"))
        if not password:
            raise ValueError(_("The Password field must be set"))

        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self,
        email: str,
        username: str,
        password: Optional[str] = None,
        **extra_fields: Any
    ) -> _T:
        """
        Create and save a superuser with the given email, username, and password.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))

        return self.create_user(email, username, password, **extra_fields)
