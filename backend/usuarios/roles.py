from .models import Rol, UsuarioRol

# Los tres tipos de usuario (roles) del sistema.
ADMIN = 'ADMIN'
COMITE = 'COMITE'
AUTOR = 'AUTOR'
ROLES_VALIDOS = (ADMIN, COMITE, AUTOR)

# Descripción que se guarda en la tabla Rol si el rol aún no existe.
DESCRIPCIONES = {
    ADMIN: 'Administrador del sistema',
    COMITE: 'Miembro del comité científico',
    AUTOR: 'Autor de artículos',
}

# Roles que cada tipo de usuario puede asignar al crear una cuenta.
# El administrador asigna cualquiera; el comité no puede crear administradores.
# (Si el equipo decide otra regla, solo se cambia este diccionario.)
ROLES_QUE_PUEDE_ASIGNAR = {
    ADMIN: (ADMIN, COMITE, AUTOR),
    COMITE: (COMITE, AUTOR),
}


def nombres_de_roles(usuario):
    """Nombres de los roles guardados para el usuario (tablas Rol y UsuarioRol)."""
    return set(
        UsuarioRol.objects.filter(usuario=usuario).values_list('rol__nombre_rol', flat=True)
    )


def roles_de(usuario):
    """Lista los roles del usuario, en el orden ADMIN, COMITE, AUTOR."""
    nombres = nombres_de_roles(usuario)
    return [r for r in ROLES_VALIDOS if r in nombres]


def roles_que_puede_asignar(usuario):
    """Devuelve los roles que `usuario` tiene permitido asignar."""
    if usuario.is_superuser:
        return ROLES_VALIDOS
    permitidos = set()
    for rol in nombres_de_roles(usuario):
        permitidos.update(ROLES_QUE_PUEDE_ASIGNAR.get(rol, ()))
    return tuple(r for r in ROLES_VALIDOS if r in permitidos)


def asignar_roles(usuario, roles):
    """Asigna los roles al usuario. Si el rol no existe en la tabla Rol, se crea."""
    for nombre in roles:
        rol, _ = Rol.objects.get_or_create(
            nombre_rol=nombre,
            defaults={'descripcion': DESCRIPCIONES.get(nombre, nombre)},
        )
        UsuarioRol.objects.get_or_create(usuario=usuario, rol=rol)
