from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .models import Articulo, AutorArticulo

URL = '/api/articulos/'


def crear_articulo(conf, linea, registra, titulo='Un artículo', estado='REGISTRADO', claves='ia',
                   habilitado=True, dias=0):
    art = Articulo.objects.create(
        id_conferencia=conf, id_linea=linea, id_usuario_registra=registra, titulo=titulo,
        resumen='r', palabras_clave=claves, estado_articulo=estado, habilitado=habilitado,
    )
    Articulo.objects.filter(pk=art.pk).update(fecha_postulacion=timezone.now() - timedelta(days=dias))
    AutorArticulo.objects.create(
        id_articulo=art, id_usuario=registra, nombres='Ana', apellidos='Pérez', email='ana@x.co',
        institucion='Univalle', orden_autoria=1, es_responsable=True,
    )
    return art


class ConsultarArticulosTests(APITestCase):
    """SDGC-141: listado de artículos con filtros."""

    def setUp(self):
        self.conf = crear_conferencia()
        self.otra = crear_conferencia('Congreso B', '2026')
        self.ia = LineaTematica.objects.create(id_conferencia=self.conf, nombre='IA')
        self.bd = LineaTematica.objects.create(id_conferencia=self.conf, nombre='Bases de datos')
        self.lin_otra = LineaTematica.objects.create(id_conferencia=self.otra, nombre='Redes')
        self.autor = usuario_con_rol('autor@x.co', 'AUTOR')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        self.a1 = crear_articulo(self.conf, self.ia, self.autor, 'Aprendizaje profundo', 'ACEPTADO', 'redes neuronales', dias=3)
        self.a2 = crear_articulo(self.conf, self.bd, self.autor, 'Modelo relacional', 'REGISTRADO', 'sql, datos', dias=1)
        self.a3 = crear_articulo(self.otra, self.lin_otra, self.autor, 'Protocolos', 'EN_REVISION', 'tcp', dias=2)
        self.client.force_authenticate(self.comite)

    def ids(self, **params):
        r = self.client.get(URL, params)
        self.assertEqual(r.status_code, 200)
        return [a['id'] for a in r.data['resultados']]

    def test_lista_los_articulos_mas_recientes_primero(self):
        self.assertEqual(self.ids(), [self.a2.id_articulo, self.a3.id_articulo, self.a1.id_articulo])

    def test_cada_articulo_trae_la_informacion_relevante(self):
        r = self.client.get(URL, {'id_linea': self.ia.id_linea})
        art = r.data['resultados'][0]
        self.assertEqual(art['titulo'], 'Aprendizaje profundo')
        self.assertEqual(art['linea'], 'IA')
        self.assertEqual(art['estado'], 'ACEPTADO')
        self.assertEqual(art['conferencia'], 'Congreso A - 2026')
        self.assertIn('fecha', art)
        self.assertEqual(art['autores'][0]['nombre'], 'Ana Pérez')
        self.assertTrue(art['autores'][0]['es_responsable'])

    def test_solo_muestra_articulos_habilitados(self):
        self.a2.habilitado = False
        self.a2.save()
        self.assertNotIn(self.a2.id_articulo, self.ids())

    def test_filtro_por_conferencia(self):
        self.assertEqual(self.ids(id_conferencia=self.otra.id_conferencia), [self.a3.id_articulo])

    def test_filtro_por_linea(self):
        self.assertEqual(self.ids(id_linea=self.bd.id_linea), [self.a2.id_articulo])

    def test_filtro_por_estado(self):
        self.assertEqual(self.ids(estado='aceptado'), [self.a1.id_articulo])

    def test_busqueda_por_titulo_y_palabras_clave(self):
        self.assertEqual(self.ids(q='relacional'), [self.a2.id_articulo])
        self.assertEqual(self.ids(q='neuronales'), [self.a1.id_articulo])

    def test_filtros_combinados(self):
        self.assertEqual(self.ids(id_conferencia=self.conf.id_conferencia, estado='REGISTRADO'), [self.a2.id_articulo])
        self.assertEqual(self.ids(id_conferencia=self.otra.id_conferencia, estado='ACEPTADO'), [])

    def test_sin_resultados_informa_con_un_mensaje(self):
        r = self.client.get(URL, {'q': 'inexistente'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 0)
        self.assertEqual(r.data['resultados'], [])
        self.assertIn('No se encontraron', r.data['mensaje'])

    def test_con_resultados_no_hay_mensaje_de_vacio(self):
        r = self.client.get(URL)
        self.assertEqual(r.data['count'], 3)
        self.assertIsNone(r.data['mensaje'])

    def test_filtro_numerico_invalido_da_400(self):
        r = self.client.get(URL, {'id_linea': 'abc'})
        self.assertEqual(r.status_code, 400)
        self.assertIn('id_linea', r.data)

    def test_sin_sesion_no_puede_consultar(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(URL).status_code, (401, 403))
