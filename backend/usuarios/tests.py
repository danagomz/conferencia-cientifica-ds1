from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import PerfilUsuario, Rol, UsuarioRol

URL = '/api/usuarios/'
DATOS = {
    'first_name': 'Ana',
    'last_name': 'Pérez',
    'email': 'ana@univalle.edu.co',
    'password': 'ClaveSegura#2026',
    'institucion': 'Universidad del Valle',
    'roles': ['AUTOR'],
}


def crear_con_rol(correo, rol):
    usuario = User.objects.create_user(correo, correo, 'Clave#12345')
    rol_obj, _ = Rol.objects.get_or_create(nombre_rol=rol, defaults={'descripcion': rol})
    UsuarioRol.objects.create(usuario=usuario, rol=rol_obj)
    return usuario


class CrearUsuarioTests(APITestCase):

    def setUp(self):
        self.admin = crear_con_rol('admin@x.co', 'ADMIN')
        self.comite = crear_con_rol('comite@x.co', 'COMITE')

    # ---- SDGC-68: registro ----
    def test_admin_crea_usuario(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(URL, DATOS, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertNotIn('password', r.data)
        usuario = User.objects.get(email='ana@univalle.edu.co')
        self.assertTrue(usuario.check_password(DATOS['password']))
        self.assertEqual(usuario.perfil.institucion, 'Universidad del Valle')

    def test_sin_sesion_no_puede_crear(self):
        r = self.client.post(URL, DATOS, format='json')
        self.assertIn(r.status_code, (401, 403))
        self.assertFalse(User.objects.filter(email=DATOS['email']).exists())

    def test_usuario_sin_rol_no_puede_crear(self):
        self.client.force_authenticate(crear_con_rol('autor@x.co', 'AUTOR'))
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
        for campo in ('first_name', 'last_name', 'password', 'institucion', 'roles'):
            self.assertIn(campo, r.data)

    def test_contrasena_debil_se_rechaza_y_no_crea_nada(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(URL, {**DATOS, 'password': '12345678'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('password', r.data)
        self.assertEqual(PerfilUsuario.objects.count(), 0)

    # ---- SDGC-70: tipo de usuario (roles) ----
    def test_asigna_el_rol_indicado(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(URL, {**DATOS, 'roles': ['COMITE']}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['roles'], ['COMITE'])
        self.assertTrue(UsuarioRol.objects.filter(usuario__email=DATOS['email'], rol__nombre_rol='COMITE').exists())

    def test_asigna_varios_roles_sin_repetir(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(URL, {**DATOS, 'roles': ['COMITE', 'AUTOR', 'AUTOR']}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['roles'], ['COMITE', 'AUTOR'])
        self.assertEqual(UsuarioRol.objects.filter(usuario__email=DATOS['email']).count(), 2)

    def test_rol_inexistente_se_rechaza(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(URL, {**DATOS, 'roles': ['SUPERMAN']}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('roles', r.data)
        self.assertFalse(User.objects.filter(email=DATOS['email']).exists())

    def test_lista_de_roles_vacia_se_rechaza(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(URL, {**DATOS, 'roles': []}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('roles', r.data)

    def test_comite_no_puede_crear_administradores(self):
        self.client.force_authenticate(self.comite)
        r = self.client.post(URL, {**DATOS, 'roles': ['ADMIN']}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('roles', r.data)
        self.assertFalse(User.objects.filter(email=DATOS['email']).exists())

    def test_comite_si_puede_crear_comite_y_autor(self):
        self.client.force_authenticate(self.comite)
        r = self.client.post(URL, {**DATOS, 'roles': ['COMITE', 'AUTOR']}, format='json')
        self.assertEqual(r.status_code, 201)
