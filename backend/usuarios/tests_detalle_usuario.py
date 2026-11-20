
from rest_framework.test import APITestCase

from .roles import ADMIN, AUTOR, COMITE
from .tests_filtros_usuarios import crear


class ConsultarDetalleUsuarioTests(APITestCase):

    def setUp(self):
        self.admin = crear('admin_detalle@x.co', 'Ana', 'Gomez', ADMIN)
        self.comite = crear('comite_detalle@x.co', 'Carlos', 'Perez', COMITE)
        self.autor = crear('autor_detalle@x.co', 'Laura', 'Ruiz', AUTOR)
        self.otro_autor = crear('otro_detalle@x.co', 'Mario', 'Lopez', AUTOR)
        self.multirol = crear(
            'multirol_detalle@x.co', 'Sofia', 'Torres', ADMIN, AUTOR
        )
        self.inactivo = crear(
            'inactivo_detalle@x.co', 'Pedro', 'Diaz', AUTOR, activo=False
        )

        self.url = f'/api/usuarios/{self.autor.id}/'

    def test_admin_puede_consultar_otro_usuario(self):
        self.client.force_authenticate(self.admin)

        respuesta = self.client.get(self.url)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['id'], self.autor.id)

    def test_comite_puede_consultar_otro_usuario(self):
        self.client.force_authenticate(self.comite)

        respuesta = self.client.get(self.url)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['id'], self.autor.id)

    def test_autor_puede_consultar_sus_propios_datos(self):
        self.client.force_authenticate(self.autor)

        respuesta = self.client.get(self.url)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['email'], 'autor_detalle@x.co')

    def test_autor_no_puede_consultar_otro_usuario(self):
        self.client.force_authenticate(self.autor)
        url = f'/api/usuarios/{self.otro_autor.id}/'

        respuesta = self.client.get(url)

        self.assertEqual(respuesta.status_code, 404)

    def test_no_se_puede_consultar_usuario_deshabilitado(self):
        self.client.force_authenticate(self.admin)
        url = f'/api/usuarios/{self.inactivo.id}/'

        respuesta = self.client.get(url)

        self.assertEqual(respuesta.status_code, 404)

    def test_usuario_sin_autenticacion_no_puede_consultar(self):
        respuesta = self.client.get(self.url)

        self.assertIn(respuesta.status_code, (401, 403))

    def test_respuesta_no_expone_datos_de_acceso(self):
        self.client.force_authenticate(self.admin)

        respuesta = self.client.get(self.url)

        self.assertEqual(respuesta.status_code, 200)
        for campo in ('password', 'username', 'is_superuser', 'is_staff'):
            self.assertNotIn(campo, respuesta.data)

    def test_multirol_con_rol_admin_puede_consultar_otro_usuario(self):
        self.client.force_authenticate(self.multirol)

        respuesta = self.client.get(
            f'/api/usuarios/{self.autor.id}/',
            HTTP_X_ROL_ACTIVO='ADMIN'
        )

        self.assertEqual(respuesta.status_code, 200)

    def test_multirol_con_rol_autor_no_puede_consultar_otro_usuario(self):
        self.client.force_authenticate(self.multirol)

        respuesta = self.client.get(
            f'/api/usuarios/{self.autor.id}/',
            HTTP_X_ROL_ACTIVO='AUTOR'
        )

        self.assertEqual(respuesta.status_code, 404)
