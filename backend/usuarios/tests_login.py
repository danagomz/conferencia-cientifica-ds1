from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import PerfilUsuario, Rol, UsuarioRol

LOGIN = '/api/auth/login/'
ME = '/api/auth/me/'
REFRESH = '/api/auth/refresh/'
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

    # ---- SDGC-101: gestión de sesión y autorización ----
    def iniciar_sesion(self):
        r = self.client.post(LOGIN, {'email': 'ana@univalle.edu.co', 'password': CLAVE}, format='json')
        return r.data

    def test_me_con_token(self):
        datos = self.iniciar_sesion()
        r = self.client.get(ME, HTTP_AUTHORIZATION='Bearer ' + datos['access'])
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['email'], 'ana@univalle.edu.co')
        self.assertEqual(r.data['roles'], ['AUTOR'])

    def test_me_sin_token_es_401(self):
        self.assertEqual(self.client.get(ME).status_code, 401)

    def test_me_con_token_invalido_es_401(self):
        r = self.client.get(ME, HTTP_AUTHORIZATION='Bearer token-falso')
        self.assertEqual(r.status_code, 401)

    def test_refresh_entrega_nuevo_access(self):
        datos = self.iniciar_sesion()
        r = self.client.post(REFRESH, {'refresh': datos['refresh']}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.data)

    def test_el_token_sirve_para_los_permisos_de_otros_endpoints(self):
        # Un AUTOR no puede crear usuarios; un ADMIN sí.
        datos = self.iniciar_sesion()
        r = self.client.post('/api/usuarios/', {}, format='json', HTTP_AUTHORIZATION='Bearer ' + datos['access'])
        self.assertEqual(r.status_code, 403)
        crear_usuario('admin@x.co', rol='ADMIN')
        token = self.client.post(LOGIN, {'email': 'admin@x.co', 'password': CLAVE}, format='json').data['access']
        r = self.client.post('/api/usuarios/', {
            'first_name': 'Luis', 'last_name': 'Ruiz', 'email': 'luis@x.co',
            'password': 'OtraClave#2026', 'institucion': 'Univalle', 'roles': ['AUTOR'],
        }, format='json', HTTP_AUTHORIZATION='Bearer ' + token)
        self.assertEqual(r.status_code, 201)