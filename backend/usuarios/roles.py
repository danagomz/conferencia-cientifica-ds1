from django.contrib.auth.models import Group

# Los tres tipos de usuario (roles) del sistema.
ADMIN = 'ADMIN'
COMITE = 'COMITE'
AUTOR = 'AUTOR'
ROLES_VALIDOS = (ADMIN, COMITE, AUTOR)

# Roles que cada tipo de usuario puede asignar al crear una cuenta.
# El administrador asigna cualquiera; el comité no puede crear administradores.
# (Si el equipo decide otra regla, solo se cambia este diccionario.)
ROLES_QUE_PUEDE_ASIGNAR = {
    ADMIN: (ADMIN, COMITE, AUTOR),
    COMITE: (COMITE, AUTOR),
}


def roles_que_puede_asignar(usuario):
    """Devuelve los roles que `usuario` tiene permitido asignar."""
    if usuario.is_superuser:
        return ROLES_VALIDOS
    permitidos = set()
    for rol in usuario.groups.values_list('name', flat=True):
        permitidos.update(ROLES_QUE_PUEDE_ASIGNAR.get(rol, ()))
    return tuple(r for r in ROLES_VALIDOS if r in permitidos)


def asignar_roles(usuario, roles):
    """Asigna los roles al usuario. Cada rol es un Grupo de Django (se crea si no existe)."""
    for nombre in roles:
        grupo, _ = Group.objects.get_or_create(name=nombre)
        usuario.groups.add(grupo)


def roles_de(usuario):
    """Lista los roles del usuario, en el orden ADMIN, COMITE, AUTOR."""
    nombres = set(usuario.groups.values_list('name', flat=True))
    return [r for r in ROLES_VALIDOS if r in nombres]
