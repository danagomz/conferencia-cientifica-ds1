from rest_framework.permissions import BasePermission

from usuarios.roles import AUTOR, nombres_de_roles


class EsAutor(BasePermission):
    """Solo un usuario autenticado con rol AUTOR puede registrar artículos."""

    message = 'Solo un autor puede registrar artículos.'

    def has_permission(self, request, view):
        usuario = request.user
        if not usuario or not usuario.is_authenticated:
            return False
        return AUTOR in nombres_de_roles(usuario)
