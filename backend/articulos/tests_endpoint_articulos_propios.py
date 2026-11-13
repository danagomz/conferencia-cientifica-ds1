
from rest_framework.test import APITestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .tests_consulta import crear_articulo


URL = '/api/articulos/propios/'


class ArticulosPropiosEndpointTests(APITestCase):
    """SDGC-181: pruebas del endpoint de consulta de articulos propios."""

    def setUp(self):
        self.conferencia = crear_conferencia()
        self.linea = LineaTematica.objects.create(
            id_conferencia=self.conferencia,
            nombre='Inteligencia Artificial',
        )

        self.autor = usuario_con_rol('autor181@x.co', 'AUTOR')
        self.otro_autor = usuario_con_rol('otro181@x.co', 'AUTOR')
        self.comite = usuario_con_rol('comite181@x.co', 'COMITE')

        self.articulo1 = crear_articulo(
            self.conferencia,
            self.linea,
            self.autor,
            titulo='Articulo de inteligencia artificial',
            estado='ACEPTADO',
        )
        self.articulo2 = crear_articulo(
            self.conferencia,
            self.linea,
            self.autor,
            titulo='Articulo de aprendizaje automatico',
            estado='REGISTRADO',
        )
        self.articulo_otro = crear_articulo(
            self.conferencia,
            self.linea,
            self.otro_autor,
            titulo='Articulo de otro autor',
        )

    def test_autor_consulta_todos_sus_articulos(self):
        self.client.force_authenticate(self.autor)

        respuesta = self.client.get(URL)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['count'], 2)

        ids = {articulo['id'] for articulo in respuesta.data['resultados']}
        self.assertEqual(
            ids,
            {self.articulo1.id_articulo, self.articulo2.id_articulo},
        )

    def test_no_muestra_articulos_de_otros_autores(self):
        self.client.force_authenticate(self.autor)

        respuesta = self.client.get(URL)

        ids = {articulo['id'] for articulo in respuesta.data['resultados']}
        self.assertNotIn(self.articulo_otro.id_articulo, ids)

    def test_respuesta_contiene_datos_del_articulo(self):
        self.client.force_authenticate(self.autor)

        respuesta = self.client.get(URL)
        articulo = next(
            item for item in respuesta.data['resultados']
            if item['id'] == self.articulo1.id_articulo
        )

        self.assertEqual(articulo['titulo'], 'Articulo de inteligencia artificial')
        self.assertEqual(articulo['estado'], 'ACEPTADO')
        self.assertEqual(articulo['linea'], 'Inteligencia Artificial')
        self.assertEqual(articulo['conferencia'], 'Congreso A - 2026')
        self.assertIn('fecha', articulo)
        self.assertEqual(articulo['autores'][0]['nombre'], 'Ana Pérez')

    def test_autor_sin_articulos_recibe_lista_vacia(self):
        autor_sin_articulos = usuario_con_rol('vacio181@x.co', 'AUTOR')
        self.client.force_authenticate(autor_sin_articulos)

        respuesta = self.client.get(URL)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['count'], 0)
        self.assertEqual(respuesta.data['resultados'], [])
        self.assertIsNotNone(respuesta.data['mensaje'])

    def test_usuario_que_no_es_autor_no_puede_consultar(self):
        self.client.force_authenticate(self.comite)

        respuesta = self.client.get(URL)

        self.assertIn(respuesta.status_code, (401, 403))
