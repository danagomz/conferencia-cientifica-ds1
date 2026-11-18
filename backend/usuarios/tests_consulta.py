
from django.contrib.auth.models import User
from django.test import TestCase

from .models import PerfilUsuario, Rol, UsuarioRol
from .queries import consultar_usuarios


class ConsultarUsuariosTests(TestCase):

    def setUp(self):
        # Obtener o crear los roles del sistema.
        self.rol_admin, _ = Rol.objects.get_or_create(
            nombre_rol='ADMIN',
            defaults={'descripcion': 'Administrador'}
        )

        self.rol_autor, _ = Rol.objects.get_or_create(
            nombre_rol='AUTOR',
            defaults={'descripcion': 'Autor'}
        )

        # Crear un usuario administrador.
        self.admin = User.objects.create_user(
            username='admin@pruebas.co',
            email='admin@pruebas.co',
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
            username='autor@pruebas.co',
            email='autor@pruebas.co',
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
            username='inactivo@pruebas.co',
            email='inactivo@pruebas.co',
            password='Clave#12345',
            is_active=False,
        )

    def test_consulta_solo_usuarios_habilitados(self):
        usuarios = consultar_usuarios()

        self.assertEqual(usuarios.count(), 2)
        self.assertTrue(
            all(usuario.is_active for usuario in usuarios)
        )

    def test_consulta_incluye_datos_del_usuario(self):
        usuarios = consultar_usuarios()
        usuario = usuarios.get(id=self.admin.id)

        self.assertEqual(usuario.first_name, 'Ana')
        self.assertEqual(usuario.last_name, 'Gomez')
        self.assertEqual(usuario.email, 'admin@pruebas.co')

    def test_consulta_recupera_institucion(self):
        usuarios = consultar_usuarios()
        usuario = usuarios.get(id=self.admin.id)

        self.assertEqual(
            usuario.perfil.institucion,
            'Universidad del Valle'
        )

    def test_consulta_recupera_roles(self):
        usuarios = consultar_usuarios()
        usuario = usuarios.get(id=self.admin.id)

        roles = list(
            usuario.roles_asignados.values_list(
                'rol__nombre_rol',
                flat=True
            )
        )

        self.assertEqual(roles, ['ADMIN'])

    def test_consulta_usuarios_ordenados_por_id(self):
        usuarios = list(consultar_usuarios())

        identificadores = [usuario.id for usuario in usuarios]

        self.assertEqual(
            identificadores,
            sorted(identificadores)
        )
