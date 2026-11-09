from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import PerfilUsuario, Rol, UsuarioRol

LOGIN = '/api/auth/login/'
CLAVE = 'ClaveSegura#2026'


def crear_usuario(correo='ana@univalle.edu.co', rol='AUTOR', activo=True):
    usuario = User.objects.create_user(correo, correo, CLAVE, first_name='Ana', last_name='Pérez', is_active=activo)
    PerfilUsuario.objects.create(usuario=usuario, institucion='Universidad del Valle')
    rol_obj, _ = Rol.objects.get_or_create(nombre_rol=rol, defaults={'descripcion': rol})
    UsuarioRol.objects.create(usuario=usuario, rol=rol_obj)
    return usuario


class LoginTests(APITestCase):

    def setUp(self):
        self.usuario = crear_usuario()

    # ---- SDGC-98: autenticación ----
    def test_login_correcto_entrega_tokens_y_datos(self):
        r = self.client.post(LOGIN, {'email': 'ana@univalle.edu.co', 'password': CLAVE}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.data)
        self.assertIn('refresh', r.data)
        self.assertEqual(r.data['usuario']['roles'], ['AUTOR'])
        self.assertEqual(r.data['usuario']['email'], 'ana@univalle.edu.co')
        self.assertNotIn('password', r.data['usuario'])

    def test_login_sin_importar_mayusculas_en_el_correo(self):
        r = self.client.post(LOGIN, {'email': 'ANA@Univalle.edu.co', 'password': CLAVE}, format='json')
        self.assertEqual(r.status_code, 200)

    # ---- SDGC-99: validación de credenciales ----
    def test_contrasena_incorrecta(self):
        r = self.client.post(LOGIN, {'email': 'ana@univalle.edu.co', 'password': 'otra'}, format='json')
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.data['detail'], 'Correo o contraseña incorrectos.')
        self.assertNotIn('access', r.data)

    def test_correo_inexistente_da_el_mismo_mensaje(self):
        r = self.client.post(LOGIN, {'email': 'nadie@x.co', 'password': CLAVE}, format='json')
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.data['detail'], 'Correo o contraseña incorrectos.')

    def test_cuenta_desactivada_no_inicia_sesion(self):
        crear_usuario('baja@x.co', activo=False)
        r = self.client.post(LOGIN, {'email': 'baja@x.co', 'password': CLAVE}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_faltan_campos(self):
        r = self.client.post(LOGIN, {}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('email', r.data)
        self.assertIn('password', r.data)

    def test_correo_con_formato_invalido(self):
        r = self.client.post(LOGIN, {'email': 'esto-no-es-un-correo', 'password': CLAVE}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('email', r.data)

    def test_contrasena_vacia(self):
        r = self.client.post(LOGIN, {'email': 'ana@univalle.edu.co', 'password': ''}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('password', r.data)