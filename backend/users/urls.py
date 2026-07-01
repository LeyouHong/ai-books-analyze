from django.urls import path
from .views import (
    RegisterView, MeView, UserDetailView,
    VerifyEmailView, ResendVerificationView, ChangePasswordView,
    AdminUserListView, AdminUserToggleView, AdminSentryTestView,
    PasswordResetRequestView, PasswordResetConfirmView,
    ChangeEmailRequestView, ChangeEmailConfirmView,
)

urlpatterns = [
    path('register/',                      RegisterView.as_view()),
    path('verify-email/',                  VerifyEmailView.as_view()),
    path('resend-verification/',           ResendVerificationView.as_view()),
    path('me/',                            MeView.as_view()),
    path('change-password/',               ChangePasswordView.as_view()),
    path('password-reset/',                PasswordResetRequestView.as_view()),
    path('password-reset/confirm/',        PasswordResetConfirmView.as_view()),
    path('change-email/',                  ChangeEmailRequestView.as_view()),
    path('change-email/confirm/',          ChangeEmailConfirmView.as_view()),
    path('admin/users/',                   AdminUserListView.as_view()),
    path('admin/users/<int:pk>/toggle/',   AdminUserToggleView.as_view()),
    path('admin/sentry-test/',             AdminSentryTestView.as_view()),
    path('<int:pk>/',                      UserDetailView.as_view()),
]
