from rest_framework.test import APITestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .asignaciones import asociar_evaluadores
from .tests_consulta import crear_articulo

LISTADO = '/api/articulos/'


class ListadoConEvaluadoresTests(APITestCase):
    """HU-015, CA-099: el listado indica cuántos evaluadores tiene cada artículo."""

    def setUp(self):
        conf = crear_conferencia()
        self.ia = LineaTematica.objects.create(id_conferencia=conf, nombre='IA')
        self.redes = LineaTematica.objects.create(id_conferencia=conf, nombre='Redes')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        self.admin = usuario_con_rol('admin@x.co', 'ADMIN')
        self.autor = usuario_con_rol('autor@x.co', 'AUTOR')
        self.e = [usuario_con_rol(f'e{i}@x.co', 'COMITE') for i in range(1, 5)]
        self.completo = crear_articulo(conf, self.ia, self.autor, 'Completo')
        self.parcial = crear_articulo(conf, self.ia, self.autor, 'Parcial')
        self.vacio_ia = crear_articulo(conf, self.ia, self.autor, 'Vacio IA')
        self.vacio_redes = crear_articulo(conf, self.redes, self.autor, 'Vacio Redes')
        asociar_evaluadores(self.completo, self.e[:3], self.comite)
        asociar_evaluadores(self.parcial, self.e[:2], self.comite)

    def listar(self, usuario, **params):
        self.client.force_authenticate(usuario)
        return self.client.get(LISTADO, params)

    def por_titulo(self, respuesta):
        return {r['titulo']: r for r in respuesta.json()['resultados']}

    def titulos(self, respuesta):
        return sorted(r['titulo'] for r in respuesta.json()['resultados'])

    # ---- campo evaluadores_asignados ----
    def test_comite_y_administrador_ven_la_cantidad_de_evaluadores(self):
        for usuario in (self.comite, self.admin):
            datos = self.por_titulo(self.listar(usuario))
            self.assertEqual(datos['Completo']['evaluadores_asignados'], 3)
            self.assertEqual(datos['Parcial']['evaluadores_asignados'], 2)
            self.assertEqual(datos['Vacio IA']['evaluadores_asignados'], 0)

    def test_reasignar_no_duplica_la_cantidad(self):
        asociar_evaluadores(self.completo, self.e[1:4], self.comite)
        datos = self.por_titulo(self.listar(self.comite))
        self.assertEqual(datos['Completo']['evaluadores_asignados'], 3)

    def test_el_listado_conserva_los_demas_datos_y_no_repite_articulos(self):
        respuesta = self.listar(self.comite)
        self.assertEqual(respuesta.json()['count'], 4)
        primero = respuesta.json()['resultados'][0]
        for campo in ('id', 'titulo', 'linea', 'estado', 'autores'):
            self.assertIn(campo, primero)

    def test_el_autor_no_ve_la_cantidad_de_evaluadores(self):
        respuesta = self.listar(self.autor)
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()['count'], 4)
        for resultado in respuesta.json()['resultados']:
            self.assertNotIn('evaluadores_asignados', resultado)

    def test_ni_los_articulos_propios_ni_el_detalle_traen_el_campo(self):
        self.client.force_authenticate(self.autor)
        propios = self.client.get('/api/articulos/propios/').json()['resultados']
        self.assertTrue(all('evaluadores_asignados' not in r for r in propios))
        self.client.force_authenticate(self.comite)
        detalle = self.client.get(f'/api/articulos/{self.completo.pk}/').json()
        self.assertNotIn('evaluadores_asignados', detalle)

    # ---- filtro sin_evaluadores ----
    def test_sin_evaluadores_devuelve_solo_los_que_no_tienen_ninguno(self):
        respuesta = self.listar(self.comite, sin_evaluadores='true')
        self.assertEqual(self.titulos(respuesta), ['Vacio IA', 'Vacio Redes'])
        self.assertEqual(respuesta.json()['count'], 2)

    def test_un_articulo_con_evaluadores_incompletos_no_cuenta_como_sin_evaluadores(self):
        titulos = self.titulos(self.listar(self.comite, sin_evaluadores='true'))
        self.assertNotIn('Parcial', titulos)

    def test_el_filtro_acepta_distintas_formas_de_verdadero(self):
        for valor in ('true', 'TRUE', '1', 'si'):
            respuesta = self.listar(self.admin, sin_evaluadores=valor)
            self.assertEqual(respuesta.json()['count'], 2, valor)

    def test_false_o_vacio_no_filtra(self):
        for valor in ('false', '0', ''):
            self.assertEqual(self.listar(self.comite, sin_evaluadores=valor).json()['count'], 4, valor)

    def test_un_valor_invalido_da_400(self):
        respuesta = self.listar(self.comite, sin_evaluadores='quizas')
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('sin_evaluadores', respuesta.json())

    def test_se_combina_con_los_otros_filtros(self):
        respuesta = self.listar(self.comite, sin_evaluadores='true', id_linea=self.redes.pk)
        self.assertEqual(self.titulos(respuesta), ['Vacio Redes'])
        respuesta = self.listar(self.comite, sin_evaluadores='true', q='Vacio IA')
        self.assertEqual(self.titulos(respuesta), ['Vacio IA'])

    def test_al_asignar_el_articulo_sale_de_la_lista_de_sin_evaluadores(self):
        asociar_evaluadores(self.vacio_ia, self.e[:3], self.comite)
        titulos = self.titulos(self.listar(self.comite, sin_evaluadores='true'))
        self.assertEqual(titulos, ['Vacio Redes'])

    def test_si_todos_tienen_evaluadores_el_resultado_queda_vacio(self):
        asociar_evaluadores(self.vacio_ia, self.e[:3], self.comite)
        asociar_evaluadores(self.vacio_redes, self.e[:3], self.comite)
        respuesta = self.listar(self.comite, sin_evaluadores='true')
        self.assertEqual(respuesta.json()['count'], 0)
        self.assertEqual(respuesta.json()['resultados'], [])

    def test_el_autor_no_puede_usar_el_filtro_y_recibe_sus_articulos_sin_filtrar(self):
        respuesta = self.listar(self.autor, sin_evaluadores='true')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()['count'], 4)

    def test_sin_sesion_no_hay_acceso(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(LISTADO, {'sin_evaluadores': 'true'}).status_code, 401)
