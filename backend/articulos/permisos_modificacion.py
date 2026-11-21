"""SDGC-178 (HU-012): control de permisos para modificar los datos generales de un artículo.

- Solo un usuario con rol AUTOR puede modificar (ADMIN y COMITE consultan, no modifican).
- Debe ser un autor asociado al artículo: quien lo registró o cualquiera de los autores
  vinculados a su cuenta, no solamente el autor responsable (el responsable solo importa
  para gestionar versiones, HU-014).
- Un artículo deshabilitado no se modifica.
"""
from rest_framework.permissions import BasePermission

from .permisos_consulta import es_autor
from .permisos_propios import articulos_propios

MENSAJE_NO_MODIFICABLE = 'Solo un autor asociado al artículo puede modificar sus datos.'
MENSAJE_NO_ASOCIADO = 'Este artículo no está asociado a tu cuenta.'


def puede_modificar_articulo(usuario, articulo):
    """True si el usuario es un autor asociado al artículo y este está habilitado."""
    if not articulo.habilitado or not es_autor(usuario):
        return False
    return articulos_propios(usuario).filter(pk=articulo.pk).exists()


class PuedeModificarArticulo(BasePermission):
    """Vista: sesión iniciada con rol AUTOR. Objeto: autor asociado al artículo."""

    message = MENSAJE_NO_MODIFICABLE

    def has_permission(self, request, view):
        usuario = request.user
        return bool(usuario and usuario.is_authenticated and es_autor(usuario))

    def has_object_permission(self, request, view, obj):
        if not puede_modificar_articulo(request.user, obj):
            self.message = MENSAJE_NO_ASOCIADO
            return False
        return True
