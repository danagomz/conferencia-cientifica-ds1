from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import PerfilUsuario
from .roles import ROLES_VALIDOS, asignar_roles, roles_de, roles_que_puede_asignar


class UsuarioCrearSerializer(serializers.Serializer):
    """Valida los datos de registro y crea el usuario junto con su perfil."""

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    institucion = serializers.CharField(max_length=150)
    roles = serializers.ListField(
        child=serializers.ChoiceField(choices=ROLES_VALIDOS),
        allow_empty=False,
    )

    def validate_roles(self, valor):
        # Sin repetidos y respetando lo que puede asignar quien crea la cuenta.
        roles = list(dict.fromkeys(valor))
        quien_crea = self.context['request'].user
        permitidos = roles_que_puede_asignar(quien_crea)
        no_permitidos = [r for r in roles if r not in permitidos]
        if no_permitidos:
            raise serializers.ValidationError(
                'No tiene permiso para asignar el rol: ' + ', '.join(no_permitidos) + '.'
            )
        return roles

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
        asignar_roles(usuario, datos['roles'])
        return usuario

    def to_representation(self, usuario):
        return {
            'id': usuario.id,
            'first_name': usuario.first_name,
            'last_name': usuario.last_name,
            'email': usuario.email,
            'institucion': usuario.perfil.institucion,
            'roles': roles_de(usuario),
        }
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import PerfilUsuario
from .roles import AUTOR, ROLES_VALIDOS, asignar_roles, roles_de, roles_que_puede_asignar


class UsuarioCrearSerializer(serializers.Serializer):
    """Valida los datos de registro y crea el usuario junto con su perfil."""

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    institucion = serializers.CharField(max_length=150)
    roles = serializers.ListField(
        child=serializers.ChoiceField(choices=ROLES_VALIDOS),
        allow_empty=False,
    )

    def validate_roles(self, valor):
        # Sin repetidos y respetando lo que puede asignar quien crea la cuenta.
        roles = list(dict.fromkeys(valor))
        quien_crea = self.context['request'].user
        permitidos = roles_que_puede_asignar(quien_crea)
        no_permitidos = [r for r in roles if r not in permitidos]
        if no_permitidos:
            raise serializers.ValidationError(
                'No tiene permiso para asignar el rol: ' + ', '.join(no_permitidos) + '.'
            )
        return roles

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

    def roles_a_asignar(self, datos):
        return datos['roles']

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
        asignar_roles(usuario, self.roles_a_asignar(datos))
        return usuario

    def to_representation(self, usuario):
        return {
            'id': usuario.id,
            'first_name': usuario.first_name,
            'last_name': usuario.last_name,
            'email': usuario.email,
            'institucion': usuario.perfil.institucion,
            'roles': roles_de(usuario),
        }

class RegistroAutorSerializer(UsuarioCrearSerializer):
    """Registro autónomo de un autor (HU-031).

    No recibe roles. Si alguien envía el campo `roles`, se ignora: la cuenta
    siempre queda solo con el rol AUTOR, nunca con ADMIN ni COMITE.
    """

    roles = None  # quita el campo heredado

    def roles_a_asignar(self, datos):
        return [AUTOR]
