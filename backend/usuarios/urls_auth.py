from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .autenticacion import LoginView, UsuarioActualView

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', UsuarioActualView.as_view(), name='usuario-actual'),
]