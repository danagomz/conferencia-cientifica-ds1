from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .roles import ADMIN, AUTOR, COMITE, asignar_roles

URL = '/api/usuarios/'


def crear(correo, nombre, apellido, *roles, activo=True):
    usuario = User.objects.create_user(
        username=correo, email=correo, password='Clave#12345',
        first_name=nombre, last_name=apellido, is_active=activo,
    )
    asignar_roles(usuario, list(roles))
    return usuario


class FiltrarUsuariosTests(APITestCase):
    """HU-003: CA-014 a CA-019 (SDGC-75 y SDGC-76)."""

    def setUp(self):
        self.admin = crear('admin@x.co', 'Laura', 'Admin', ADMIN)
        self.comite = crear('comite@x.co', 'Carlos', 'Gómez', COMITE)
        self.ana = crear('ana@x.co', 'Ana', 'Gómez', AUTOR)
        self.ana_ruiz = crear('anar@x.co', 'Ana', 'Ruiz', AUTOR)
        self.multi = crear('multi@x.co', 'Mario', 'Multi', ADMIN, AUTOR)
        self.inactivo = crear('inactivo@x.co', 'Ana', 'Inactiva', AUTOR, activo=False)
        self.client.force_authenticate(self.admin)

    def buscar(self, **params):
        r = self.client.get(URL, params)
        self.assertEqual(r.status_code, 200, r.content)
        return {u['id'] for u in r.data}

    def test_sin_filtros_devuelve_el_listado_general(self):
        self.assertEqual(len(self.buscar()), 5)

    def test_filtra_por_nombre(self):
        self.assertEqual(self.buscar(nombre='ana'), {self.ana.id, self.ana_ruiz.id})

    def test_filtra_por_apellido(self):
        self.assertEqual(self.buscar(nombre='gómez'), {self.comite.id, self.ana.id})

    def test_nombre_sin_importar_mayusculas(self):
        self.assertEqual(self.buscar(nombre='ANA'), {self.ana.id, self.ana_ruiz.id})

    def test_nombre_completo_con_varias_palabras(self):
        self.assertEqual(self.buscar(nombre='ana gómez'), {self.ana.id})

    def test_filtra_por_rol(self):
        self.assertEqual(self.buscar(rol='AUTOR'), {self.ana.id, self.ana_ruiz.id, self.multi.id})

    def test_rol_en_minusculas(self):
        self.assertEqual(self.buscar(rol='comite'), {self.comite.id})

    def test_usuario_con_varios_roles_aparece_una_sola_vez(self):
        r = self.client.get(URL, {'rol': 'ADMIN'})
        ids = [u['id'] for u in r.data]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(set(ids), {self.admin.id, self.multi.id})

    def test_combina_nombre_y_rol(self):
        self.assertEqual(self.buscar(nombre='gómez', rol='AUTOR'), {self.ana.id})

    def test_sin_resultados_devuelve_lista_vacia(self):
        self.assertEqual(self.buscar(nombre='zzz'), set())
        self.assertEqual(self.buscar(nombre='ana', rol='COMITE'), set())

    def test_no_incluye_deshabilitados(self):
        self.assertNotIn(self.inactivo.id, self.buscar(nombre='inactiva'))

    def test_rol_invalido_devuelve_400(self):
        r = self.client.get(URL, {'rol': 'JEFE'})
        self.assertEqual(r.status_code, 400)
        self.assertIn('rol', r.data)

    def test_filtro_vacio_equivale_a_sin_filtro(self):
        self.assertEqual(len(self.buscar(nombre='', rol='')), 5)

    def test_los_filtros_respetan_los_permisos_el_autor_no_ve_a_otros(self):
        self.client.force_authenticate(self.ana)
        r = self.client.get(URL, {'nombre': 'ana'})
        self.assertEqual({u['id'] for u in r.data}, {self.ana.id})
        r = self.client.get(URL, {'rol': 'ADMIN'})
        self.assertEqual(r.data, [])

    def test_multirol_como_autor_filtra_solo_sobre_lo_suyo(self):
        self.client.force_authenticate(self.multi)
        r = self.client.get(URL, {'rol': 'ADMIN'}, HTTP_X_ROL_ACTIVO='AUTOR')
        self.assertEqual({u['id'] for u in r.data}, {self.multi.id})

    def test_sin_sesion_recibe_401(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(URL, {'nombre': 'ana'}).status_code, 401)

    def test_no_se_exponen_datos_de_acceso(self):
        for u in self.client.get(URL, {'nombre': 'ana'}).data:
            self.assertNotIn('password', u)
