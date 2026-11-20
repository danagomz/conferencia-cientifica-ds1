
from rest_framework.test import APITestCase

from .models import PerfilUsuario
from .roles import ADMIN, AUTOR
from .tests_filtros_usuarios import crear


class ActualizarUsuarioTests(APITestCase):

    def setUp(self):
        self.admin = crear(
            'admin_actualizar@x.co', 'Ana', 'Gomez', ADMIN
        )
        self.autor = crear(
            'autor_actualizar@x.co', 'Laura', 'Ruiz', AUTOR
        )
        self.otro = crear(
            'otro_actualizar@x.co', 'Mario', 'Lopez', AUTOR
        )

        PerfilUsuario.objects.create(
            usuario=self.autor,
            institucion='Universidad anterior'
        )

        self.url = f'/api/usuarios/{self.autor.id}/'

        self.client.force_authenticate(self.autor)

    def test_actualiza_nombres_y_apellidos(self):
        respuesta = self.client.patch(
            self.url,
            {'first_name': 'Laura Maria', 'last_name': 'Perez'},
            format='json'
        )

        self.assertEqual(respuesta.status_code, 200)
        self.autor.refresh_from_db()
        self.assertEqual(self.autor.first_name, 'Laura Maria')
        self.assertEqual(self.autor.last_name, 'Perez')

    def test_actualiza_correo_y_nombre_de_usuario(self):
        respuesta = self.client.patch(
            self.url,
            {'email': '  NUEVO@X.CO  '},
            format='json'
        )

        self.assertEqual(respuesta.status_code, 200)
        self.autor.refresh_from_db()
        self.assertEqual(self.autor.email, 'nuevo@x.co')
        self.assertEqual(self.autor.username, 'nuevo@x.co')

    def test_actualiza_institucion(self):
        respuesta = self.client.patch(
            self.url,
            {'institucion': 'Universidad del Valle'},
            format='json'
        )

        self.assertEqual(respuesta.status_code, 200)
        self.autor.perfil.refresh_from_db()
        self.assertEqual(
            self.autor.perfil.institucion,
            'Universidad del Valle'
        )

    def test_rechaza_correo_de_otra_cuenta(self):
        respuesta = self.client.patch(
            self.url,
            {'email': self.otro.email},
            format='json'
        )

        self.assertEqual(respuesta.status_code, 400)

    def test_rechaza_actualizacion_vacia(self):
        respuesta = self.client.patch(
            self.url,
            {},
            format='json'
        )

        self.assertEqual(respuesta.status_code, 400)

    def test_rechaza_cambios_de_contrasena_y_roles(self):
        contrasena_anterior = 'Clave#12345'

        respuesta = self.client.patch(
            self.url,
            {
                'first_name': 'Laura Nueva',
                'password': 'OtraClave#98765',
                'roles': [ADMIN],
            },
            format='json'
        )

        self.assertEqual(respuesta.status_code, 400)
        self.autor.refresh_from_db()

        self.assertEqual(self.autor.first_name, 'Laura')
        self.assertTrue(self.autor.check_password(contrasena_anterior))
        self.assertEqual(
            set(self.autor.roles_asignados.values_list(
                'rol__nombre_rol', flat=True
            )),
            {AUTOR}
        )
    def test_crea_perfil_si_el_usuario_no_lo_tiene(self):
        self.assertFalse(
            PerfilUsuario.objects.filter(usuario=self.otro).exists()
        )

        self.client.force_authenticate(self.otro)

        respuesta = self.client.patch(
            f'/api/usuarios/{self.otro.id}/',
            {'institucion': 'Universidad del Valle'},
            format='json'
        )

        self.assertEqual(respuesta.status_code, 200)

        self.assertTrue(
            PerfilUsuario.objects.filter(
                usuario=self.otro,
                institucion='Universidad del Valle'
            ).exists()
        )
