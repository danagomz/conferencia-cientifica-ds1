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

LINEAS_QA = [
    ('Redes y comunicaciones', 'Arquitectura de redes, protocolos y sistemas distribuidos.'),
    ('Interacción humano-computador', 'Diseño de interfaces, usabilidad y experiencia de usuario.'),
    ('Ciencia de datos', 'Análisis, visualización y minería de datos.'),
]

USUARIOS = [
    ('admin@pruebas.co', 'Admin', 'Pruebas', ADMIN),
    ('comite@pruebas.co', 'Comité', 'Pruebas', COMITE),
    ('autor@pruebas.co', 'Autor', 'Pruebas', AUTOR),
    ('multirol@pruebas.co', 'Multirol', 'Pruebas', (ADMIN, AUTOR)),
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

    @staticmethod
    def _lineas(conferencia, lineas):
        for nombre, descripcion in lineas:
            LineaTematica.objects.get_or_create(
                id_conferencia=conferencia, nombre=nombre, defaults={'descripcion': descripcion},
            )

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
            asignar_roles(usuario, [rol] if isinstance(rol, str) else list(rol))

        ahora = timezone.now()
        hoy = date.today()

        # Conferencia básica: solo la etapa de postulación, abierta.
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
        self._lineas(conferencia, LINEAS)
        Plazo.objects.get_or_create(
            id_conferencia=conferencia, tipo_plazo=Plazo.POSTULACION,
            defaults={'fecha_inicio': ahora - timedelta(days=5), 'fecha_fin': ahora + timedelta(days=60)},
        )

        # Conferencia QA: las 5 etapas con fechas, en orden cronológico
        qa, _ = Conferencia.objects.get_or_create(
            nombre='Conferencia de Pruebas QA', edicion='2027',
            defaults={
                'descripcion': 'Conferencia con todas las etapas configuradas para las pruebas QA.',
                'fecha_inicio': hoy + timedelta(days=100),
                'fecha_fin': hoy + timedelta(days=103),
                'estado': 'ACTIVA',
                'zona_horaria': 'America/Bogota',
            },
        )
        self._lineas(qa, LINEAS_QA)
        etapas = [  # (etapa, desde qué día, hasta qué día) contados desde hoy
            (Plazo.POSTULACION, -5, 30),
            (Plazo.EVALUACION, 31, 50),
            (Plazo.VERSIONES_CORREGIDAS, 51, 65),
            (Plazo.PRESENTACION, 66, 75),
            (Plazo.DOCUMENTOS_FINALES, 76, 90),
        ]
        for etapa, desde, hasta in etapas:
            Plazo.objects.get_or_create(
                id_conferencia=qa, tipo_plazo=etapa,
                defaults={'fecha_inicio': ahora + timedelta(days=desde),
                          'fecha_fin': ahora + timedelta(days=hasta)},
            )
        self.stdout.write(self.style.SUCCESS(
            f'Entorno de pruebas listo: {len(USUARIOS)} usuarios y 2 conferencias '
            f'("{conferencia.nombre}" y "{qa.nombre}").'
        ))

