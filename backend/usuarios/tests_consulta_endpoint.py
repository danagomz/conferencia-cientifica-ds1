from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import PerfilUsuario, Rol, UsuarioRol


URL = '/api/usuarios/'


class ConsultarUsuariosEndpointTests(APITestCase):

    def setUp(self):

        # Crear el rol ADMIN.
        self.rol_admin, _ = Rol.objects.get_or_create(
            nombre_rol='ADMIN',
            defaults={'descripcion': 'Administrador'}
        )

        # Crear el rol AUTOR.
        self.rol_autor, _ = Rol.objects.get_or_create(
            nombre_rol='AUTOR',
            defaults={'descripcion': 'Autor'}
        )

        # Crear un usuario administrador.
        self.admin = User.objects.create_user(
            username='admin_consulta@pruebas.co',
            email='admin_consulta@pruebas.co',
            password='Clave#12345',
            first_name='Ana',
            last_name='Gomez',
        )

        PerfilUsuario.objects.create(
            usuario=self.admin,
            institucion='Universidad del Valle'
        )

        UsuarioRol.objects.get_or_create(
            usuario=self.admin,
            rol=self.rol_admin
        )

        # Crear un usuario autor.
        self.autor = User.objects.create_user(
            username='autor_consulta@pruebas.co',
            email='autor_consulta@pruebas.co',
            password='Clave#12345',
            first_name='Carlos',
            last_name='Perez',
        )

        PerfilUsuario.objects.create(
            usuario=self.autor,
            institucion='Universidad Nacional'
        )

        UsuarioRol.objects.get_or_create(
            usuario=self.autor,
            rol=self.rol_autor
        )

        # Crear un usuario deshabilitado.
        self.deshabilitado = User.objects.create_user(
            username='inactivo_consulta@pruebas.co',
            email='inactivo_consulta@pruebas.co',
            password='Clave#12345',
            is_active=False,
        )


    def test_admin_puede_consultar_usuarios(self):
        self.client.force_authenticate(self.admin)

        respuesta = self.client.get(URL)

        self.assertEqual(respuesta.status_code, 200)


    def test_consulta_devuelve_datos_esperados(self):
        self.client.force_authenticate(self.admin)

        respuesta = self.client.get(URL)

        self.assertEqual(respuesta.status_code, 200)

        usuario_admin = next(
            usuario for usuario in respuesta.data
            if usuario['id'] == self.admin.id
        )

        self.assertEqual(usuario_admin['first_name'], 'Ana')
        self.assertEqual(usuario_admin['last_name'], 'Gomez')
        self.assertEqual(usuario_admin['email'], 'admin_consulta@pruebas.co')
        self.assertEqual(usuario_admin['institucion'], 'Universidad del Valle')
        self.assertEqual(usuario_admin['roles'], ['ADMIN'])


    def test_consulta_no_expone_contrasenas(self):
        self.client.force_authenticate(self.admin)

        respuesta = self.client.get(URL)

        self.assertEqual(respuesta.status_code, 200)

        for usuario in respuesta.data:
            self.assertNotIn('password', usuario)


    def test_consulta_no_incluye_usuarios_deshabilitados(self):
        self.client.force_authenticate(self.admin)

        respuesta = self.client.get(URL)

        self.assertEqual(respuesta.status_code, 200)

        identificadores = [
            usuario['id'] for usuario in respuesta.data
        ]

        self.assertNotIn(self.deshabilitado.id, identificadores)



    def test_usuario_sin_autenticacion_no_puede_consultar(self):
        respuesta = self.client.get(URL)

        self.assertIn(respuesta.status_code, (401, 403))


    def test_autor_solo_consulta_sus_propios_datos(self):
        # Permisos definitivos (SDGC-125): el autor no recibe el listado completo.
        self.client.force_authenticate(self.autor)

        respuesta = self.client.get(URL)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual([u['id'] for u in respuesta.data], [self.autor.id])
