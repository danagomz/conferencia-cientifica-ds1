from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .roles import roles_de


def datos_de_usuario(usuario):
    """Datos del usuario que se devuelven al iniciar sesión."""
    perfil = getattr(usuario, 'perfil', None)
    return {
        'id': usuario.id,
        'first_name': usuario.first_name,
        'last_name': usuario.last_name,
        'email': usuario.email,
        'institucion': perfil.institucion if perfil else '',
        'roles': roles_de(usuario),
    }


def autenticar(email, password):
    """Busca al usuario por su correo y comprueba la contraseña. Devuelve el usuario o None."""
    usuario = User.objects.filter(email__iexact=str(email).strip()).first()
    if usuario is None:
        return None
    return authenticate(username=usuario.username, password=password)


class LoginView(APIView):
    """SDGC-98: POST /api/auth/login/ — inicia sesión con correo y contraseña."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        usuario = autenticar(request.data.get('email', ''), request.data.get('password', ''))
        if usuario is None:
            return Response(
                {'detail': 'Correo o contraseña incorrectos.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        refresh = RefreshToken.for_user(usuario)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'usuario': datos_de_usuario(usuario),
        })
