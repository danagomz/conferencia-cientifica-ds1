"""SDGC-182 (HU-032): control de permisos para consultar los artículos propios.

Piezas reutilizables por el endpoint de "artículos propios" (SDGC-181) y por el detalle:

- PuedeConsultarArticulosPropios: solo usuarios con rol AUTOR y sesión iniciada.
- articulos_propios(usuario): únicamente los artículos asociados a la cuenta, sin
  importar el rol (a diferencia de articulos_permitidos, que da todo a ADMIN y COMITE).
- EsAutorDelArticulo: permiso de objeto; impide abrir el detalle de un artículo ajeno.
"""
from django.db.models import Q
from rest_framework.permissions import BasePermission

from .permisos_consulta import es_autor
from .queries import consultar_articulos


def articulos_propios(usuario):
    """Artículos que el usuario registró o en los que figura como autor."""
    return consultar_articulos().filter(
        Q(id_usuario_registra=usuario) | Q(autores__id_usuario=usuario)
    ).distinct()


class PuedeConsultarArticulosPropios(BasePermission):
    message = 'Solo los autores pueden consultar sus artículos.'

    def has_permission(self, request, view):
        usuario = request.user
        return bool(usuario and usuario.is_authenticated and es_autor(usuario))


class EsAutorDelArticulo(BasePermission):
    message = 'Este artículo no está asociado a tu cuenta.'

    def has_object_permission(self, request, view, obj):
        return articulos_propios(request.user).filter(pk=obj.pk).exists()
