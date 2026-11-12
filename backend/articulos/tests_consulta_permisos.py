from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .models import AutorArticulo
from .tests_consulta import crear_articulo

URL = '/api/articulos/'


class PermisosDeConsultaTests(APITestCase):
    """SDGC-145: cada usuario ve solo lo que le corresponde."""

    def setUp(self):
        self.conf = crear_conferencia()
        self.linea = LineaTematica.objects.create(id_conferencia=self.conf, nombre='IA')
        self.autor1 = usuario_con_rol('autor1@x.co', 'AUTOR')
        self.autor2 = usuario_con_rol('autor2@x.co', 'AUTOR')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        self.admin = usuario_con_rol('admin@x.co', 'ADMIN')
        self.de_autor1 = crear_articulo(self.conf, self.linea, self.autor1, 'Del autor 1')
        self.de_autor2 = crear_articulo(self.conf, self.linea, self.autor2, 'Del autor 2')

    def ids(self, usuario, **params):
        self.client.force_authenticate(usuario)
        r = self.client.get(URL, params)
        self.assertEqual(r.status_code, 200)
        return {a['id'] for a in r.data['resultados']}

    def test_comite_ve_todos_los_articulos(self):
        self.assertEqual(self.ids(self.comite), {self.de_autor1.id_articulo, self.de_autor2.id_articulo})

    def test_administrador_ve_todos_los_articulos(self):
        self.assertEqual(self.ids(self.admin), {self.de_autor1.id_articulo, self.de_autor2.id_articulo})

    def test_superusuario_ve_todos_los_articulos(self):
        root = User.objects.create_superuser('root@x.co', 'root@x.co', 'Clave#12345')
        self.assertEqual(self.ids(root), {self.de_autor1.id_articulo, self.de_autor2.id_articulo})

    def test_autor_solo_ve_los_suyos(self):
        self.assertEqual(self.ids(self.autor1), {self.de_autor1.id_articulo})
        self.assertEqual(self.ids(self.autor2), {self.de_autor2.id_articulo})

    def test_autor_ve_un_articulo_donde_figura_como_coautor(self):
        AutorArticulo.objects.create(
            id_articulo=self.de_autor2, id_usuario=self.autor1, nombres='Ana', apellidos='Dos',
            email='autor1@x.co', institucion='UV', orden_autoria=2, es_responsable=False,
        )
        self.assertEqual(
            self.ids(self.autor1), {self.de_autor1.id_articulo, self.de_autor2.id_articulo}
        )

    def test_un_articulo_no_se_repite_si_el_autor_aparece_varias_veces(self):
        AutorArticulo.objects.create(
            id_articulo=self.de_autor1, id_usuario=self.autor1, nombres='Ana', apellidos='Otra vez',
            email='autor1@x.co', institucion='UV', orden_autoria=2, es_responsable=False,
        )
        self.client.force_authenticate(self.autor1)
        r = self.client.get(URL)
        self.assertEqual(r.data['count'], 1)

    def test_los_filtros_respetan_los_permisos(self):
        self.assertEqual(self.ids(self.autor1, q='Del autor 2'), set())
        self.assertEqual(self.ids(self.comite, q='Del autor 2'), {self.de_autor2.id_articulo})

    def test_autor_sin_resultados_recibe_el_mensaje(self):
        self.client.force_authenticate(self.autor1)
        r = self.client.get(URL, {'q': 'Del autor 2'})
        self.assertEqual(r.data['count'], 0)
        self.assertIn('No se encontraron', r.data['mensaje'])

    def test_usuario_sin_rol_no_puede_consultar(self):
        sin_rol = User.objects.create_user('norol@x.co', 'norol@x.co', 'Clave#12345')
        self.client.force_authenticate(sin_rol)
        r = self.client.get(URL)
        self.assertEqual(r.status_code, 403)
        self.assertIn('permiso', str(r.data['detail']))

    def test_sin_sesion_no_puede_consultar(self):
        self.assertIn(self.client.get(URL).status_code, (401, 403))

    def test_el_autor_sigue_pudiendo_registrar(self):
        # El permiso de consulta no afecta al POST de registro.
        self.client.force_authenticate(self.autor1)
        r = self.client.post(URL, {}, format='json')
        self.assertEqual(r.status_code, 400)  # llega a la validación, no es 403
