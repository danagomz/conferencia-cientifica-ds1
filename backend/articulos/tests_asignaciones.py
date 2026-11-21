from django.db import IntegrityError, transaction
from django.test import TestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .asignaciones import asociar_evaluadores, evaluadores_del_articulo
from .models import AsignacionEvaluador
from .tests_consulta import crear_articulo


class AsociarEvaluadoresTests(TestCase):
    """SDGC-201: asociar y conservar los evaluadores de cada artículo."""

    def setUp(self):
        conf = crear_conferencia()
        linea = LineaTematica.objects.create(id_conferencia=conf, nombre='IA')
        autor = usuario_con_rol('autor@x.co', 'AUTOR')
        self.comite = usuario_con_rol('c0@x.co', 'COMITE')
        self.evaluadores = [usuario_con_rol(f'e{i}@x.co', 'COMITE') for i in range(1, 5)]
        self.art1 = crear_articulo(conf, linea, autor, 'Uno')
        self.art2 = crear_articulo(conf, linea, autor, 'Dos')

    def test_guarda_los_evaluadores_asociados_al_articulo(self):
        creadas = asociar_evaluadores(self.art1, self.evaluadores[:3], self.comite)
        self.assertEqual(len(creadas), 3)
        self.assertEqual(AsignacionEvaluador.objects.filter(id_articulo=self.art1).count(), 3)

    def test_registra_quien_asigna_fecha_y_estado(self):
        asociar_evaluadores(self.art1, self.evaluadores[:3], self.comite)
        asignacion = AsignacionEvaluador.objects.filter(id_articulo=self.art1).first()
        self.assertEqual(asignacion.id_usuario_asigna, self.comite)
        self.assertIsNotNone(asignacion.fecha_asignacion)
        self.assertEqual(asignacion.estado_asignacion, 'ASIGNADA')

    def test_los_evaluadores_se_pueden_consultar_despues(self):
        asociar_evaluadores(self.art1, self.evaluadores[:3], self.comite)
        self.assertEqual(evaluadores_del_articulo(self.art1), self.evaluadores[:3])

    def test_cada_articulo_conserva_sus_propios_evaluadores(self):
        asociar_evaluadores(self.art1, self.evaluadores[:3], self.comite)
        asociar_evaluadores(self.art2, self.evaluadores[1:4], self.comite)
        self.assertEqual(evaluadores_del_articulo(self.art1), self.evaluadores[:3])
        self.assertEqual(evaluadores_del_articulo(self.art2), self.evaluadores[1:4])

    def test_reasignar_reemplaza_la_asignacion_anterior(self):
        asociar_evaluadores(self.art1, self.evaluadores[:3], self.comite)
        asociar_evaluadores(self.art1, self.evaluadores[1:4], self.comite)
        self.assertEqual(evaluadores_del_articulo(self.art1), self.evaluadores[1:4])

    def test_no_permite_el_mismo_evaluador_dos_veces_en_un_articulo(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            asociar_evaluadores(self.art1, [self.evaluadores[0], self.evaluadores[0]], self.comite)
        self.assertEqual(AsignacionEvaluador.objects.filter(id_articulo=self.art1).count(), 0)

    def test_si_falla_se_conserva_la_asignacion_anterior(self):
        asociar_evaluadores(self.art1, self.evaluadores[:3], self.comite)
        with self.assertRaises(IntegrityError), transaction.atomic():
            asociar_evaluadores(self.art1, [self.evaluadores[3], self.evaluadores[3]], self.comite)
        self.assertEqual(evaluadores_del_articulo(self.art1), self.evaluadores[:3])
