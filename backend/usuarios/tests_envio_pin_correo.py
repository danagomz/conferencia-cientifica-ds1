"""SDGC-108 (HU-007, CA-044): envío del PIN de recuperación al correo electrónico."""
import json
import urllib.error
from io import BytesIO
from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from django.core.mail import EmailMessage
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle

from .correo_brevo import URL_API_BREVO, BrevoEmailBackend, ErrorEnvioCorreo
from .models import CodigoRecuperacionContrasena
from .tests_login import REST_FRAMEWORK_PRUEBAS, crear_usuario

SOLICITAR = '/api/auth/recuperar-contrasena/'
BACKEND_BREVO = 'usuarios.correo_brevo.BrevoEmailBackend'
REMITENTE = 'Sistema de Gestión de Conferencias <sgc.pruebas@example.com>'


def respuesta_brevo(codigo=201):
    """Simula la respuesta de urlopen, que se usa con 'with'."""
    respuesta = MagicMock()
    respuesta.status = codigo
    respuesta.__enter__.return_value = respuesta
    return respuesta


@override_settings(BREVO_API_KEY='clave-de-prueba', DEFAULT_FROM_EMAIL=REMITENTE, EMAIL_TIMEOUT=7)
class BackendBrevoTests(SimpleTestCase):
    def mensaje(self):
        return EmailMessage(
            'Código para recuperar tu contraseña',
            'Tu PIN de recuperación es 012345. Vence en 10 minutos.',
            None,
            ['autor@example.com'],
        )

    @patch('usuarios.correo_brevo.urllib.request.urlopen')
    def test_envia_el_correo_a_la_api_de_brevo_por_https(self, urlopen):
        urlopen.return_value = respuesta_brevo()

        enviados = BrevoEmailBackend().send_messages([self.mensaje()])

        self.assertEqual(enviados, 1)
        peticion = urlopen.call_args.args[0]
        self.assertEqual(peticion.full_url, URL_API_BREVO)
        self.assertTrue(URL_API_BREVO.startswith('https://'))
        self.assertEqual(peticion.get_method(), 'POST')
        self.assertEqual(peticion.get_header('Api-key'), 'clave-de-prueba')
        self.assertEqual(urlopen.call_args.kwargs['timeout'], 7)

    @patch('usuarios.correo_brevo.urllib.request.urlopen')
    def test_el_correo_lleva_remitente_destinatario_asunto_y_pin(self, urlopen):
        urlopen.return_value = respuesta_brevo()

        BrevoEmailBackend().send_messages([self.mensaje()])

        datos = json.loads(urlopen.call_args.args[0].data)
        self.assertEqual(
            datos['sender'],
            {'email': 'sgc.pruebas@example.com', 'name': 'Sistema de Gestión de Conferencias'},
        )
        self.assertEqual(datos['to'], [{'email': 'autor@example.com'}])
        self.assertEqual(datos['subject'], 'Código para recuperar tu contraseña')
        self.assertIn('012345', datos['textContent'])

    @patch('usuarios.correo_brevo.urllib.request.urlopen')
    def test_si_brevo_rechaza_el_correo_se_informa_el_error(self, urlopen):
        urlopen.side_effect = urllib.error.HTTPError(
            URL_API_BREVO, 401, 'Unauthorized', {}, BytesIO(b'{"code":"unauthorized"}')
        )

        with self.assertRaises(ErrorEnvioCorreo):
            BrevoEmailBackend().send_messages([self.mensaje()])

    @patch('usuarios.correo_brevo.urllib.request.urlopen')
    def test_si_no_hay_conexion_se_informa_el_error(self, urlopen):
        urlopen.side_effect = urllib.error.URLError('timed out')

        with self.assertRaises(urllib.error.URLError):
            BrevoEmailBackend().send_messages([self.mensaje()])

    @patch('usuarios.correo_brevo.urllib.request.urlopen')
    def test_con_fail_silently_no_se_lanza_el_error(self, urlopen):
        urlopen.side_effect = urllib.error.URLError('timed out')

        enviados = BrevoEmailBackend(fail_silently=True).send_messages([self.mensaje()])

        self.assertEqual(enviados, 0)

    @override_settings(BREVO_API_KEY='')
    def test_sin_clave_de_la_api_no_intenta_enviar(self):
        with self.assertRaises(ImproperlyConfigured):
            BrevoEmailBackend().send_messages([self.mensaje()])


@override_settings(
    REST_FRAMEWORK=REST_FRAMEWORK_PRUEBAS,
    EMAIL_BACKEND=BACKEND_BREVO,
    BREVO_API_KEY='clave-de-prueba',
    DEFAULT_FROM_EMAIL=REMITENTE,
)
class SolicitudPinConBrevoTests(APITestCase):
    def setUp(self):
        cache.clear()
        parche = patch.dict(
            ScopedRateThrottle.THROTTLE_RATES, REST_FRAMEWORK_PRUEBAS['DEFAULT_THROTTLE_RATES']
        )
        parche.start()
        self.addCleanup(parche.stop)
        self.usuario = crear_usuario()

    def solicitar(self):
        return self.client.post(SOLICITAR, {'email': self.usuario.email}, format='json')

    @patch('usuarios.correo_brevo.urllib.request.urlopen')
    def test_la_solicitud_envia_el_pin_al_correo_del_usuario(self, urlopen):
        urlopen.return_value = respuesta_brevo()

        respuesta = self.solicitar()

        self.assertEqual(respuesta.status_code, 200)
        datos = json.loads(urlopen.call_args.args[0].data)
        self.assertEqual(datos['to'], [{'email': self.usuario.email}])
        self.assertRegex(datos['textContent'], r'\b\d{6}\b')
        self.assertTrue(CodigoRecuperacionContrasena.objects.filter(usuario=self.usuario).exists())

    @patch('usuarios.correo_brevo.urllib.request.urlopen')
    def test_si_el_correo_no_sale_responde_503_y_no_deja_el_pin_guardado(self, urlopen):
        urlopen.side_effect = urllib.error.URLError('timed out')

        with self.assertLogs('usuarios.autenticacion', level='ERROR'):
            respuesta = self.solicitar()

        self.assertEqual(respuesta.status_code, 503)
        self.assertEqual(
            respuesta.data['detail'], 'No se pudo enviar el correo. Intenta de nuevo más tarde.'
        )
        self.assertFalse(CodigoRecuperacionContrasena.objects.filter(usuario=self.usuario).exists())
