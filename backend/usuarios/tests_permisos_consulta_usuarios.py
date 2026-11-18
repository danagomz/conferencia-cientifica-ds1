from django.contrib.auth.models import User
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase

from .permisos_consulta import rol_activo_solicitado
from .roles import ADMIN, AUTOR, COMITE, asignar_roles

URL = '/api/usuarios/'


def crear(correo, *roles):
    usuario = User.objects.create_user(username=correo, email=correo, password='Clave#12345')
    asignar_roles(usuario, list(roles))
    return usuario


class PermisosConsultaUsuariosTests(APITestCase):
    """SDGC-125 (HU-002): CA-007, CA-012 y respeto del rol activo."""

    def setUp(self):
        self.admin = crear('admin@x.co', ADMIN)
        self.comite = crear('comite@x.co', COMITE)
        self.autor = crear('autor@x.co', AUTOR)
        self.otro_autor = crear('otro@x.co', AUTOR)
        self.multirol = crear('multi@x.co', ADMIN, AUTOR)

    def ids(self, usuario, rol=None):
        self.client.force_authenticate(usuario)
        extra = {'HTTP_X_ROL_ACTIVO': rol} if rol else {}
        r = self.client.get(URL, **extra)
        self.assertEqual(r.status_code, 200)
        return {u['id'] for u in r.data}

    def todos(self):
        return {u.id for u in User.objects.all()}

    def test_admin_ve_todos(self):
        self.assertEqual(self.ids(self.admin), self.todos())

    def test_comite_ve_todos(self):
        self.assertEqual(self.ids(self.comite), self.todos())

    def test_autor_solo_se_ve_a_si_mismo(self):
        self.assertEqual(self.ids(self.autor), {self.autor.id})

    def test_autor_no_ve_a_otro_autor(self):
        self.assertNotIn(self.otro_autor.id, self.ids(self.autor))

    def test_sin_sesion_recibe_401(self):
        self.assertEqual(self.client.get(URL).status_code, 401)

    def test_multirol_sin_cabecera_usa_todos_sus_roles(self):
        self.assertEqual(self.ids(self.multirol), self.todos())

    def test_multirol_trabajando_como_admin_ve_todos(self):
        self.assertEqual(self.ids(self.multirol, 'ADMIN'), self.todos())

    def test_multirol_trabajando_como_autor_solo_ve_lo_suyo(self):
        self.assertEqual(self.ids(self.multirol, 'AUTOR'), {self.multirol.id})

    def test_rol_activo_en_minusculas_tambien_se_respeta(self):
        self.assertEqual(self.ids(self.multirol, 'autor'), {self.multirol.id})

    def test_rol_activo_que_la_cuenta_no_tiene_se_rechaza(self):
        self.client.force_authenticate(self.autor)
        r = self.client.get(URL, HTTP_X_ROL_ACTIVO='ADMIN')
        self.assertEqual(r.status_code, 403)

    def test_autor_no_puede_hacerse_pasar_por_admin_con_la_cabecera(self):
        self.client.force_authenticate(self.autor)
        r = self.client.get(URL, HTTP_X_ROL_ACTIVO='COMITE')
        self.assertEqual(r.status_code, 403)

    def test_la_respuesta_nunca_incluye_datos_de_acceso(self):
        self.client.force_authenticate(self.admin)
        for usuario in self.client.get(URL).data:
            for campo in ('password', 'username', 'is_superuser', 'is_staff', 'last_login'):
                self.assertNotIn(campo, usuario)

    def test_crear_usuarios_sigue_siendo_solo_admin_o_comite(self):
        self.client.force_authenticate(self.autor)
        self.assertEqual(self.client.post(URL, {}, format='json').status_code, 403)


@override_settings(CORS_ALLOWED_ORIGINS=['https://front.vercel.app'])
class CabeceraRolActivoEnCorsTests(SimpleTestCase):
    def test_el_navegador_puede_enviar_la_cabecera_x_rol_activo(self):
        r = self.client.options(
            URL,
            headers={
                'Origin': 'https://front.vercel.app',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'authorization,x-rol-activo',
            },
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn('x-rol-activo', r['Access-Control-Allow-Headers'].lower())


class LecturaDeCabeceraTests(SimpleTestCase):
    def test_sin_cabecera_devuelve_none(self):
        from types import SimpleNamespace
        self.assertIsNone(rol_activo_solicitado(SimpleNamespace(META={})))
