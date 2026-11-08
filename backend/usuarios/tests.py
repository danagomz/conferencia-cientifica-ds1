from django.contrib.auth.models import Group, User
from rest_framework.test import APITestCase

from .models import PerfilUsuario

URL = '/api/usuarios/'
DATOS = {
    'first_name': 'Ana',
    'last_name': 'Pérez',
    'email': 'ana@univalle.edu.co',
    'password': 'ClaveSegura#2026',
    'institucion': 'Universidad del Valle',
}


class CrearUsuarioTests(APITestCase):

    def setUp(self):
        # Un administrador para hacer las peticiones.
        self.admin = User.objects.create_user('admin@x.co', 'admin@x.co', 'Admin#12345')
        self.admin.groups.add(Group.objects.create(name='ADMIN'))

    def test_admin_crea_usuario(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(URL, DATOS, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertNotIn('password', r.data)
        usuario = User.objects.get(email='ana@univalle.edu.co')
        self.assertTrue(usuario.check_password(DATOS['password']))
        self.assertEqual(usuario.perfil.institucion, 'Universidad del Valle')

    def test_sin_sesion_responde_403_o_401(self):
        r = self.client.post(URL, DATOS, format='json')
        self.assertIn(r.status_code, (401, 403))
        self.assertFalse(User.objects.filter(email=DATOS['email']).exists())

    def test_usuario_sin_rol_no_puede_crear(self):
        autor = User.objects.create_user('autor@x.co', 'autor@x.co', 'Autor#12345')
        self.client.force_authenticate(autor)
        r = self.client.post(URL, DATOS, format='json')
        self.assertEqual(r.status_code, 403)

    def test_correo_repetido_sin_importar_mayusculas(self):
        self.client.force_authenticate(self.admin)
        self.client.post(URL, DATOS, format='json')
        r = self.client.post(URL, {**DATOS, 'email': 'ANA@univalle.edu.co'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('email', r.data)

    def test_faltan_campos_obligatorios(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(URL, {'email': 'x@x.co'}, format='json')
        self.assertEqual(r.status_code, 400)
        for campo in ('first_name', 'last_name', 'password', 'institucion'):
            self.assertIn(campo, r.data)

    def test_contrasena_debil_se_rechaza_y_no_crea_nada(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(URL, {**DATOS, 'password': '12345678'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('password', r.data)
        self.assertEqual(PerfilUsuario.objects.count(), 0)
