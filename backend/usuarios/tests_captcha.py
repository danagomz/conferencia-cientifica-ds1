import json
from unittest.mock import MagicMock, patch
from urllib.error import URLError

from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase

from .captcha import captcha_es_valido
from .tests_login import CLAVE, LOGIN, crear_usuario

CORREO = 'ana@univalle.edu.co'


def respuesta_de_cloudflare(datos):
    respuesta = MagicMock()
    respuesta.read.return_value = json.dumps(datos).encode()
    respuesta.__enter__.return_value = respuesta
    return respuesta


@override_settings(TURNSTILE_SECRET_KEY='clave-secreta')
class CaptchaEsValidoTests(SimpleTestCase):

    def test_sin_token_no_es_valido(self):
        self.assertFalse(captcha_es_valido(''))
        self.assertFalse(captcha_es_valido(None))

    @override_settings(TURNSTILE_SECRET_KEY='')
    def test_sin_clave_secreta_no_es_valido(self):
        self.assertFalse(captcha_es_valido('un-token'))

    @patch('usuarios.captcha.request.urlopen')
    def test_cloudflare_dice_que_es_valido(self, urlopen):
        urlopen.return_value = respuesta_de_cloudflare({'success': True})
        self.assertTrue(captcha_es_valido('un-token'))

    @patch('usuarios.captcha.request.urlopen')
    def test_cloudflare_dice_que_no_es_valido(self, urlopen):
        urlopen.return_value = respuesta_de_cloudflare(
            {'success': False, 'error-codes': ['invalid-input-response']}
        )
        self.assertFalse(captcha_es_valido('un-token'))

    @patch('usuarios.captcha.request.urlopen', side_effect=URLError('sin conexión'))
    def test_si_cloudflare_no_responde_no_es_valido(self, urlopen):
        self.assertFalse(captcha_es_valido('un-token'))


class LoginConCaptchaTests(APITestCase):

    def setUp(self):
        crear_usuario(CORREO)

    @patch('usuarios.autenticacion.captcha_es_valido', return_value=True)
    def test_captcha_valido_y_credenciales_correctas_inicia_sesion(self, captcha):
        r = self.client.post(LOGIN, {'email': CORREO, 'password': CLAVE, 'captcha_token': 'ok'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.data)
        captcha.assert_called_once_with('ok')

    @patch('usuarios.autenticacion.captcha_es_valido', return_value=False)
    def test_captcha_invalido_impide_el_acceso_aunque_la_clave_sea_correcta(self, captcha):
        r = self.client.post(LOGIN, {'email': CORREO, 'password': CLAVE, 'captcha_token': 'malo'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('captcha_token', r.data)
        self.assertNotIn('access', r.data)

    def test_sin_captcha_no_se_puede_iniciar_sesion(self):
        r = self.client.post(LOGIN, {'email': CORREO, 'password': CLAVE}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('captcha_token', r.data)
        self.assertNotIn('access', r.data)
