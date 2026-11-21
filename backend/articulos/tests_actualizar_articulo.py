
from rest_framework.test import APITestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .models import Articulo
from .serializers import ArticuloActualizarSerializer
from .tests_consulta import crear_articulo


class ArticuloActualizarDatosTests(APITestCase):
    """SDGC-175: actualización y persistencia de datos generales."""

    def setUp(self):
        self.conf = crear_conferencia()
        self.linea = LineaTematica.objects.create(
            id_conferencia=self.conf,
            nombre='Inteligencia artificial',
        )
        self.autor = usuario_con_rol('autor_actualizar@x.co', 'AUTOR')

        self.articulo = crear_articulo(
            self.conf,
            self.linea,
            self.autor,
            titulo='Artículo original',
        )

    def test_actualiza_titulo_y_guarda_en_base_de_datos(self):
        serializer = ArticuloActualizarSerializer(
            self.articulo,
            data={'titulo': 'Artículo actualizado'},
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.articulo.refresh_from_db()

        self.assertEqual(self.articulo.titulo, 'Artículo actualizado')

    def test_conserva_datos_que_no_se_modifican(self):
        resumen_original = self.articulo.resumen
        palabras_originales = self.articulo.palabras_clave

        serializer = ArticuloActualizarSerializer(
            self.articulo,
            data={'titulo': 'Nuevo título'},
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.articulo.refresh_from_db()

        self.assertEqual(self.articulo.titulo, 'Nuevo título')
        self.assertEqual(self.articulo.resumen, resumen_original)
        self.assertEqual(self.articulo.palabras_clave, palabras_originales)
