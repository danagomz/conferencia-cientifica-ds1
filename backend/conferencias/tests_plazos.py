from datetime import date, datetime, timedelta, timezone

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from usuarios.models import Rol, UsuarioRol

from .models import Conferencia, Plazo

BASE = datetime(2027, 1, 1, tzinfo=timezone.utc)


def dia(n, hora=0):
    """Fecha en ISO, n días después del 1 de enero de 2027."""
    return (BASE + timedelta(days=n, hours=hora)).isoformat()


def usuario_con_rol(correo, rol):
    usuario = User.objects.create_user(correo, correo, 'Clave#12345')
    rol_obj, _ = Rol.objects.get_or_create(nombre_rol=rol, defaults={'descripcion': rol})
    UsuarioRol.objects.create(usuario=usuario, rol=rol_obj)
    return usuario


def crear_conferencia(nombre='Congreso A'):
    return Conferencia.objects.create(
        nombre=nombre, edicion='2027', descripcion='x',
        fecha_inicio=date(2027, 6, 1), fecha_fin=date(2027, 6, 5), zona_horaria='America/Bogota',
    )

class PlazosTests(APITestCase):

    def setUp(self):
        self.conf = crear_conferencia()
        self.otra = crear_conferencia('Congreso B')
        self.admin = usuario_con_rol('admin@x.co', 'ADMIN')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        self.autor = usuario_con_rol('autor@x.co', 'AUTOR')
        self.url = f'/api/conferencias/{self.conf.id_conferencia}/plazos/'
        self.client.force_authenticate(self.admin)

    def crear(self, tipo, inicio, fin, url=None, **extra):
        return self.client.post(url or self.url, {
            'tipo_plazo': tipo, 'fecha_inicio': dia(inicio), 'fecha_fin': dia(fin), **extra,
        }, format='json')

    # ---- SDGC-274: configuración de las fechas límite ----
    def test_admin_configura_un_plazo(self):
        r = self.crear('POSTULACION', 0, 30, descripcion='Recepción de artículos')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['id_conferencia'], self.conf.id_conferencia)
        self.assertEqual(r.data['tipo_plazo'], 'POSTULACION')

    def test_comite_tambien_puede_configurar(self):
        self.client.force_authenticate(self.comite)
        self.assertEqual(self.crear('POSTULACION', 0, 30).status_code, 201)

    def test_se_configuran_las_cinco_etapas_en_orden(self):
        for tipo, i, f in [('POSTULACION', 0, 30), ('EVALUACION', 31, 60), ('VERSIONES_CORREGIDAS', 61, 80),
                           ('PRESENTACION', 90, 92), ('DOCUMENTOS_FINALES', 93, 120)]:
            self.assertEqual(self.crear(tipo, i, f).status_code, 201, tipo)
        self.assertEqual(Plazo.objects.filter(id_conferencia=self.conf).count(), 5)

    def test_listado_sale_en_orden_cronologico_de_etapas(self):
        self.crear('EVALUACION', 31, 60)
        self.crear('POSTULACION', 0, 30)
        r = self.client.get(self.url)
        self.assertEqual(r.status_code, 200)
        filas = r.data['results'] if 'results' in r.data else r.data
        self.assertEqual([x['tipo_plazo'] for x in filas], ['POSTULACION', 'EVALUACION'])

    def test_etapa_inexistente(self):
        r = self.crear('INVENTADA', 0, 30)
        self.assertEqual(r.status_code, 400)
        self.assertIn('tipo_plazo', r.data)

    def test_faltan_campos(self):
        r = self.client.post(self.url, {}, format='json')
        self.assertEqual(r.status_code, 400)
        for campo in ('tipo_plazo', 'fecha_inicio', 'fecha_fin'):
            self.assertIn(campo, r.data)

    def test_no_se_repite_la_etapa_en_una_conferencia(self):
        self.crear('POSTULACION', 0, 30)
        r = self.crear('POSTULACION', 40, 50)
        self.assertEqual(r.status_code, 400)
        self.assertIn('tipo_plazo', r.data)

    def test_modificar_las_fechas_de_un_plazo(self):
        plazo = self.crear('POSTULACION', 0, 30).data
        r = self.client.patch(f"{self.url}{plazo['id_plazo']}/", {'fecha_fin': dia(25)}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['fecha_fin'].startswith('2027-01-26'))

    def test_no_se_puede_cambiar_la_etapa_de_un_plazo(self):
        plazo = self.crear('POSTULACION', 0, 30).data
        r = self.client.patch(f"{self.url}{plazo['id_plazo']}/", {'tipo_plazo': 'EVALUACION'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('tipo_plazo', r.data)

    def test_conferencia_inexistente(self):
        self.assertEqual(self.crear('POSTULACION', 0, 30, url='/api/conferencias/9999/plazos/').status_code, 404)

    # ---- SDGC-275: validación de las fechas ----
    def test_fin_debe_ser_posterior_al_inicio(self):
        for inicio, fin in [(10, 10), (10, 5)]:
            r = self.crear('POSTULACION', inicio, fin)
            self.assertEqual(r.status_code, 400)
            self.assertIn('fecha_fin', r.data)

    def test_fecha_con_formato_invalido(self):
        r = self.client.post(self.url, {'tipo_plazo': 'POSTULACION', 'fecha_inicio': 'ayer', 'fecha_fin': dia(5)}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('fecha_inicio', r.data)

    def test_una_etapa_no_puede_empezar_antes_de_que_termine_la_anterior(self):
        self.crear('POSTULACION', 0, 30)
        r = self.crear('EVALUACION', 20, 60)
        self.assertEqual(r.status_code, 400)
        self.assertIn('fecha_inicio', r.data)
        self.assertEqual(Plazo.objects.count(), 1)

    def test_una_etapa_no_puede_terminar_despues_de_que_empiece_la_siguiente(self):
        self.crear('EVALUACION', 31, 60)
        r = self.crear('POSTULACION', 0, 40)
        self.assertEqual(r.status_code, 400)
        self.assertIn('fecha_fin', r.data)

    def test_las_etapas_pueden_configurarse_en_cualquier_orden(self):
        self.assertEqual(self.crear('PRESENTACION', 90, 92).status_code, 201)
        self.assertEqual(self.crear('POSTULACION', 0, 30).status_code, 201)
        self.assertEqual(self.crear('EVALUACION', 31, 60).status_code, 201)

    def test_etapas_consecutivas_pueden_tocarse(self):
        self.crear('POSTULACION', 0, 30)
        self.assertEqual(self.crear('EVALUACION', 30, 60).status_code, 201)

    def test_al_modificar_tampoco_se_rompe_la_secuencia(self):
        self.crear('POSTULACION', 0, 30)
        evaluacion = self.crear('EVALUACION', 31, 60).data
        r = self.client.patch(f"{self.url}{evaluacion['id_plazo']}/", {'fecha_inicio': dia(10)}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('fecha_inicio', r.data)
        self.assertEqual(Plazo.objects.get(pk=evaluacion['id_plazo']).fecha_inicio, BASE + timedelta(days=31))

    # ---- CA-247 y CA-248: cada conferencia conserva su configuración ----
    def test_cada_conferencia_tiene_su_propia_configuracion(self):
        self.crear('POSTULACION', 0, 30)
        otra_url = f'/api/conferencias/{self.otra.id_conferencia}/plazos/'
        self.assertEqual(self.crear('POSTULACION', 100, 130, url=otra_url).status_code, 201)
        plazo = self.client.get(self.url).data
        filas = plazo['results'] if 'results' in plazo else plazo
        self.assertEqual(len(filas), 1)
        self.assertTrue(filas[0]['fecha_inicio'].startswith('2027-01-01'))

    def test_modificar_una_conferencia_no_cambia_la_otra(self):
        a = self.crear('POSTULACION', 0, 30).data
        otra_url = f'/api/conferencias/{self.otra.id_conferencia}/plazos/'
        b = self.crear('POSTULACION', 100, 130, url=otra_url).data
        self.client.patch(f"{self.url}{a['id_plazo']}/", {'fecha_fin': dia(10)}, format='json')
        self.assertEqual(Plazo.objects.get(pk=b['id_plazo']).fecha_fin, BASE + timedelta(days=130))

    def test_un_plazo_no_se_alcanza_desde_otra_conferencia(self):
        a = self.crear('POSTULACION', 0, 30).data
        r = self.client.get(f"/api/conferencias/{self.otra.id_conferencia}/plazos/{a['id_plazo']}/")
        self.assertEqual(r.status_code, 404)

    # ---- permisos ----
    def test_autor_puede_consultar_pero_no_modificar(self):
        plazo = self.crear('POSTULACION', 0, 30).data
        self.client.force_authenticate(self.autor)
        self.assertEqual(self.client.get(self.url).status_code, 200)
        self.assertEqual(self.crear('EVALUACION', 31, 60).status_code, 403)
        self.assertEqual(self.client.patch(f"{self.url}{plazo['id_plazo']}/", {'fecha_fin': dia(5)}, format='json').status_code, 403)

    def test_sin_sesion_no_hay_acceso(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(self.url).status_code, (401, 403))
        self.assertIn(self.crear('POSTULACION', 0, 30).status_code, (401, 403))
