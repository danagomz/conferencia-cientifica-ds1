
from django.db import models
from django.contrib.auth.models import User


class CodigoRecuperacionContrasena(models.Model):
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='codigos_recuperacion',
    )
    codigo_hash = models.CharField(max_length=128)
    creado_en = models.DateTimeField(auto_now_add=True)
    expira_en = models.DateTimeField()
    intentos = models.PositiveSmallIntegerField(default=0)
    usado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'codigo_recuperacion_contrasena'
        ordering = ['-creado_en']


# Almacena los datos complementarios del usuario.
class PerfilUsuario(models.Model):

    # Relación uno a uno con el usuario predeterminado de Django.
    usuario = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='perfil'
    )

    # Institución a la que pertenece el usuario.
    institucion = models.CharField(max_length=150)

    class Meta:
        # Nombre de la tabla en la base de datos.
        db_table = 'perfil_usuario'

        verbose_name = 'Perfil de usuario'
        verbose_name_plural = 'Perfiles de usuarios'

    # Representación del perfil como texto.
    def __str__(self):
        return f"{self.usuario.first_name} {self.usuario.last_name}"


# Almacena los roles disponibles en el sistema.
class Rol(models.Model):

    id_rol = models.AutoField(primary_key=True)

    nombre_rol = models.CharField(
        max_length=100,
        unique=True
    )

    descripcion = models.CharField(max_length=255)

    class Meta:
        db_table = 'rol'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.nombre_rol


# Relaciona los usuarios con los roles que tienen asignados.
class UsuarioRol(models.Model):

    id_usuario_rol = models.AutoField(primary_key=True)

    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column='id_usuario',
        related_name='roles_asignados'
    )

    rol = models.ForeignKey(
        Rol,
        on_delete=models.PROTECT,
        db_column='id_rol',
        related_name='usuarios_asignados'
    )

    class Meta:
        db_table = 'usuario_rol'
        verbose_name = 'Rol de usuario'
        verbose_name_plural = 'Roles de usuarios'

    def __str__(self):
        return f"{self.usuario.username} - {self.rol.nombre_rol}"
