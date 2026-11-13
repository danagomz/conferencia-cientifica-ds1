from django.test import TestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .permisos_propios import articulos_propios
from .tests_consulta import crear_articulo


class ConsultarArticulosPropiosTests(TestCase):
    """SDGC-179: consulta de articulos asociados al autor."""

    def setUp(self):
        self.conferencia = crear_conferencia()
        self.linea = LineaTematica.objects.create(
            id_conferencia=self.conferencia,
            nombre='Inteligencia Artificial'
        )
        self.autor = usuario_con_rol('autor179@x.co', 'AUTOR')

        self.articulo_habilitado = crear_articulo(
            self.conferencia,
            self.linea,
            self.autor,
            titulo='Articulo habilitado'
        )

        self.articulo_deshabilitado = crear_articulo(
            self.conferencia,
            self.linea,
            self.autor,
            titulo='Articulo deshabilitado'
        )

        self.articulo_deshabilitado.habilitado = False
        self.articulo_deshabilitado.save()

    def test_consulta_propia_excluye_articulos_deshabilitados(self):
        articulos = articulos_propios(self.autor)
        ids = {articulo.id_articulo for articulo in articulos}

        self.assertIn(self.articulo_habilitado.id_articulo, ids)
        self.assertNotIn(self.articulo_deshabilitado.id_articulo, ids)
