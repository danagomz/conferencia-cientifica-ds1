from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from conferencias.models import Conferencia, LineaTematica, Plazo
from usuarios.roles import nombres_de_roles


def preparar():
    call_command('preparar_entorno_pruebas', stdout=StringIO())


class PrepararEntornoDePruebasTests(TestCase):

    def test_crea_usuarios_con_su_rol(self):
        preparar()
        for correo, rol in (('admin@pruebas.co', 'ADMIN'), ('comite@pruebas.co', 'COMITE'),
                            ('autor@pruebas.co', 'AUTOR')):
            usuario = User.objects.get(username=correo)
            self.assertEqual(nombres_de_roles(usuario), {rol})
            self.assertTrue(usuario.check_password('Prueba#12345'))

    def test_usuario_multirol_tiene_administrador_y_autor(self):
        preparar()
        usuario = User.objects.get(username='multirol@pruebas.co')
        self.assertEqual(nombres_de_roles(usuario), {'ADMIN', 'AUTOR'})
        self.assertTrue(usuario.check_password('Prueba#12345'))

    def test_crea_conferencia_lineas_y_plazo_vigente(self):
        preparar()
        conferencia = Conferencia.objects.get(nombre='Congreso de Pruebas')
        self.assertEqual(LineaTematica.objects.filter(id_conferencia=conferencia).count(), 4)
        plazo = Plazo.objects.get(id_conferencia=conferencia, tipo_plazo=Plazo.POSTULACION)
        from django.utils import timezone
        self.assertTrue(plazo.fecha_inicio <= timezone.now() <= plazo.fecha_fin)

    def test_se_puede_ejecutar_varias_veces_sin_duplicar(self):
        preparar()
        preparar()
        self.assertEqual(User.objects.count(), 4)
        self.assertEqual(Conferencia.objects.count(), 2)
        self.assertEqual(LineaTematica.objects.count(), 7)
        self.assertEqual(Plazo.objects.count(), 6)

    def test_conferencia_qa_tiene_las_cinco_etapas_en_orden_y_tres_lineas(self):
        preparar()
        qa = Conferencia.objects.get(nombre='Conferencia de Pruebas QA')
        self.assertEqual(LineaTematica.objects.filter(id_conferencia=qa).count(), 3)
        plazos = list(Plazo.objects.filter(id_conferencia=qa).order_by('fecha_inicio'))
        self.assertEqual([p.tipo_plazo for p in plazos], [t for t, _ in Plazo.TIPOS])
        for antes, despues in zip(plazos, plazos[1:]):
            self.assertLess(antes.fecha_fin, despues.fecha_inicio)
        self.assertTrue(all(p.fecha_inicio < p.fecha_fin for p in plazos))

    def test_el_autor_creado_puede_iniciar_sesion(self):
        preparar()
        with override_settings(TURNSTILE_SECRET_KEY=''):
            pass
        usuario = User.objects.get(username='autor@pruebas.co')
        cliente = APIClient()
        cliente.force_authenticate(usuario)
        self.assertEqual(cliente.get('/api/auth/me/').status_code, 200)

    def test_el_autor_creado_puede_registrar_un_articulo(self):
        preparar()
        conferencia = Conferencia.objects.get(nombre='Congreso de Pruebas')
        linea = LineaTematica.objects.filter(id_conferencia=conferencia).first()
        cliente = APIClient()
        cliente.force_authenticate(User.objects.get(username='autor@pruebas.co'))
        r = cliente.post('/api/articulos/', {
            'id_conferencia': conferencia.id_conferencia, 'id_linea': linea.id_linea,
            'titulo': 'T', 'resumen': 'R', 'palabras_clave': 'k',
        }, format='json')
        self.assertEqual(r.status_code, 201)

    def test_se_niega_a_correr_sobre_postgresql(self):
        bases = {'default': {'ENGINE': 'django.db.backends.postgresql'}}
        with override_settings(DATABASES=bases):
            with self.assertRaises(CommandError):
                call_command('preparar_entorno_pruebas', stdout=StringIO())
        self.assertEqual(User.objects.count(), 0)
