from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from storage3.utils import StorageException

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .models import AutorArticulo, VersionArticulo
from .tests_consulta import crear_articulo


class CargarVersionArticuloTests(APITestCase):

    def setUp(self):
        self.conf = crear_conferencia()
        self.linea = LineaTematica.objects.create(
            id_conferencia=self.conf,
            nombre='Inteligencia artificial',
        )

        self.autor = usuario_con_rol('responsable@x.co', 'AUTOR')
        self.otro_autor = usuario_con_rol('coautor@x.co', 'AUTOR')
        self.usuario_ajeno = usuario_con_rol('ajeno@x.co', 'AUTOR')

        self.articulo = crear_articulo(
            self.conf, self.linea, self.autor
        )

        AutorArticulo.objects.create(
            id_articulo=self.articulo,
            id_usuario=self.otro_autor,
            nombres='Carlos',
            apellidos='Gómez',
            email='coautor@x.co',
            institucion='Univalle',
            orden_autoria=2,
            es_responsable=False,
        )

        self.url = (
            f'/api/articulos/{self.articulo.id_articulo}/versiones/'
        )

    def archivo_pdf(self, nombre='articulo.pdf'):
        return SimpleUploadedFile(
            nombre,
            b'%PDF-1.4 contenido de prueba',
            content_type='application/pdf',
        )

    @patch(
        'articulos.views.subir_pdf_articulo',
        return_value='articulos/1/versiones/1/archivo.pdf',
    )
    def test_autor_responsable_puede_cargar_version(self, subir):
        self.client.force_authenticate(self.autor)

        respuesta = self.client.post(
            self.url,
            {'archivo': self.archivo_pdf()},
            format='multipart',
        )

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(VersionArticulo.objects.count(), 1)

        version = VersionArticulo.objects.get()
        self.assertEqual(version.id_articulo, self.articulo)
        self.assertEqual(version.numero_version, 1)
        self.assertEqual(version.tipo_version, 'ORIGINAL')
        self.assertEqual(version.nombre_archivo, 'articulo.pdf')
        self.assertEqual(version.id_usuario_carga, self.autor)
        subir.assert_called_once()

    @patch(
        'articulos.views.subir_pdf_articulo',
        side_effect=[
            'articulos/1/versiones/1/archivo1.pdf',
            'articulos/1/versiones/2/archivo2.pdf',
        ],
    )
    def test_nueva_version_conserva_las_versiones_anteriores(self, subir):
        self.client.force_authenticate(self.autor)

        primera_respuesta = self.client.post(
            self.url,
            {'archivo': self.archivo_pdf('articulo.pdf')},
            format='multipart',
        )

        segunda_respuesta = self.client.post(
            self.url,
            {'archivo': self.archivo_pdf('articulo_corregido.pdf')},
            format='multipart',
        )

        self.assertEqual(primera_respuesta.status_code, 201)
        self.assertEqual(segunda_respuesta.status_code, 201)

        versiones = VersionArticulo.objects.filter(
            id_articulo=self.articulo
        ).order_by('numero_version')

        self.assertEqual(versiones.count(), 2)

        primera_version, segunda_version = list(versiones)

        self.assertEqual(primera_version.numero_version, 1)
        self.assertEqual(primera_version.tipo_version, 'ORIGINAL')
        self.assertEqual(primera_version.nombre_archivo, 'articulo.pdf')
        self.assertEqual(
            primera_version.archivo_pdf_path,
            'articulos/1/versiones/1/archivo1.pdf',
        )

        self.assertEqual(segunda_version.numero_version, 2)
        self.assertEqual(segunda_version.tipo_version, 'CORREGIDA')
        self.assertEqual(
            segunda_version.nombre_archivo,
            'articulo_corregido.pdf',
        )
        self.assertEqual(
            segunda_version.archivo_pdf_path,
            'articulos/1/versiones/2/archivo2.pdf',
        )

        self.assertEqual(primera_version.id_usuario_carga, self.autor)
        self.assertEqual(segunda_version.id_usuario_carga, self.autor)
        self.assertEqual(subir.call_count, 2)

    def test_coautor_no_responsable_no_puede_cargar(self):
        self.client.force_authenticate(self.otro_autor)

        respuesta = self.client.post(
            self.url,
            {'archivo': self.archivo_pdf()},
            format='multipart',
        )

        self.assertEqual(respuesta.status_code, 403)
        self.assertEqual(VersionArticulo.objects.count(), 0)

    def test_usuario_no_asociado_no_puede_cargar(self):
        self.client.force_authenticate(self.usuario_ajeno)

        respuesta = self.client.post(
            self.url,
            {'archivo': self.archivo_pdf()},
            format='multipart',
        )

        self.assertEqual(respuesta.status_code, 403)
        self.assertEqual(VersionArticulo.objects.count(), 0)

    def test_rechaza_carga_sin_archivo(self):
        self.client.force_authenticate(self.autor)

        respuesta = self.client.post(
            self.url,
            {},
            format='multipart',
        )

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(VersionArticulo.objects.count(), 0)

    def test_articulo_inexistente_no_permite_cargar(self):
        self.client.force_authenticate(self.autor)

        respuesta = self.client.post(
            '/api/articulos/999999/versiones/',
            {'archivo': self.archivo_pdf()},
            format='multipart',
        )

        self.assertEqual(respuesta.status_code, 404)
        self.assertEqual(VersionArticulo.objects.count(), 0)

    @patch(
        'articulos.views.subir_pdf_articulo',
        side_effect=StorageException('Error de almacenamiento'),
    )
    def test_fallo_de_supabase_no_crea_version(self, subir):
        self.client.force_authenticate(self.autor)

        respuesta = self.client.post(
            self.url,
            {'archivo': self.archivo_pdf()},
            format='multipart',
        )

        self.assertEqual(respuesta.status_code, 502)
        self.assertEqual(VersionArticulo.objects.count(), 0)
        self.assertIn(
            'No fue posible almacenar',
            respuesta.data['mensaje'],
        )
        subir.assert_called_once()
