from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .models import VersionArticulo
from .tests_consulta import crear_articulo


class ArticuloDetalleDatosTests(APITestCase):
    """SDGC-153: recuperación de la información almacenada del artículo."""

    def setUp(self):
        self.conf = crear_conferencia()
        self.linea = LineaTematica.objects.create(
            id_conferencia=self.conf,
            nombre='Inteligencia artificial',
        )
        self.autor = usuario_con_rol('autor_detalle@x.co', 'AUTOR')
        self.comite = usuario_con_rol('comite_detalle@x.co', 'COMITE')

        self.articulo = crear_articulo(
            self.conf,
            self.linea,
            self.autor,
            titulo='Artículo para consultar detalle',
        )

        self.url = f'/api/articulos/{self.articulo.id_articulo}/'
        self.client.force_authenticate(self.comite)

    def test_recupera_datos_basicos_y_autores(self):
        respuesta = self.client.get(self.url)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['id'], self.articulo.id_articulo)
        self.assertEqual(
            respuesta.data['titulo'],
            'Artículo para consultar detalle',
        )
        self.assertEqual(
            respuesta.data['linea'],
            'Inteligencia artificial',
        )
        self.assertEqual(respuesta.data['autores'][0]['nombre'], 'Ana Pérez')
        self.assertTrue(respuesta.data['autores'][0]['es_responsable'])

    def test_recupera_quien_registro_el_articulo(self):
        respuesta = self.client.get(self.url)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(
            respuesta.data['registrado_por']['email'],
            self.autor.email,
        )

    def test_recupera_las_versiones_en_orden(self):
        fecha_antigua = timezone.now() - timedelta(days=2)
        fecha_reciente = timezone.now()

        VersionArticulo.objects.create(
            id_articulo=self.articulo,
            numero_version=2,
            tipo_version='CORREGIDA',
            archivo_pdf_path='privado/version2.pdf',
            nombre_archivo='version2.pdf',
            tamano_bytes=2048,
            fecha_carga=fecha_reciente,
            id_usuario_carga=self.autor,
            observaciones='Segunda versión',
        )

        VersionArticulo.objects.create(
            id_articulo=self.articulo,
            numero_version=1,
            tipo_version='ORIGINAL',
            archivo_pdf_path='privado/version1.pdf',
            nombre_archivo='version1.pdf',
            tamano_bytes=1024,
            fecha_carga=fecha_antigua,
            id_usuario_carga=self.autor,
            observaciones='Primera versión',
        )

        respuesta = self.client.get(self.url)

        self.assertEqual(respuesta.status_code, 200)
        versiones = respuesta.data['versiones']

        self.assertEqual(len(versiones), 2)
        self.assertEqual(
            [v['numero_version'] for v in versiones],
            [1, 2],
        )
        self.assertEqual(versiones[0]['nombre_archivo'], 'version1.pdf')
        self.assertEqual(versiones[1]['nombre_archivo'], 'version2.pdf')

    def test_informa_cuando_la_cesion_esta_cargada(self):
        self.articulo.archivo_cesion_path = 'privado/cesion.pdf'
        self.articulo.fecha_cesion = timezone.now()
        self.articulo.save()

        respuesta = self.client.get(self.url)

        self.assertEqual(respuesta.status_code, 200)
        self.assertTrue(respuesta.data['cesion']['cargada'])
        self.assertIsNotNone(respuesta.data['cesion']['fecha'])

    def test_informa_cuando_no_hay_cesion_cargada(self):
        respuesta = self.client.get(self.url)

        self.assertEqual(respuesta.status_code, 200)
        self.assertFalse(respuesta.data['cesion']['cargada'])
        self.assertIsNone(respuesta.data['cesion']['fecha'])

    def test_autor_asociado_recupera_sus_datos_actuales(self):
        self.client.force_authenticate(self.autor)

        respuesta = self.client.get(self.url)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(
            respuesta.data['titulo'],
            'Artículo para consultar detalle',
        )
        self.assertEqual(
            respuesta.data['resumen'],
            self.articulo.resumen,
        )
        self.assertEqual(
            respuesta.data['palabras_clave'],
            self.articulo.palabras_clave,
        )
        self.assertEqual(
            respuesta.data['autores'][0]['email'],
            'ana@x.co',
        )
