from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers, status
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


class LoginSerializer(serializers.Serializer):
    """SDGC-99: valida que lleguen el correo (con formato válido) y la contraseña."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


def autenticar(email, password):
    """SDGC-99: valida las credenciales. Devuelve el usuario o None."""
    usuario = User.objects.filter(email__iexact=email.strip()).first()
    if usuario is None:
        return None
    # authenticate() también rechaza las cuentas desactivadas.
    return authenticate(username=usuario.username, password=password)


class LoginView(APIView):
    """SDGC-98: POST /api/auth/login/ — inicia sesión con correo y contraseña."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = autenticar(serializer.validated_data['email'], serializer.validated_data['password'])
        if usuario is None:
            # Mismo mensaje si el correo no existe o la contraseña es incorrecta.
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