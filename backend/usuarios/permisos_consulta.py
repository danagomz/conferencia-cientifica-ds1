"""SDGC-125 (HU-002): permisos para consultar usuarios.

- ADMIN y COMITE consultan el listado completo.
- AUTOR consulta únicamente sus propios datos.
- Se respeta el rol activo: el frontend lo envía en la cabecera X-Rol-Activo. Si una cuenta
  tiene varios roles (por ejemplo ADMIN y AUTOR) y trabaja como AUTOR, solo ve lo suyo.
  Sin cabecera se usan todos los roles de la cuenta (compatibilidad con clientes antiguos).
"""
from rest_framework.permissions import BasePermission

from .queries import consultar_usuarios
from .roles import ADMIN, COMITE, nombres_de_roles

CABECERA_ROL_ACTIVO = 'HTTP_X_ROL_ACTIVO'  # X-Rol-Activo
ROLES_CON_LISTADO_COMPLETO = {ADMIN, COMITE}


def rol_activo_solicitado(request):
    """Rol enviado en la cabecera, en mayúsculas, o None si no vino."""
    valor = request.META.get(CABECERA_ROL_ACTIVO, '').strip().upper()
    return valor or None


def roles_efectivos(request):
    """Roles con los que se actúa en esta petición."""
    roles = nombres_de_roles(request.user)
    activo = rol_activo_solicitado(request)
    return {activo} if activo else roles


class PuedeConsultarUsuarios(BasePermission):
    """Cualquier usuario con sesión; el rol activo, si viene, debe ser uno que la cuenta tenga."""

    message = 'El rol activo indicado no corresponde a tu cuenta.'

    def has_permission(self, request, view):
        usuario = request.user
        if not usuario or not usuario.is_authenticated:
            return False
        activo = rol_activo_solicitado(request)
        if activo and activo not in nombres_de_roles(usuario):
            return False
        return True


def usuarios_visibles(request):
    """Todos los usuarios habilitados para ADMIN y COMITE; solo la propia cuenta para el resto."""
    usuario = request.user
    consulta = consultar_usuarios()
    roles = roles_efectivos(request)
    if roles & ROLES_CON_LISTADO_COMPLETO:
        return consulta
    if usuario.is_superuser and rol_activo_solicitado(request) is None:
        return consulta
    return consulta.filter(pk=usuario.pk)
