
from django.contrib import admin
from .models import PerfilUsuario


# Permite administrar los perfiles desde Django Admin.
@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):

    # Columnas que aparecerán en el listado.
    list_display = ('usuario', 'institucion')

    # Permite buscar por nombres, apellidos, correo e institución.
    search_fields = (
        'usuario__first_name',
        'usuario__last_name',
        'usuario__email',
        'institucion',
    )
