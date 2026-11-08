from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import PerfilUsuario


class UsuarioCrearSerializer(serializers.Serializer):
    """Valida los datos de registro y crea el usuario junto con su perfil."""

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    institucion = serializers.CharField(max_length=150)

    def validate_email(self, value):
        correo = value.strip().lower()
        if User.objects.filter(email__iexact=correo).exists():
            raise serializers.ValidationError('Ya existe una cuenta con este correo.')
        return correo

    def validate(self, datos):
        # Se valida la contraseña con las reglas de Django (largo, muy común, etc.).
        usuario_temporal = User(
            first_name=datos['first_name'],
            last_name=datos['last_name'],
            email=datos['email'],
        )
        try:
            validate_password(datos['password'], user=usuario_temporal)
        except Exception as error:
            raise serializers.ValidationError({'password': list(error.messages)})
        return datos

    @transaction.atomic
    def create(self, datos):
        # El correo también se usa como nombre de usuario para poder iniciar sesión con él.
        usuario = User.objects.create_user(
            username=datos['email'],
            email=datos['email'],
            password=datos['password'],
            first_name=datos['first_name'],
            last_name=datos['last_name'],
        )
        PerfilUsuario.objects.create(usuario=usuario, institucion=datos['institucion'])
        return usuario

    def to_representation(self, usuario):
        return {
            'id': usuario.id,
            'first_name': usuario.first_name,
            'last_name': usuario.last_name,
            'email': usuario.email,
            'institucion': usuario.perfil.institucion,
        }
