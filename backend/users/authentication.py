from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings

User = get_user_model()


class InactiveAllowedJWTAuthentication(JWTAuthentication):
    """
    Same as the default JWTAuthentication but does NOT raise an error for
    inactive (unverified) users.  They receive a valid token on login and
    can reach the API; the frontend shows a verification banner instead of
    a hard rejection.
    """

    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken(_("Token contained no recognizable user identification"))

        try:
            user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})
        except User.DoesNotExist:
            raise AuthenticationFailed(_("User not found"), code="user_not_found")

        # Intentionally skip the is_active check here.
        return user
