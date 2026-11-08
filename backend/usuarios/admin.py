
from django.contrib import admin
from .models import PerfilUsuario, Rol, UsuarioRol


# Permite administrar los perfiles desde Django Admin.
@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):

    list_display = ('usuario', 'institucion')

    search_fields = (
        'usuario__first_name',
        'usuario__last_name',
        'usuario__email',
        'institucion',
    )


# Permite administrar los roles del sistema.
@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):

    list_display = ('id_rol', 'nombre_rol', 'descripcion')

    search_fields = ('nombre_rol',)


# Permite administrar los roles asignados a los usuarios.
@admin.register(UsuarioRol)
class UsuarioRolAdmin(admin.ModelAdmin):

    list_display = ('id_usuario_rol', 'usuario', 'rol')

    list_filter = ('rol',)

    search_fields = (
        'usuario__username',
        'usuario__email',
        'rol__nombre_rol',
    )
