from rest_framework.test import APITestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from articulos.tests_consulta import crear_articulo
from articulos.models import AsignacionEvaluador


class RegistrarAsignacionEvaluadoresTests(APITestCase):
    """Pruebas de SDGC-199: registrar la asignación de evaluadores."""

    def setUp(self):
        self.conf = crear_conferencia()
        self.linea = LineaTematica.objects.create(
            id_conferencia=self.conf,
            nombre='Inteligencia artificial',
        )

        self.admin = usuario_con_rol('admin_asig@x.co', 'ADMIN')
        self.comite = usuario_con_rol('comite_asig@x.co', 'COMITE')
        self.autor = usuario_con_rol('autor_asig@x.co', 'AUTOR')

        self.evaluador1 = usuario_con_rol('eval1@x.co', 'COMITE')
        self.evaluador2 = usuario_con_rol('eval2@x.co', 'COMITE')
        self.evaluador3 = usuario_con_rol('eval3@x.co', 'COMITE')

        self.articulo = crear_articulo(
            self.conf,
            self.linea,
            self.autor,
        )

        self.url = f'/api/articulos/{self.articulo.pk}/evaluadores/'

        self.datos = {
            'evaluadores': [
                self.evaluador1.pk,
                self.evaluador2.pk,
                self.evaluador3.pk,
            ]
        }

    def test_comite_puede_registrar_evaluadores(self):
        self.client.force_authenticate(self.comite)

        respuesta = self.client.post(self.url, self.datos, format='json')

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(
            AsignacionEvaluador.objects.filter(
                id_articulo=self.articulo
            ).count(),
            3,
        )

    def test_admin_puede_registrar_evaluadores(self):
        self.client.force_authenticate(self.admin)

        respuesta = self.client.post(self.url, self.datos, format='json')

        self.assertEqual(respuesta.status_code, 201)

    def test_autor_no_puede_registrar_evaluadores(self):
        self.client.force_authenticate(self.autor)

        respuesta = self.client.post(self.url, self.datos, format='json')

        self.assertEqual(respuesta.status_code, 403)

    def test_articulo_inexistente_devuelve_404(self):
        self.client.force_authenticate(self.comite)

        respuesta = self.client.post(
            '/api/articulos/999999/evaluadores/',
            self.datos,
            format='json',
        )

        self.assertEqual(respuesta.status_code, 404)

    def test_ids_de_evaluadores_inexistentes_devuelven_400(self):
        self.client.force_authenticate(self.comite)

        respuesta = self.client.post(
            self.url,
            {'evaluadores': [999999]},
            format='json',
        )

        self.assertEqual(respuesta.status_code, 400)

    def test_lista_vacia_de_evaluadores_devuelve_400(self):
        self.client.force_authenticate(self.comite)

        respuesta = self.client.post(
            self.url,
            {'evaluadores': []},
            format='json',
        )

        self.assertEqual(respuesta.status_code, 400)
