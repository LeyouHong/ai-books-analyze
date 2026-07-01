"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import get_user_model
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework import serializers
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

User = get_user_model()


def trigger_error(request):
    """Sentry 验证用：访问 /sentry-debug/ 会故意抛出 ZeroDivisionError。"""
    division_by_zero = 1 / 0


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Allows inactive (unverified) users to obtain a token.
    Bypasses Django's authenticate() which hard-rejects inactive users.
    Adds username, email, and is_active to the response payload.
    """

    def validate(self, attrs):
        username = attrs.get(self.username_field, '')
        password = attrs.get('password', '')

        try:
            user = User.objects.get(**{self.username_field: username})
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {'detail': 'No account found with the given credentials.'}
            )

        if not user.check_password(password):
            raise serializers.ValidationError(
                {'detail': 'No account found with the given credentials.'}
            )

        refresh = self.get_token(user)
        return {
            'refresh':   str(refresh),
            'access':    str(refresh.access_token),
            'username':  user.username,
            'email':     user.email,
            'is_active': user.is_active,
        }


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


urlpatterns = [
    path('sentry-debug/', trigger_error),

    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('api/users/', include('users.urls')),
    path('api/', include('books.urls')),
] + static(settings.MEDIA_URL, document_root=getattr(settings, 'MEDIA_ROOT', None))