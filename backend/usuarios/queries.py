
from django.contrib.auth.models import User


def consultar_usuarios():
    """
    Recupera los usuarios habilitados con su perfil y roles asignados.
    Los usuarios se organizan por identificador.
    """
    return (
        User.objects
        .filter(is_active=True)
        .select_related('perfil')
        .prefetch_related('roles_asignados__rol')
        .order_by('id')
    )
