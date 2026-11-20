from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.test import SimpleTestCase

from .storage import obtener_bucket, subir_pdf_articulo


class StorageArticuloTests(SimpleTestCase):

    @patch('articulos.storage.create_client')
    def test_obtener_bucket_usa_configuracion_supabase(self, crear_cliente):
        bucket_esperado = MagicMock()
        cliente = MagicMock()
        cliente.storage.from_.return_value = bucket_esperado
        crear_cliente.return_value = cliente

        resultado = obtener_bucket()

        crear_cliente.assert_called_once_with(
            settings.SUPABASE_URL,
            settings.SUPABASE_SECRET_KEY,
        )
        cliente.storage.from_.assert_called_once_with(
            settings.SUPABASE_BUCKET
        )
        self.assertIs(resultado, bucket_esperado)

    @patch('articulos.storage.obtener_bucket')
    def test_subir_pdf_articulo_envia_pdf_y_devuelve_ruta(
        self, obtener_bucket_mock
    ):
        bucket = MagicMock()
        obtener_bucket_mock.return_value = bucket

        ruta_esperada = 'articulos/15/versiones/1/archivo.pdf'
        bucket.upload.return_value = SimpleNamespace(path=ruta_esperada)

        contenido = b'%PDF-1.4 contenido de prueba'

        resultado = subir_pdf_articulo(15, 1, contenido)

        self.assertEqual(resultado, ruta_esperada)

        argumentos = bucket.upload.call_args
        ruta_generada = argumentos.kwargs['path']

        self.assertTrue(
            ruta_generada.startswith('articulos/15/versiones/1/')
        )
        self.assertTrue(ruta_generada.endswith('.pdf'))
        self.assertEqual(argumentos.kwargs['file'], contenido)
        self.assertEqual(
            argumentos.kwargs['file_options'],
            {'content-type': 'application/pdf'},
        )
