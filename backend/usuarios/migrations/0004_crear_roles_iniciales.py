from django.db import migrations


def crear_roles_iniciales(apps, schema_editor):
    Rol = apps.get_model('usuarios', 'Rol')

    roles = [
        ('ADMIN', 'Administrador del sistema'),
        ('COMITE', 'Miembro del comité científico'),
        ('AUTOR', 'Autor de artículos'),
    ]

    for nombre, descripcion in roles:
        Rol.objects.using(schema_editor.connection.alias).get_or_create(
            nombre_rol=nombre,
            defaults={'descripcion': descripcion}
        )


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0003_rol_usuariorol'),
    ]

    operations = [
        migrations.RunPython(
            crear_roles_iniciales,
            migrations.RunPython.noop
        ),
    ]