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

    # (la unicidad del correo y el almacenamiento seguro se refuerzan en SDGC-140 y SDGC-142)
