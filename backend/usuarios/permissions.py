from rest_framework.permissions import BasePermission

from .roles import ADMIN, COMITE, nombres_de_roles

# Roles que pueden crear usuarios.
ROLES_QUE_CREAN_USUARIOS = (ADMIN, COMITE)


class EsAdminOComite(BasePermission):
    """Solo el administrador o un miembro del comité científico pasan."""

    message = 'Solo el administrador o el comité científico pueden crear usuarios.'

    def has_permission(self, request, view):
        usuario = request.user
        if not usuario or not usuario.is_authenticated:
            return False
        if usuario.is_superuser:
            return True
        return bool(nombres_de_roles(usuario) & set(ROLES_QUE_CREAN_USUARIOS))