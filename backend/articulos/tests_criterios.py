from rest_framework.test import APITestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .filtros import ESTADOS_ARTICULO

URL = '/api/articulos/filtros/'


class CriteriosDeFiltradoTests(APITestCase):
    """SDGC-160: criterios de filtrado aprobados (línea temática y estado)."""

    def setUp(self):
        self.conf = crear_conferencia()
        self.otra = crear_conferencia('Congreso B', '2026')
        self.ia = LineaTematica.objects.create(id_conferencia=self.conf, nombre='IA')
        self.bd = LineaTematica.objects.create(id_conferencia=self.conf, nombre='Bases de datos')
        self.apagada = LineaTematica.objects.create(id_conferencia=self.conf, nombre='Obsoleta', habilitada=False)
        self.redes = LineaTematica.objects.create(id_conferencia=self.otra, nombre='Redes')
        self.autor = usuario_con_rol('autor@x.co', 'AUTOR')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')

    def criterios(self, usuario):
        self.client.force_authenticate(usuario)
        r = self.client.get(URL)
        self.assertEqual(r.status_code, 200)
        return {c['parametro']: c for c in r.data['criterios']}, r.data

    def test_los_criterios_aprobados_son_linea_tematica_y_estado(self):
        criterios, _ = self.criterios(self.comite)
        self.assertEqual(set(criterios), {'id_linea', 'estado'})
        self.assertEqual(criterios['id_linea']['etiqueta'], 'Línea temática')
        self.assertEqual(criterios['estado']['etiqueta'], 'Estado')

    def test_ofrece_las_lineas_habilitadas(self):
        criterios, _ = self.criterios(self.comite)
        nombres = [o['etiqueta'] for o in criterios['id_linea']['opciones']]
        self.assertEqual(sorted(nombres), ['Bases de datos', 'IA', 'Redes'])
        self.assertNotIn('Obsoleta', nombres)

    def test_cada_linea_indica_su_conferencia(self):
        criterios, _ = self.criterios(self.comite)
        por_nombre = {o['etiqueta']: o for o in criterios['id_linea']['opciones']}
        self.assertEqual(por_nombre['IA']['valor'], self.ia.id_linea)
        self.assertEqual(por_nombre['IA']['id_conferencia'], self.conf.id_conferencia)
        self.assertEqual(por_nombre['Redes']['id_conferencia'], self.otra.id_conferencia)

    def test_ofrece_todos_los_estados(self):
        criterios, _ = self.criterios(self.comite)
        self.assertEqual([o['valor'] for o in criterios['estado']['opciones']], list(ESTADOS_ARTICULO))

    def test_incluye_los_filtros_adicionales(self):
        _, datos = self.criterios(self.comite)
        self.assertEqual({a['parametro'] for a in datos['adicionales']}, {'id_conferencia', 'q'})

    def test_el_autor_tambien_ve_los_criterios(self):
        criterios, _ = self.criterios(self.autor)
        self.assertEqual(set(criterios), {'id_linea', 'estado'})

    def test_las_opciones_sirven_como_valores_del_filtro(self):
        criterios, _ = self.criterios(self.comite)
        for opcion in criterios['id_linea']['opciones'] + criterios['estado']['opciones']:
            parametro = 'id_linea' if 'id_conferencia' in opcion else 'estado'
            r = self.client.get('/api/articulos/', {parametro: opcion['valor']})
            self.assertEqual(r.status_code, 200)

    def test_sin_sesion_no_puede_consultar_los_criterios(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(URL).status_code, (401, 403))

    def test_usuario_sin_rol_no_puede_consultar_los_criterios(self):
        from django.contrib.auth.models import User
        self.client.force_authenticate(User.objects.create_user('n@x.co', 'n@x.co', 'Clave#12345'))
        self.assertEqual(self.client.get(URL).status_code, 403)
