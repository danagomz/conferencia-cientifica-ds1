"""SDGC-154 (HU-011): control de permisos sobre la información del detalle de un artículo.

- ADMIN y COMITE consultan el detalle de todos los artículos habilitados.
- AUTOR consulta el detalle solo de los artículos asociados a su cuenta (los que registró o
  donde figura como autor).
- Un artículo deshabilitado no se consulta para nadie (no es información operativa).
"""
from .permisos_consulta import PuedeConsultarArticulos, articulos_permitidos

MENSAJE_NO_DISPONIBLE = 'El artículo no existe o no está disponible.'
MENSAJE_NO_ASOCIADO = 'Este artículo no está asociado a tu cuenta.'


def puede_ver_articulo(usuario, articulo):
    """True si el usuario puede consultar el detalle de este artículo habilitado."""
    if not articulo.habilitado:
        return False
    return articulos_permitidos(type(articulo).objects.filter(pk=articulo.pk), usuario).exists()


class PuedeConsultarDetalleArticulo(PuedeConsultarArticulos):
    """Vista: sesión iniciada con rol de administrador, comité o autor.

    Objeto: el artículo debe estar entre los que el usuario puede ver.
    """

    message = 'Tu cuenta no tiene permiso para consultar este artículo.'

    def has_object_permission(self, request, view, obj):
        return puede_ver_articulo(request.user, obj)
