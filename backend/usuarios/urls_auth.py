from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .autenticacion import (
    LoginView,
    RestablecerContrasenaView,
    SolicitarCodigoRecuperacionView,
    UsuarioActualView,
)

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/recuperar-contrasena/', SolicitarCodigoRecuperacionView.as_view(), name='solicitar-recuperacion'),
    path('auth/restablecer-contrasena/', RestablecerContrasenaView.as_view(), name='restablecer-contrasena'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', UsuarioActualView.as_view(), name='usuario-actual'),
]