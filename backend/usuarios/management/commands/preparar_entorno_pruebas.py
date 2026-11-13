import os
from datetime import date, timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from conferencias.models import Conferencia, LineaTematica, Plazo
from usuarios.models import PerfilUsuario
from usuarios.roles import ADMIN, AUTOR, COMITE, asignar_roles

LINEAS = [
    ('Inteligencia artificial', 'Aprendizaje automático, redes neuronales y búsqueda.'),
    ('Ingeniería de software', 'Procesos, arquitectura, pruebas y calidad del software.'),
    ('Bases de datos', 'Modelado, consultas y gestión de grandes volúmenes de datos.'),
    ('Ciberseguridad', 'Protección de sistemas, criptografía y gestión de riesgos.'),
]

USUARIOS = [
    ('admin@pruebas.co', 'Admin', 'Pruebas', ADMIN),
    ('comite@pruebas.co', 'Comité', 'Pruebas', COMITE),
    ('autor@pruebas.co', 'Autor', 'Pruebas', AUTOR),
]


class Command(BaseCommand):
    help = (
        'Deja un entorno de pruebas listo: usuarios (administrador, comité y autor), '
        'una conferencia con líneas temáticas y un plazo de postulación vigente. '
        'Se puede ejecutar varias veces sin duplicar nada. '
        'Se niega a correr sobre una base PostgreSQL (la real) salvo que se use --forzar.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--forzar', action='store_true',
                            help='Permite ejecutarlo aunque la base de datos sea PostgreSQL.')

    def handle(self, *args, **opciones):
        if settings.DATABASES['default']['ENGINE'].endswith('postgresql') and not opciones['forzar']:
            raise CommandError(
                'La base de datos es PostgreSQL (¿la real?). Este comando es solo para entornos '
                'de pruebas con SQLite. Usa --forzar si estás seguro.'
            )
        clave = os.environ.get('PRUEBAS_PASSWORD', 'Prueba#12345')
        for correo, nombre, apellido, rol in USUARIOS:
            usuario, creado = User.objects.get_or_create(
                username=correo,
                defaults={'email': correo, 'first_name': nombre, 'last_name': apellido},
            )
            if creado:
                usuario.set_password(clave)
                usuario.save()
            PerfilUsuario.objects.get_or_create(usuario=usuario, defaults={'institucion': 'Univalle'})
            asignar_roles(usuario, [rol])

        hoy = date.today()
        conferencia, _ = Conferencia.objects.get_or_create(
            nombre='Congreso de Pruebas', edicion='2027',
            defaults={
                'descripcion': 'Conferencia para las pruebas del sistema.',
                'fecha_inicio': hoy + timedelta(days=90),
                'fecha_fin': hoy + timedelta(days=93),
                'estado': 'ACTIVA',
                'zona_horaria': 'America/Bogota',
            },
        )
        for nombre, descripcion in LINEAS:
            LineaTematica.objects.get_or_create(
                id_conferencia=conferencia, nombre=nombre, defaults={'descripcion': descripcion},
            )
        ahora = timezone.now()
        Plazo.objects.get_or_create(
            id_conferencia=conferencia, tipo_plazo=Plazo.POSTULACION,
            defaults={'fecha_inicio': ahora - timedelta(days=5), 'fecha_fin': ahora + timedelta(days=60)},
        )
        self.stdout.write(self.style.SUCCESS(
            f'Entorno de pruebas listo: {len(USUARIOS)} usuarios y la conferencia '
            f'"{conferencia}" con {len(LINEAS)} líneas temáticas.'
        ))
