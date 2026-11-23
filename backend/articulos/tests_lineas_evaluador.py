from django.db import IntegrityError, transaction
from rest_framework.test import APITestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .models import EvaluadorLinea
from .tests_consulta import crear_articulo


class LineasDeExperienciaDelEvaluadorTests(APITestCase):
    """SDGC-195 / CA-105A: la selección considera las áreas de conocimiento de los evaluadores."""

    def setUp(self):
        self.conf = crear_conferencia()
        self.otra = crear_conferencia('Congreso B', '2026')
        self.ia = LineaTematica.objects.create(id_conferencia=self.conf, nombre='Inteligencia artificial')
        self.bd = LineaTematica.objects.create(id_conferencia=self.conf, nombre='Bases de datos')
        self.redes = LineaTematica.objects.create(id_conferencia=self.otra, nombre='Redes')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        self.autor = usuario_con_rol('autor@x.co', 'AUTOR')
        self.eva = usuario_con_rol('eva@x.co', 'COMITE')
        self.beto = usuario_con_rol('beto@x.co', 'COMITE')
        self.carla = usuario_con_rol('carla@x.co', 'COMITE')
        for usuario, nombre in ((self.eva, 'Eva'), (self.beto, 'Beto'), (self.carla, 'Carla')):
            usuario.first_name = nombre
            usuario.save()
        self.articulo = crear_articulo(self.conf, self.ia, self.autor, 'Modelos generativos')
        self.url = f'/api/articulos/{self.articulo.pk}/evaluadores/candidatos/'
        self.client.force_authenticate(self.comite)

    def candidatos(self):
        respuesta = self.client.get(self.url)
        self.assertEqual(respuesta.status_code, 200)
        return {e['correo']: e for e in respuesta.json()['evaluadores']}, [
            e['correo'] for e in respuesta.json()['evaluadores']
        ]

    def test_cada_candidato_trae_sus_lineas_tematicas(self):
        EvaluadorLinea.objects.create(id_usuario=self.eva, id_linea=self.ia)
        EvaluadorLinea.objects.create(id_usuario=self.eva, id_linea=self.bd)
        datos, _ = self.candidatos()
        self.assertCountEqual(
            datos['eva@x.co']['lineas_tematicas'], ['Inteligencia artificial', 'Bases de datos']
        )

    def test_marca_la_coincidencia_con_la_linea_del_articulo(self):
        EvaluadorLinea.objects.create(id_usuario=self.eva, id_linea=self.ia)
        EvaluadorLinea.objects.create(id_usuario=self.beto, id_linea=self.bd)
        datos, _ = self.candidatos()
        self.assertTrue(datos['eva@x.co']['coincide_linea_tematica'])
        self.assertFalse(datos['beto@x.co']['coincide_linea_tematica'])

    def test_un_evaluador_sin_lineas_no_coincide_y_trae_lista_vacia(self):
        datos, _ = self.candidatos()
        self.assertEqual(datos['carla@x.co']['lineas_tematicas'], [])
        self.assertFalse(datos['carla@x.co']['coincide_linea_tematica'])

    def test_quienes_coinciden_aparecen_primero(self):
        EvaluadorLinea.objects.create(id_usuario=self.carla, id_linea=self.ia)
        _, orden = self.candidatos()
        self.assertEqual(orden[0], 'carla@x.co')

    def test_el_orden_entre_los_que_coinciden_es_por_nombre(self):
        EvaluadorLinea.objects.create(id_usuario=self.carla, id_linea=self.ia)
        EvaluadorLinea.objects.create(id_usuario=self.eva, id_linea=self.ia)
        _, orden = self.candidatos()
        self.assertEqual(orden[:2], ['carla@x.co', 'eva@x.co'])

    def test_las_lineas_de_otra_conferencia_no_se_muestran_ni_coinciden(self):
        EvaluadorLinea.objects.create(id_usuario=self.eva, id_linea=self.redes)
        datos, _ = self.candidatos()
        self.assertEqual(datos['eva@x.co']['lineas_tematicas'], [])
        self.assertFalse(datos['eva@x.co']['coincide_linea_tematica'])

    def test_no_se_repite_la_misma_linea_para_un_evaluador(self):
        EvaluadorLinea.objects.create(id_usuario=self.eva, id_linea=self.ia)
        with self.assertRaises(IntegrityError), transaction.atomic():
            EvaluadorLinea.objects.create(id_usuario=self.eva, id_linea=self.ia)

    def test_la_coincidencia_no_excluye_a_quienes_no_la_tienen(self):
        EvaluadorLinea.objects.create(id_usuario=self.eva, id_linea=self.ia)
        _, orden = self.candidatos()
        self.assertCountEqual(orden, ['comite@x.co', 'eva@x.co', 'beto@x.co', 'carla@x.co'])

    def test_al_borrar_la_linea_se_borran_sus_asociaciones(self):
        EvaluadorLinea.objects.create(id_usuario=self.eva, id_linea=self.bd)
        self.bd.delete()
        self.assertEqual(EvaluadorLinea.objects.count(), 0)

    def test_una_cuenta_con_varias_lineas_aparece_una_sola_vez(self):
        EvaluadorLinea.objects.create(id_usuario=self.eva, id_linea=self.ia)
        EvaluadorLinea.objects.create(id_usuario=self.eva, id_linea=self.bd)
        _, orden = self.candidatos()
        self.assertEqual(orden.count('eva@x.co'), 1)
