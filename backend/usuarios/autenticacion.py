import logging
import secrets
from datetime import timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .captcha import captcha_es_valido
from .models import CodigoRecuperacionContrasena
from .roles import roles_de

logger = logging.getLogger(__name__)

TIEMPO_VIGENCIA_CODIGO = timedelta(minutes=10)
MAX_INTENTOS_CODIGO = 5


def datos_de_usuario(usuario):
    """Datos del usuario que se devuelven al iniciar sesión y en /auth/me/."""
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
    """SDGC-99: valida que lleguen el correo y la contraseña."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    captcha_token = serializers.CharField(write_only=True)

    def validate_captcha_token(self, token):
        if not captcha_es_valido(token):
            raise serializers.ValidationError('El CAPTCHA no es válido. Márcalo de nuevo.')
        return token


class SolicitarCodigoRecuperacionSerializer(serializers.Serializer):
    email = serializers.EmailField()


class RestablecerContrasenaSerializer(serializers.Serializer):
    email = serializers.EmailField()
    pin = serializers.RegexField(r'^\d{6}$')
    password = serializers.CharField(write_only=True, trim_whitespace=False)


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

        # SDGC-101: se entregan los tokens de la sesión.
        refresh = RefreshToken.for_user(usuario)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'usuario': datos_de_usuario(usuario),
        })


class SolicitarCodigoRecuperacionView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_recovery_request'

    def post(self, request):
        serializer = SolicitarCodigoRecuperacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        correo = serializer.validated_data['email'].strip()
        with transaction.atomic():
            usuario = User.objects.select_for_update().filter(
                email__iexact=correo,
                is_active=True,
            ).first()

            if usuario:
                pin = f'{secrets.randbelow(1_000_000):06d}'
                CodigoRecuperacionContrasena.objects.filter(usuario=usuario).delete()
                CodigoRecuperacionContrasena.objects.create(
                    usuario=usuario,
                    codigo_hash=make_password(pin),
                    expira_en=timezone.now() + TIEMPO_VIGENCIA_CODIGO,
                )
                correo_destino = usuario.email

        if usuario:
            try:
                send_mail(
                    'Código para recuperar tu contraseña',
                    f'Tu PIN de recuperación es {pin}. Vence en 10 minutos.',
                    None,
                    [correo_destino],
                    fail_silently=False,
                )
            except Exception:
                logger.exception('No se pudo enviar el PIN de recuperación.')
                return Response(
                    {'detail': 'No se pudo enviar el correo. Intenta de nuevo más tarde.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        return Response({
            'detail': 'Si el correo está registrado, recibirás un PIN de recuperación.',
        })


class RestablecerContrasenaView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_recovery_reset'

    def post(self, request):
        serializer = RestablecerContrasenaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
        usuario = User.objects.filter(email__iexact=datos['email'].strip(), is_active=True).first()
        if usuario is None:
            return Response(
                {'detail': 'El PIN no es válido o ha vencido. Solicita uno nuevo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(datos['password'], user=usuario)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'password': error.messages}) from error

        with transaction.atomic():
            codigo = (
                CodigoRecuperacionContrasena.objects.select_for_update()
                .filter(usuario=usuario, usado_en__isnull=True)
                .order_by('-creado_en')
                .first()
            )
            ahora = timezone.now()
            if (
                codigo is None
                or codigo.expira_en <= ahora
                or codigo.intentos >= MAX_INTENTOS_CODIGO
            ):
                return Response(
                    {'detail': 'El PIN no es válido o ha vencido. Solicita uno nuevo.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not check_password(datos['pin'], codigo.codigo_hash):
                codigo.intentos += 1
                if codigo.intentos >= MAX_INTENTOS_CODIGO:
                    codigo.usado_en = ahora
                codigo.save(update_fields=['intentos', 'usado_en'])
                return Response(
                    {'detail': 'El PIN no es válido o ha vencido. Solicita uno nuevo.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            usuario.set_password(datos['password'])
            usuario.save(update_fields=['password'])
            codigo.usado_en = ahora
            codigo.save(update_fields=['usado_en'])

        return Response({'detail': 'Tu contraseña se actualizó correctamente.'})


class UsuarioActualView(APIView):
    """SDGC-101: GET /api/auth/me/ — devuelve el usuario de la sesión actual."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(datos_de_usuario(request.user))
