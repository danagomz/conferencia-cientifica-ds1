
from django.contrib.auth.models import User
from django.db import transaction
from usuarios.models import PerfilUsuario, Rol, UsuarioRol


def crear_cuentas_prueba():
    contrasena_pruebas = "Prueba#2026"

    cuentas = [
        {
            "correo": "admin@pruebas.co",
            "nombre": "Ana",
            "apellido": "Gomez",
            "institucion": "Universidad del Valle",
            "rol": "ADMIN",
        },
        {
            "correo": "comite@pruebas.co",
            "nombre": "Maria",
            "apellido": "Lopez",
            "institucion": "Universidad del Cauca",
            "rol": "COMITE",
        },
        {
            "correo": "autor@pruebas.co",
            "nombre": "Carlos",
            "apellido": "Perez",
            "institucion": "Universidad Nacional",
            "rol": "AUTOR",
        },
        {
            "correo": "destino@pruebas.co",
            "nombre": "Laura",
            "apellido": "Torres",
            "institucion": "Universidad Javeriana",
            "rol": "AUTOR",
        },
    ]

    descripciones = {
        "ADMIN": "Administrador del sistema",
        "COMITE": "Miembro del comité científico",
        "AUTOR": "Autor de artículos científicos",
    }

    with transaction.atomic():

        # Crear o recuperar los roles.
        roles = {}

        for codigo, descripcion in descripciones.items():
            roles[codigo], _ = Rol.objects.get_or_create(
                nombre_rol=codigo,
                defaults={"descripcion": descripcion},
            )

        # Crear o actualizar las cuentas.
        for datos in cuentas:
            correo = datos["correo"]

            usuario, creado = User.objects.get_or_create(
                username=correo,
            )

            usuario.email = correo
            usuario.first_name = datos["nombre"]
            usuario.last_name = datos["apellido"]
            usuario.is_active = True
            usuario.set_password(contrasena_pruebas)
            usuario.save()

            PerfilUsuario.objects.update_or_create(
                usuario=usuario,
                defaults={
                    "institucion": datos["institucion"],
                },
            )

            # Asignar únicamente el rol correspondiente.
            UsuarioRol.objects.filter(
                usuario=usuario,
            ).exclude(
                rol=roles[datos["rol"]],
            ).delete()

            UsuarioRol.objects.get_or_create(
                usuario=usuario,
                rol=roles[datos["rol"]],
            )

            estado = "creado" if creado else "actualizado"

            print(
                f"{correo}: {estado} | "
                f"ID: {usuario.id} | "
                f"ROL: {datos['rol']}"
            )

    print("\nCuentas de prueba preparadas correctamente.")


crear_cuentas_prueba()
