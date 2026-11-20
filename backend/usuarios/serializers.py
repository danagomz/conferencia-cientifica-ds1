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

class UsuarioConsultaSerializer(serializers.ModelSerializer):
    """Serializador para consultar la información permitida de los usuarios."""

    institucion = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'institucion',
            'roles',
        ]

    def get_institucion(self, usuario):
        if hasattr(usuario, 'perfil'):
            return usuario.perfil.institucion
        return None

    def get_roles(self, usuario):
        roles_asignados = {
            asignacion.rol.nombre_rol
            for asignacion in usuario.roles_asignados.all()
        }

        return [
            rol for rol in ROLES_VALIDOS
            if rol in roles_asignados
        ]


class UsuarioActualizarSerializer(serializers.Serializer):
    """Valida y actualiza los datos personales permitidos de un usuario."""

    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)
    institucion = serializers.CharField(max_length=150, required=False)

    def to_internal_value(self, data):
        # Rechaza cualquier campo que no esté permitido para actualizar.
        if hasattr(data, 'keys'):
            campos_no_permitidos = (
                set(data.keys()) - set(self.fields.keys())
            )

            if campos_no_permitidos:
                raise serializers.ValidationError({
                    campo: 'Este campo no está permitido para actualizar.'
                    for campo in campos_no_permitidos
                })

        return super().to_internal_value(data)

    def validate(self, datos):
        if not datos:
            raise serializers.ValidationError(
                'Debe proporcionar al menos un dato para actualizar.'
            )
        return datos

    def validate_email(self, value):
        correo = value.strip().lower()

        existe = User.objects.filter(
            email__iexact=correo
        ).exclude(pk=self.instance.pk).exists()

        if existe:
            raise serializers.ValidationError(
                'Ya existe una cuenta con este correo.'
            )

        return correo

    @transaction.atomic
    def update(self, instance, validated_data):
        institucion = validated_data.pop('institucion', None)

        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)

        if 'email' in validated_data:
            instance.username = validated_data['email']

        instance.save()

        if institucion is not None:
            PerfilUsuario.objects.update_or_create(
                usuario=instance,
                defaults={'institucion': institucion}
            )

        return instance
