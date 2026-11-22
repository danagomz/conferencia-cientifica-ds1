"""SDGC-86 (HU-004): control de permisos para la edición de datos de usuario.

- Cualquier usuario con sesión puede editar sus propios datos personales (CA-020, CA-021).
- ADMIN edita los datos de cualquier usuario (CA-025).
- COMITE edita los de otros usuarios, salvo los de cuentas administradoras: el comité no puede
  gestionar administradores (misma regla que al crear cuentas, ROLES_QUE_PUEDE_ASIGNAR).
- AUTOR solo edita lo propio (CA-026).
- Se respeta el rol activo (cabecera X-Rol-Activo), igual que en la consulta de HU-002.
- Qué campos se pueden cambiar (nunca rol ni contraseña, CA-028) lo controla el serializador.
"""
from rest_framework.permissions import BasePermission

from .permisos_consulta import PuedeConsultarUsuarios, rol_activo_solicitado, roles_efectivos
from .roles import ADMIN, COMITE, nombres_de_roles, roles_que_puede_asignar

MENSAJE_SIN_PERMISO = 'No tienes permiso para editar los datos de este usuario.'


def puede_editar_usuario(request, objetivo):
    """True si quien hace la petición puede editar los datos de `objetivo`."""
    usuario = request.user
    if objetivo.pk == usuario.pk:
        return True
    roles = roles_efectivos(request)
    if ADMIN in roles:
        return True
    if COMITE in roles:
        # Solo cuentas cuyos roles el comité puede gestionar (no administradores).
        gestionables = set(roles_que_puede_asignar(usuario)) | {COMITE}
        return not (nombres_de_roles(objetivo) - gestionables)
    # Superusuario sin rol activo indicado: mismo criterio que el listado de usuarios.
    return usuario.is_superuser and rol_activo_solicitado(request) is None


class PuedeEditarUsuario(BasePermission):
    """Vista: sesión iniciada y rol activo válido. Objeto: ver `puede_editar_usuario`."""

    message = MENSAJE_SIN_PERMISO

    def has_permission(self, request, view):
        return PuedeConsultarUsuarios().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        return puede_editar_usuario(request, obj)
