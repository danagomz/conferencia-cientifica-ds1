from rest_framework.test import APITestCase

from .models import Conferencia, LineaTematica, Plazo
from .tests_lineas import crear_conferencia, usuario_con_rol

DATOS_CONFERENCIA = {
    'nombre': 'Congreso Nuevo', 'edicion': '2027', 'descripcion': 'x',
    'fecha_inicio': '2028-03-01', 'fecha_fin': '2028-03-05', 'zona_horaria': 'America/Bogota',
}


class PermisosConfiguracionConferenciaTests(APITestCase):
    """SDGC-278: quién puede consultar y quién puede configurar la conferencia."""

    def setUp(self):
        self.conf = crear_conferencia()
        self.linea = LineaTematica.objects.create(id_conferencia=self.conf, nombre='IA')
        self.admin = usuario_con_rol('admin@x.co', 'ADMIN')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        self.autor = usuario_con_rol('autor@x.co', 'AUTOR')
        base = f'/api/conferencias/{self.conf.id_conferencia}/'
        self.lista = '/api/conferencias/'
        self.detalle = base
        self.lineas = base + 'lineas-tematicas/'
        self.plazos = base + 'plazos/'

    # ---- consulta: cualquier usuario con sesión ----
    def test_autor_puede_consultar_conferencias_lineas_y_plazos(self):
        self.client.force_authenticate(self.autor)
        for url in (self.lista, self.detalle, self.lineas, self.plazos):
            self.assertEqual(self.client.get(url).status_code, 200, url)

    def test_sin_sesion_no_puede_consultar(self):
        for url in (self.lista, self.detalle, self.lineas, self.plazos):
            self.assertIn(self.client.get(url).status_code, (401, 403), url)

    # ---- modificación: solo ADMIN o COMITE ----
    def test_autor_no_puede_crear_ni_modificar_conferencias(self):
        self.client.force_authenticate(self.autor)
        r = self.client.post(self.lista, DATOS_CONFERENCIA, format='json')
        self.assertEqual(r.status_code, 403)
        r = self.client.patch(self.detalle, {'nombre': 'Otro'}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(Conferencia.objects.count(), 1)
        self.conf.refresh_from_db()
        self.assertEqual(self.conf.nombre, 'Congreso A')

    def test_autor_no_puede_configurar_lineas_ni_plazos(self):
        self.client.force_authenticate(self.autor)
        r = self.client.post(self.lineas, {'nombre': 'Redes'}, format='json')
        self.assertEqual(r.status_code, 403)
        r = self.client.post(self.plazos, {
            'tipo_plazo': 'POSTULACION',
            'fecha_inicio': '2027-01-01T00:00:00-05:00',
            'fecha_fin': '2027-02-01T00:00:00-05:00',
        }, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(LineaTematica.objects.count(), 1)
        self.assertEqual(Plazo.objects.count(), 0)

    def test_admin_y_comite_pueden_crear_conferencia(self):
        for i, usuario in enumerate((self.admin, self.comite)):
            self.client.force_authenticate(usuario)
            datos = dict(DATOS_CONFERENCIA, nombre=f'Congreso {i}')
            self.assertEqual(self.client.post(self.lista, datos, format='json').status_code, 201)

    def test_admin_y_comite_pueden_actualizar_conferencia(self):
        for usuario in (self.admin, self.comite):
            self.client.force_authenticate(usuario)
            r = self.client.patch(self.detalle, {'descripcion': 'nueva'}, format='json')
            self.assertEqual(r.status_code, 200)

    def test_el_mensaje_de_rechazo_es_claro(self):
        self.client.force_authenticate(self.autor)
        r = self.client.post(self.lista, DATOS_CONFERENCIA, format='json')
        self.assertIn('administrador', str(r.data['detail']))

    def test_usuario_sin_rol_no_puede_modificar(self):
        from django.contrib.auth.models import User
        u = User.objects.create_user('norol@x.co', 'norol@x.co', 'Clave#12345')
        self.client.force_authenticate(u)
        self.assertEqual(self.client.post(self.lista, DATOS_CONFERENCIA, format='json').status_code, 403)
