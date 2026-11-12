from django.db.models import Q
from rest_framework.permissions import BasePermission

from usuarios.roles import ADMIN, AUTOR, COMITE, nombres_de_roles


def _roles(usuario):
    return nombres_de_roles(usuario)


def ve_todos_los_articulos(usuario):
    """El administrador y el comité científico consultan todos los artículos."""
    return usuario.is_superuser or bool(_roles(usuario) & {ADMIN, COMITE})


def es_autor(usuario):
    return AUTOR in _roles(usuario)


class PuedeConsultarArticulos(BasePermission):
    """Para consultar: sesión iniciada y rol de comité, administrador o autor (SDGC-145)."""

    message = 'Tu cuenta no tiene permiso para consultar artículos.'

    def has_permission(self, request, view):
        usuario = request.user
        if not usuario or not usuario.is_authenticated:
            return False
        return ve_todos_los_articulos(usuario) or es_autor(usuario)


def articulos_permitidos(queryset, usuario):
    """Limita el listado a lo que el usuario puede ver.

    - ADMIN y COMITE: todos los artículos.
    - AUTOR: solo los asociados a su cuenta (los que registró o donde figura como autor).
    """
    if ve_todos_los_articulos(usuario):
        return queryset
    return queryset.filter(
        Q(id_usuario_registra=usuario) | Q(autores__id_usuario=usuario)
    ).distinct()
