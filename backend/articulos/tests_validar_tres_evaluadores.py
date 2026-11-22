from rest_framework.test import APITestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .asignaciones import asociar_evaluadores, evaluadores_del_articulo
from .models import AsignacionEvaluador
from .serializers_asignaciones import MENSAJE_EVALUADOR_REPETIDO, MENSAJE_TRES_EVALUADORES
from .tests_consulta import crear_articulo


class ValidarTresEvaluadoresTests(APITestCase):
    """SDGC-197: cada artículo debe tener exactamente tres evaluadores."""

    def setUp(self):
        conf = crear_conferencia()
        linea = LineaTematica.objects.create(id_conferencia=conf, nombre='IA')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        autor = usuario_con_rol('autor@x.co', 'AUTOR')
        self.e = [usuario_con_rol(f'e{i}@x.co', 'COMITE') for i in range(1, 6)]
        self.articulo = crear_articulo(conf, linea, autor)
        self.url = f'/api/articulos/{self.articulo.pk}/evaluadores/'
        self.client.force_authenticate(self.comite)

    def asignar(self, usuarios):
        return self.client.post(self.url, {'evaluadores': [u.pk for u in usuarios]}, format='json')

    def cantidad(self):
        return AsignacionEvaluador.objects.filter(id_articulo=self.articulo).count()

    def test_acepta_exactamente_tres_evaluadores(self):
        respuesta = self.asignar(self.e[:3])
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(self.cantidad(), 3)

    def test_rechaza_menos_de_tres(self):
        for cantidad in (1, 2):
            respuesta = self.asignar(self.e[:cantidad])
            self.assertEqual(respuesta.status_code, 400)
            self.assertEqual(respuesta.json()['evaluadores'], [MENSAJE_TRES_EVALUADORES])
        self.assertEqual(self.cantidad(), 0)

    def test_rechaza_mas_de_tres(self):
        for cantidad in (4, 5):
            respuesta = self.asignar(self.e[:cantidad])
            self.assertEqual(respuesta.status_code, 400)
            self.assertEqual(respuesta.json()['evaluadores'], [MENSAJE_TRES_EVALUADORES])
        self.assertEqual(self.cantidad(), 0)

    def test_rechaza_la_lista_vacia_con_el_mismo_mensaje(self):
        respuesta = self.client.post(self.url, {'evaluadores': []}, format='json')
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.json()['evaluadores'], [MENSAJE_TRES_EVALUADORES])

    def test_rechaza_cuando_no_se_envia_la_lista(self):
        respuesta = self.client.post(self.url, {}, format='json')
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('evaluadores', respuesta.json())

    def test_rechaza_repetir_al_mismo_evaluador(self):
        respuesta = self.asignar([self.e[0], self.e[0], self.e[1]])
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.json()['evaluadores'], [MENSAJE_EVALUADOR_REPETIDO])
        self.assertEqual(self.cantidad(), 0)

    def test_tres_veces_el_mismo_evaluador_tampoco_cuenta_como_tres(self):
        respuesta = self.asignar([self.e[0]] * 3)
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(self.cantidad(), 0)

    def test_un_intento_invalido_conserva_la_asignacion_anterior(self):
        asociar_evaluadores(self.articulo, self.e[:3], self.comite)
        respuesta = self.asignar(self.e[1:3])
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(evaluadores_del_articulo(self.articulo), self.e[:3])

    def test_reasignar_con_tres_validos_reemplaza_la_anterior(self):
        asociar_evaluadores(self.articulo, self.e[:3], self.comite)
        respuesta = self.asignar(self.e[2:5])
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(evaluadores_del_articulo(self.articulo), self.e[2:5])

    def test_un_id_inexistente_se_rechaza(self):
        datos = {'evaluadores': [self.e[0].pk, self.e[1].pk, 999999]}
        respuesta = self.client.post(self.url, datos, format='json')
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(self.cantidad(), 0)
