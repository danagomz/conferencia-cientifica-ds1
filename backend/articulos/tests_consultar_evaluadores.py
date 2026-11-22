from rest_framework.test import APITestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .asignaciones import asociar_evaluadores
from .tests_consulta import crear_articulo


class ConsultarEvaluadoresAsignadosTests(APITestCase):
    """SDGC-203 (HU-015, CA-104): consultar los evaluadores ya asignados a un artículo."""

    def setUp(self):
        conf = crear_conferencia()
        linea = LineaTematica.objects.create(id_conferencia=conf, nombre='IA')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        self.admin = usuario_con_rol('admin@x.co', 'ADMIN')
        self.autor = usuario_con_rol('autor@x.co', 'AUTOR')
        self.e = [usuario_con_rol(f'e{i}@x.co', 'COMITE') for i in range(1, 5)]
        for usuario, nombre in zip(self.e, ('Ana', 'Beto', 'Carla', 'Diego')):
            usuario.first_name, usuario.last_name = nombre, 'Evaluador'
            usuario.save()
        self.articulo = crear_articulo(conf, linea, self.autor, 'Modelos generativos')
        self.otro = crear_articulo(conf, linea, self.autor, 'Otro artículo')
        self.url = f'/api/articulos/{self.articulo.pk}/evaluadores/'

    def test_devuelve_cada_evaluador_con_su_id_y_nombre(self):
        asociar_evaluadores(self.articulo, self.e[:3], self.comite)
        self.client.force_authenticate(self.comite)
        respuesta = self.client.get(self.url)
        self.assertEqual(respuesta.status_code, 200)
        datos = respuesta.json()
        self.assertEqual(datos['articulo'], {'id': self.articulo.pk, 'titulo': 'Modelos generativos'})
        self.assertEqual(datos['total'], 3)
        self.assertEqual(datos['evaluadores_requeridos'], 3)
        self.assertEqual(
            [(e['id'], e['nombre'], e['correo']) for e in datos['evaluadores']],
            [(u.pk, f'{u.first_name} Evaluador', u.email) for u in self.e[:3]],
        )
        self.assertIn('fecha_asignacion', datos['evaluadores'][0])

    def test_un_articulo_sin_asignar_devuelve_lista_vacia(self):
        self.client.force_authenticate(self.comite)
        respuesta = self.client.get(self.url)
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()['evaluadores'], [])
        self.assertEqual(respuesta.json()['total'], 0)

    def test_solo_muestra_los_evaluadores_de_ese_articulo(self):
        asociar_evaluadores(self.articulo, self.e[:3], self.comite)
        asociar_evaluadores(self.otro, self.e[1:4], self.comite)
        self.client.force_authenticate(self.comite)
        ids = [e['id'] for e in self.client.get(self.url).json()['evaluadores']]
        self.assertEqual(ids, [u.pk for u in self.e[:3]])

    def test_tras_reasignar_muestra_la_asignacion_vigente(self):
        asociar_evaluadores(self.articulo, self.e[:3], self.comite)
        asociar_evaluadores(self.articulo, self.e[1:4], self.comite)
        self.client.force_authenticate(self.comite)
        ids = [e['id'] for e in self.client.get(self.url).json()['evaluadores']]
        self.assertEqual(ids, [u.pk for u in self.e[1:4]])

    def test_el_administrador_tambien_puede_consultar(self):
        asociar_evaluadores(self.articulo, self.e[:3], self.comite)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(self.url).status_code, 200)

    def test_el_autor_no_puede_ver_quienes_evaluan_su_articulo(self):
        asociar_evaluadores(self.articulo, self.e[:3], self.comite)
        self.client.force_authenticate(self.autor)
        respuesta = self.client.get(self.url)
        self.assertEqual(respuesta.status_code, 403)
        self.assertNotIn('evaluadores', respuesta.json())

    def test_sin_sesion_no_hay_acceso(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_articulo_inexistente_o_deshabilitado_da_404(self):
        oculto = crear_articulo(
            self.articulo.id_conferencia, self.articulo.id_linea, self.autor, 'Oculto', habilitado=False
        )
        self.client.force_authenticate(self.comite)
        self.assertEqual(self.client.get('/api/articulos/99999/evaluadores/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/articulos/{oculto.pk}/evaluadores/').status_code, 404)

    def test_lo_que_devuelve_el_post_se_puede_leer_con_el_get(self):
        # La conferencia de la prueba no tiene plazo de postulación, así que la asignación no se bloquea.
        self.client.force_authenticate(self.comite)
        creado = self.client.post(
            self.url, {'evaluadores': [u.pk for u in self.e[:3]]}, format='json'
        )
        self.assertEqual(creado.status_code, 201)
        leidos = [e['id'] for e in self.client.get(self.url).json()['evaluadores']]
        self.assertEqual(leidos, [e['id_evaluador'] for e in creado.json()['evaluadores']])
