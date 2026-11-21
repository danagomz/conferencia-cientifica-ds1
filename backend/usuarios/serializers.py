
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import PerfilUsuario, UsuarioRol
from .permisos_consulta import roles_efectivos, rol_activo_solicitado
from .roles import (
    AUTOR,
    ROLES_VALIDOS,
    ROLES_QUE_PUEDE_ASIGNAR,
    asignar_roles,
    roles_de,
    roles_que_puede_asignar,
)


def roles_asignables_en_peticion(request):
    """
    Calcula los roles que puede asignar el usuario según el rol activo.

    Sin cabecera se utilizan todos los roles de la cuenta,
    manteniendo la compatibilidad con clientes anteriores.
    """
    if request.user.is_superuser and rol_activo_solicitado(request) is None:
        return set(ROLES_VALIDOS)

    roles = roles_efectivos(request)
    permitidos = set()

    for rol in roles:
        permitidos.update(ROLES_QUE_PUEDE_ASIGNAR.get(rol, ()))

    return permitidos


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
                'No tiene permiso para asignar el rol: '
                + ', '.join(no_permitidos)
                + '.'
            )

        return roles

    def validate_email(self, value):
        correo = value.strip().lower()

        if User.objects.filter(email__iexact=correo).exists():
            raise serializers.ValidationError(
                'Ya existe una cuenta con este correo.'
            )

        return correo

    def validate(self, datos):
        # Se valida la contraseña con las reglas de Django.
        usuario_temporal = User(
            first_name=datos['first_name'],
            last_name=datos['last_name'],
            email=datos['email'],
        )

        try:
            validate_password(datos['password'], user=usuario_temporal)
        except Exception as error:
            raise serializers.ValidationError({
                'password': list(error.messages)
            })

        return datos

    def roles_a_asignar(self, datos):
        return datos['roles']

    @transaction.atomic
    def create(self, datos):
        # El correo también se usa como nombre de usuario.
        usuario = User.objects.create_user(
            username=datos['email'],
            email=datos['email'],
            password=datos['password'],
            first_name=datos['first_name'],
            last_name=datos['last_name'],
        )

        PerfilUsuario.objects.create(
            usuario=usuario,
            institucion=datos['institucion'],
        )

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

    No recibe roles. Si alguien envía el campo roles, se ignora:
    la cuenta siempre queda solo con el rol AUTOR.
    """

    roles = None

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


class UsuarioEditarSerializer(serializers.Serializer):
    """
    Actualiza los datos personales de un usuario.

    Los roles son opcionales y solo pueden modificarse cuando
    se está editando otra cuenta con los permisos correspondientes.
    """

    first_name = serializers.CharField(
        max_length=150,
        required=False,
    )

    last_name = serializers.CharField(
        max_length=150,
        required=False,
    )

    email = serializers.EmailField(
        required=False,
    )

    institucion = serializers.CharField(
        max_length=150,
        required=False,
    )

    password = serializers.CharField(
        write_only=True,
        required=False,
    )

    roles = serializers.ListField(
        child=serializers.ChoiceField(choices=ROLES_VALIDOS),
        required=False,
        allow_empty=False,
    )

    def to_internal_value(self, datos):
        """
        Bloquea cualquier intento de enviar roles al editar
        la propia cuenta, incluso si el usuario es ADMIN.
        """
        request = self.context.get('request')

        if (
            request
            and self.instance
            and self.instance.pk == request.user.pk
            and 'roles' in datos
        ):
            raise serializers.ValidationError({
                'roles': 'No puedes modificar los roles de tu propia cuenta.'
            })

        return super().to_internal_value(datos)

    def validate_email(self, value):
        correo = value.strip().lower()

        existe_correo = User.objects.filter(
            email__iexact=correo
        ).exclude(pk=self.instance.pk).exists()

        if existe_correo:
            raise serializers.ValidationError(
                'Ya existe una cuenta con este correo.'
            )

        existe_usuario = User.objects.filter(
            username__iexact=correo
        ).exclude(pk=self.instance.pk).exists()

        if existe_usuario:
            raise serializers.ValidationError(
                'Este correo ya está asociado a otro nombre de usuario.'
            )

        return correo

    def validate_roles(self, valor):
        # Elimina los repetidos sin cambiar el orden.
        roles = list(dict.fromkeys(valor))

        request = self.context['request']
        permitidos = roles_asignables_en_peticion(request)

        no_permitidos = [
            rol for rol in roles
            if rol not in permitidos
        ]

        if no_permitidos:
            raise serializers.ValidationError(
                'No tiene permiso para asignar el rol: '
                + ', '.join(no_permitidos)
                + '.'
            )

        return roles

    def validate(self, datos):
        # La contraseña solo se valida si fue enviada.
        if 'password' in datos:
            try:
                validate_password(
                    datos['password'],
                    user=self.instance,
                )
            except Exception as error:
                raise serializers.ValidationError({
                    'password': list(error.messages)
                })

        return datos

    @transaction.atomic
    def update(self, usuario, datos):
        password = datos.pop('password', None)
        roles_solicitados = datos.pop('roles', None)
        actualizar_institucion = 'institucion' in datos
        institucion = datos.pop('institucion', None)

        # Actualización de los datos personales.
        for campo in ('first_name', 'last_name', 'email'):
            if campo in datos:
                setattr(usuario, campo, datos[campo])

        # El correo también es el nombre de usuario.
        if 'email' in datos:
            usuario.username = datos['email']

        # La contraseña nunca se guarda directamente.
        if password is not None:
            usuario.set_password(password)

        usuario.save()

        # Actualización del perfil y su institución.
        if actualizar_institucion:
            perfil, _ = PerfilUsuario.objects.get_or_create(
                usuario=usuario,
                defaults={'institucion': institucion},
            )

            perfil.institucion = institucion
            perfil.save(update_fields=['institucion'])

        # Los roles solo cambian si el campo fue enviado.
        if roles_solicitados is not None:
            request = self.context['request']
            permitidos = roles_asignables_en_peticion(request)

            # Conserva los roles actuales que el rol activo no puede
            # administrar. Por ejemplo, COMITE no elimina un ADMIN existente.
            roles_actuales = set(roles_de(usuario))
            roles_protegidos = roles_actuales - permitidos

            roles_finales_set = set(roles_solicitados) | roles_protegidos

            roles_finales = [
                rol for rol in ROLES_VALIDOS
                if rol in roles_finales_set
            ]

            # Elimina las asignaciones anteriores que sí puede administrar
            # y agrega la selección nueva.
            UsuarioRol.objects.filter(
                usuario=usuario,
                rol__nombre_rol__in=ROLES_VALIDOS,
            ).exclude(
                rol__nombre_rol__in=roles_finales
            ).delete()

            asignar_roles(usuario, roles_finales)

        return usuario
