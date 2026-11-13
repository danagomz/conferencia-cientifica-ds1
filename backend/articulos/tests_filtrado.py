from rest_framework.test import APITestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .tests_consulta import crear_articulo

URL = '/api/articulos/'


class LogicaDeFiltradoTests(APITestCase):
    """SDGC-158: la lógica de filtrado por línea temática y estado, sola y combinada."""

    def setUp(self):
        self.conf = crear_conferencia()
        self.ia = LineaTematica.objects.create(id_conferencia=self.conf, nombre='IA')
        self.bd = LineaTematica.objects.create(id_conferencia=self.conf, nombre='Bases de datos')
        self.autor = usuario_con_rol('autor@x.co', 'AUTOR')
        self.otro = usuario_con_rol('otro@x.co', 'AUTOR')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        self.a = crear_articulo(self.conf, self.ia, self.autor, 'A', 'ACEPTADO')
        self.b = crear_articulo(self.conf, self.ia, self.autor, 'B', 'REGISTRADO')
        self.c = crear_articulo(self.conf, self.bd, self.autor, 'C', 'ACEPTADO')
        self.d = crear_articulo(self.conf, self.bd, self.otro, 'D', 'RECHAZADO')
        self.e = crear_articulo(self.conf, self.ia, self.otro, 'E', 'ACEPTADO', habilitado=False)

    def ids(self, usuario, **params):
        self.client.force_authenticate(usuario)
        r = self.client.get(URL, params)
        self.assertEqual(r.status_code, 200)
        return {x['id'] for x in r.data['resultados']}

    def pks(self, *arts):
        return {a.id_articulo for a in arts}

    def test_sin_filtros_devuelve_el_listado_general(self):
        self.assertEqual(self.ids(self.comite), self.pks(self.a, self.b, self.c, self.d))

    def test_filtra_por_linea_tematica(self):
        self.assertEqual(self.ids(self.comite, id_linea=self.ia.id_linea), self.pks(self.a, self.b))

    def test_filtra_por_estado(self):
        self.assertEqual(self.ids(self.comite, estado='ACEPTADO'), self.pks(self.a, self.c))

    def test_el_estado_no_distingue_mayusculas(self):
        self.assertEqual(self.ids(self.comite, estado='aceptado'), self.pks(self.a, self.c))

    def test_combina_linea_y_estado(self):
        self.assertEqual(
            self.ids(self.comite, id_linea=self.ia.id_linea, estado='ACEPTADO'), self.pks(self.a)
        )
        self.assertEqual(
            self.ids(self.comite, id_linea=self.bd.id_linea, estado='ACEPTADO'), self.pks(self.c)
        )

    def test_combinacion_sin_coincidencias_devuelve_lista_vacia(self):
        self.assertEqual(self.ids(self.comite, id_linea=self.ia.id_linea, estado='RECHAZADO'), set())

    def test_los_filtros_no_muestran_articulos_deshabilitados(self):
        # E está deshabilitado: no sale ni filtrando exactamente por su línea y estado.
        self.assertNotIn(self.e.id_articulo, self.ids(self.comite, id_linea=self.ia.id_linea, estado='ACEPTADO'))

    def test_el_autor_filtra_solo_entre_sus_articulos(self):
        self.assertEqual(self.ids(self.autor, estado='ACEPTADO'), self.pks(self.a, self.c))
        self.assertEqual(self.ids(self.autor, estado='RECHAZADO'), set())  # D es de otro autor
        self.assertEqual(self.ids(self.otro, estado='RECHAZADO'), self.pks(self.d))

    def test_quitar_los_filtros_vuelve_al_listado_general(self):
        self.assertEqual(self.ids(self.autor, estado='ACEPTADO'), self.pks(self.a, self.c))
        self.assertEqual(self.ids(self.autor), self.pks(self.a, self.b, self.c))

    def test_sin_coincidencias_informa_que_no_se_encontraron_resultados(self):
        self.client.force_authenticate(self.autor)
        r = self.client.get(URL, {'estado': 'RECHAZADO'})
        self.assertEqual(r.data['count'], 0)
        self.assertIn('No se encontraron', r.data['mensaje'])

    def test_estado_invalido_da_400_con_las_opciones(self):
        self.client.force_authenticate(self.comite)
        r = self.client.get(URL, {'estado': 'INVENTADO'})
        self.assertEqual(r.status_code, 400)
        self.assertIn('ACEPTADO', str(r.data['estado']))

    def test_linea_inexistente_da_400(self):
        self.client.force_authenticate(self.comite)
        r = self.client.get(URL, {'id_linea': 9999})
        self.assertEqual(r.status_code, 400)
        self.assertIn('id_linea', r.data)

    def test_valores_vacios_se_ignoran(self):
        self.assertEqual(self.ids(self.comite, id_linea='', estado=''), self.pks(self.a, self.b, self.c, self.d))
