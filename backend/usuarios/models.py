
from django.db import models
from django.contrib.auth.models import User


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
