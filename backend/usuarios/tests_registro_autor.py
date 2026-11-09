from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import PerfilUsuario, UsuarioRol

URL = '/api/auth/registro-autor/'
DATOS = {
    'first_name': 'Carlos',
    'last_name': 'Mejía',
    'email': 'carlos@univalle.edu.co',
    'password': 'ClaveSegura#2026',
    'institucion': 'Universidad del Valle',
}

class RegistroAutorTests(APITestCase):

    # ---- SDGC-136: endpoint de registro de autor ----
    def test_registro_sin_sesion_crea_cuenta_de_autor(self):
        r = self.client.post(URL, DATOS, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['email'], 'carlos@univalle.edu.co')
        self.assertEqual(r.data['roles'], ['AUTOR'])
        self.assertNotIn('password', r.data)
        usuario = User.objects.get(email='carlos@univalle.edu.co')
        self.assertEqual(usuario.perfil.institucion, 'Universidad del Valle')
        roles = list(UsuarioRol.objects.filter(usuario=usuario).values_list('rol__nombre_rol', flat=True))
        self.assertEqual(roles, ['AUTOR'])

    def test_no_se_puede_asignar_rol_de_administrador(self):
        r = self.client.post(URL, {**DATOS, 'roles': ['ADMIN', 'COMITE']}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['roles'], ['AUTOR'])
        self.assertFalse(User.objects.get(email=DATOS['email']).is_superuser)

    def test_no_se_vuelve_staff_ni_superusuario(self):
        self.client.post(URL, {**DATOS, 'is_staff': True, 'is_superuser': True}, format='json')
        usuario = User.objects.get(email=DATOS['email'])
        self.assertFalse(usuario.is_staff)
        self.assertFalse(usuario.is_superuser)

    def test_funciona_aunque_llegue_un_token_invalido(self):
        r = self.client.post(URL, DATOS, format='json', HTTP_AUTHORIZATION='Bearer token-vencido')
        self.assertEqual(r.status_code, 201)

    def test_faltan_campos_obligatorios(self):
        r = self.client.post(URL, {'email': 'x@x.co'}, format='json')
        self.assertEqual(r.status_code, 400)
        for campo in ('first_name', 'last_name', 'password', 'institucion'):
            self.assertIn(campo, r.data)
        self.assertEqual(PerfilUsuario.objects.count(), 0)

    # ---- SDGC-140: unicidad del correo electrónico ----
    def test_correo_ya_registrado_se_rechaza(self):
        self.client.post(URL, DATOS, format='json')
        r = self.client.post(URL, {**DATOS, 'first_name': 'Otra'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data['email'], ['Ya existe una cuenta con este correo.'])
        self.assertEqual(User.objects.filter(email__iexact=DATOS['email']).count(), 1)

    def test_correo_repetido_con_otras_mayusculas_se_rechaza(self):
        self.client.post(URL, DATOS, format='json')
        r = self.client.post(URL, {**DATOS, 'email': 'CARLOS@Univalle.edu.co'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('email', r.data)
        self.assertEqual(User.objects.count(), 1)

    def test_correo_ya_registrado_no_cambia_la_cuenta_existente(self):
        self.client.post(URL, DATOS, format='json')
        self.client.post(URL, {**DATOS, 'first_name': 'Intruso', 'password': 'OtraClave#2026'}, format='json')
        usuario = User.objects.get(email=DATOS['email'])
        self.assertEqual(usuario.first_name, 'Carlos')
        self.assertTrue(usuario.check_password(DATOS['password']))

    def test_correo_con_formato_invalido(self):
        r = self.client.post(URL, {**DATOS, 'email': 'esto-no-es-un-correo'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('email', r.data)
        self.assertEqual(User.objects.count(), 0)

    # ---- SDGC-142: almacenamiento seguro de la contraseña ----
    def test_la_contrasena_no_se_guarda_en_texto_plano(self):
        self.client.post(URL, DATOS, format='json')
        usuario = User.objects.get(email=DATOS['email'])
        self.assertNotEqual(usuario.password, DATOS['password'])
        self.assertNotIn(DATOS['password'], usuario.password)
        # Django guarda "algoritmo$iteraciones$sal$hash", por ejemplo pbkdf2_sha256$...
        self.assertGreaterEqual(usuario.password.count('$'), 3)
        self.assertTrue(usuario.check_password(DATOS['password']))

    def test_dos_cuentas_con_la_misma_contrasena_tienen_hash_distinto(self):
        self.client.post(URL, DATOS, format='json')
        self.client.post(URL, {**DATOS, 'email': 'otro@univalle.edu.co'}, format='json')
        hashes = list(User.objects.values_list('password', flat=True))
        self.assertEqual(len(hashes), 2)
        self.assertNotEqual(hashes[0], hashes[1])

    def test_la_respuesta_nunca_incluye_la_contrasena_ni_su_hash(self):
        r = self.client.post(URL, DATOS, format='json')
        self.assertNotIn('password', r.data)
        self.assertNotIn(DATOS['password'], str(r.data))
        self.assertNotIn('pbkdf2', str(r.data))

    def test_contrasena_debil_se_rechaza_y_no_crea_la_cuenta(self):
        for clave in ('12345678', 'corta', 'password'):
            r = self.client.post(URL, {**DATOS, 'password': clave}, format='json')
            self.assertEqual(r.status_code, 400)
            self.assertIn('password', r.data)
        self.assertEqual(User.objects.count(), 0)

    def test_contrasena_igual_al_correo_se_rechaza(self):
        r = self.client.post(URL, {**DATOS, 'password': 'carlos@univalle.edu.co'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('password', r.data)
