from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.conf import settings
from rest_framework import generics, permissions, views, status
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .serializers import RegisterSerializer, UserSerializer, AdminUserSerializer

User = get_user_model()


def _send_verification_email(user):
    uid   = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link  = f"{settings.FRONTEND_URL}/verify-email?uid={uid}&token={token}"
    send_mail(
        subject='Verify your email — AI Books Analyze',
        message=(
            f"Hi {user.username},\n\n"
            f"Please verify your email address by clicking the link below:\n\n"
            f"{link}\n\n"
            f"This link expires in 3 days. If you did not register, ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        _send_verification_email(user)


class VerifyEmailView(views.APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=None, responses={200: None})
    def post(self, request):
        uid   = request.data.get('uid', '')
        token = request.data.get('token', '')

        try:
            pk   = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=pk)
        except (TypeError, ValueError, User.DoesNotExist):
            return Response({'detail': 'Invalid verification link.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_active:
            return Response({'detail': 'Account already verified.'}, status=status.HTTP_200_OK)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'Verification link has expired or is invalid.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response({'detail': 'Email verified. You can now sign in.'}, status=status.HTTP_200_OK)


class ResendVerificationView(views.APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=None, responses={200: None})
    def post(self, request):
        email = request.data.get('email', '').strip()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal whether the email exists
            return Response({'detail': 'If that email is registered and unverified, a new link has been sent.'})

        if user.is_active:
            return Response({'detail': 'If that email is registered and unverified, a new link has been sent.'})

        _send_verification_email(user)
        return Response({'detail': 'If that email is registered and unverified, a new link has been sent.'})


class ChangePasswordView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')

        if not old_password or not new_password:
            return Response({'detail': 'Both old and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({'old_password': ['Current password is incorrect.']}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from django.contrib.auth.password_validation import validate_password
            validate_password(new_password, user)
        except Exception as e:
            return Response({'new_password': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password changed successfully.'})


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    @extend_schema(request={'multipart/form-data': UserSerializer})
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(request={'multipart/form-data': UserSerializer})
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

    @extend_schema(request={'multipart/form-data': UserSerializer})
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(request={'multipart/form-data': UserSerializer})
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['username', 'email']
    ordering_fields = ['date_joined', 'username']
    ordering = ['-date_joined']

    def get_queryset(self):
        return User.objects.all()


class AdminUserToggleView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user == request.user:
            return Response({'detail': 'Cannot modify your own account.'}, status=400)
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response({'id': user.id, 'is_active': user.is_active})


class PasswordResetRequestView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        try:
            user = User.objects.get(email=email, is_active=True)
            uid   = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link  = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
            send_mail(
                subject='Reset your password — AI Books Analyze',
                message=(
                    f"Hi {user.username},\n\n"
                    f"Click the link below to reset your password:\n\n"
                    f"{link}\n\n"
                    f"This link expires in 3 days. If you did not request a reset, ignore this email."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
            )
        except User.DoesNotExist:
            pass  # don't reveal whether email exists
        return Response({'detail': 'If that email is registered, a reset link was sent.'})


class PasswordResetConfirmView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid          = request.data.get('uid', '')
        token        = request.data.get('token', '')
        new_password = request.data.get('new_password', '')

        try:
            pk   = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=pk)
        except (TypeError, ValueError, User.DoesNotExist):
            return Response({'detail': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'Reset link has expired or already been used.'}, status=status.HTTP_400_BAD_REQUEST)

        if not new_password or len(new_password) < 8:
            return Response({'detail': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from django.contrib.auth.password_validation import validate_password
            validate_password(new_password, user)
        except Exception as e:
            return Response({'detail': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password reset successfully. You can now sign in.'})


class ChangeEmailRequestView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        new_email = request.data.get('email', '').strip()
        if not new_email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=new_email).exclude(pk=request.user.pk).exists():
            return Response({'detail': 'That email is already in use.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.core.cache import cache
        user  = request.user
        uid   = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        cache.set(f'email_change_{uid}_{token}', new_email, timeout=3600)

        link = f"{settings.FRONTEND_URL}/verify-email-change?uid={uid}&token={token}"
        send_mail(
            subject='Verify your new email — AI Books Analyze',
            message=(
                f"Hi {user.username},\n\n"
                f"Click the link below to confirm your new email address:\n\n"
                f"{link}\n\n"
                f"This link expires in 1 hour. If you did not request this, ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[new_email],
        )
        return Response({'detail': 'Verification email sent to your new address.'})


class ChangeEmailConfirmView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid   = request.data.get('uid', '')
        token = request.data.get('token', '')

        from django.core.cache import cache
        new_email = cache.get(f'email_change_{uid}_{token}')
        if not new_email:
            return Response({'detail': 'Link expired or already used.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pk   = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=pk)
        except (TypeError, ValueError, User.DoesNotExist):
            return Response({'detail': 'Invalid link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'Link expired or already used.'}, status=status.HTTP_400_BAD_REQUEST)

        user.email = new_email
        user.save(update_fields=['email'])
        cache.delete(f'email_change_{uid}_{token}')
        return Response({'detail': 'Email updated successfully.'})
