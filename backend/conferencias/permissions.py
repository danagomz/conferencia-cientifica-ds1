from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAuthenticated

from usuarios.permissions import EsAdminOComite


class EsAdminOComiteOLecturaAutenticada(BasePermission):
    """Cualquier usuario con sesión puede consultar; solo ADMIN o COMITE pueden modificar."""

    message = 'Solo el administrador o el comité científico pueden modificar esta configuración.'

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return IsAuthenticated().has_permission(request, view)
        return EsAdminOComite().has_permission(request, view)
