import re
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.hashers import check_password
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle

from .models import CodigoRecuperacionContrasena
from .tests_login import REST_FRAMEWORK_PRUEBAS, crear_usuario

SOLICITAR = '/api/auth/recuperar-contrasena/'
RESTABLECER = '/api/auth/restablecer-contrasena/'
CORREO_EN_MEMORIA = 'django.core.mail.backends.locmem.EmailBackend'


@override_settings(REST_FRAMEWORK=REST_FRAMEWORK_PRUEBAS, EMAIL_BACKEND=CORREO_EN_MEMORIA)
class GeneracionPinRecuperacionTests(APITestCase):
    """SDGC-107 (HU-007, CA-044): generación del PIN de recuperación."""

    def setUp(self):
        cache.clear()
        parche = patch.dict(
            ScopedRateThrottle.THROTTLE_RATES, REST_FRAMEWORK_PRUEBAS['DEFAULT_THROTTLE_RATES']
        )
        parche.start()
        self.addCleanup(parche.stop)
        self.usuario = crear_usuario()

    def solicitar(self, correo=None):
        return self.client.post(SOLICITAR, {'email': correo or self.usuario.email}, format='json')

    def pin_del_correo(self, indice=-1):
        return re.search(r'\b\d{6}\b', mail.outbox[indice].body).group()

    def test_genera_un_pin_de_seis_digitos_y_lo_envia_al_correo_registrado(self):
        self.assertEqual(self.solicitar().status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.usuario.email])
        self.assertRegex(self.pin_del_correo(), r'^\d{6}$')

    def test_el_pin_se_guarda_con_hash_y_nunca_en_claro(self):
        self.solicitar()
        pin = self.pin_del_correo()
        codigo = CodigoRecuperacionContrasena.objects.get(usuario=self.usuario)
        self.assertNotIn(pin, codigo.codigo_hash)
        self.assertTrue(check_password(pin, codigo.codigo_hash))

    def test_el_pin_se_genera_con_aleatoriedad_segura_y_conserva_los_ceros(self):
        with patch('usuarios.autenticacion.secrets.randbelow', return_value=42) as sorteo:
            self.solicitar()
        sorteo.assert_called_once_with(1_000_000)
        self.assertEqual(self.pin_del_correo(), '000042')

    def test_el_pin_queda_asociado_a_la_solicitud_del_usuario_correcto(self):
        otro = crear_usuario('otro@univalle.edu.co')
        self.solicitar()
        self.assertEqual(CodigoRecuperacionContrasena.objects.filter(usuario=self.usuario).count(), 1)
        self.assertEqual(CodigoRecuperacionContrasena.objects.filter(usuario=otro).count(), 0)

    def test_el_pin_vence_a_los_diez_minutos_y_nace_sin_intentos_ni_uso(self):
        self.solicitar()
        codigo = CodigoRecuperacionContrasena.objects.get(usuario=self.usuario)
        self.assertAlmostEqual(
            (codigo.expira_en - codigo.creado_en).total_seconds(),
            timedelta(minutes=10).total_seconds(),
            delta=2,
        )
        self.assertEqual(codigo.intentos, 0)
        self.assertIsNone(codigo.usado_en)

    def test_una_nueva_solicitud_invalida_el_pin_anterior(self):
        self.solicitar()
        pin_anterior = self.pin_del_correo()
        with patch('usuarios.autenticacion.secrets.randbelow', return_value=123456):
            self.solicitar()
        self.assertEqual(CodigoRecuperacionContrasena.objects.filter(usuario=self.usuario).count(), 1)
        respuesta = self.client.post(
            RESTABLECER,
            {'email': self.usuario.email, 'pin': pin_anterior, 'password': 'NuevaClaveSegura#2026'},
            format='json',
        )
        self.assertEqual(respuesta.status_code, 400)
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.check_password('NuevaClaveSegura#2026'))

    def test_el_correo_se_reconoce_sin_importar_mayusculas_ni_espacios(self):
        self.assertEqual(self.solicitar('  ANA@Univalle.edu.co ').status_code, 200)
        self.assertEqual(len(mail.outbox), 1)

    def test_un_correo_no_registrado_no_genera_pin_ni_correo_y_responde_igual(self):
        existente = self.solicitar()
        inexistente = self.solicitar('nadie@univalle.edu.co')
        self.assertEqual(inexistente.status_code, 200)
        self.assertEqual(existente.data, inexistente.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(CodigoRecuperacionContrasena.objects.count(), 1)

    def test_una_cuenta_deshabilitada_no_recibe_pin(self):
        crear_usuario('baja@univalle.edu.co', activo=False)
        respuesta = self.solicitar('baja@univalle.edu.co')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(CodigoRecuperacionContrasena.objects.count(), 0)

    def test_un_correo_con_formato_invalido_se_rechaza_sin_generar_pin(self):
        respuesta = self.client.post(SOLICITAR, {'email': 'no-es-correo'}, format='json')
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(CodigoRecuperacionContrasena.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_sin_correo_en_la_solicitud_se_rechaza(self):
        self.assertEqual(self.client.post(SOLICITAR, {}, format='json').status_code, 400)


class LimiteDeSolicitudesDePinTests(APITestCase):
    """SDGC-107: máximo 3 solicitudes de PIN por hora, para evitar el abuso del envío."""

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        parche = patch.dict(ScopedRateThrottle.THROTTLE_RATES, {'password_recovery_request': '3/hour'})
        parche.start()
        self.addCleanup(parche.stop)
        crear_usuario()

    @override_settings(EMAIL_BACKEND=CORREO_EN_MEMORIA)
    def test_la_cuarta_solicitud_en_una_hora_se_bloquea(self):
        for _ in range(3):
            respuesta = self.client.post(SOLICITAR, {'email': 'ana@univalle.edu.co'}, format='json')
            self.assertEqual(respuesta.status_code, 200)
        respuesta = self.client.post(SOLICITAR, {'email': 'ana@univalle.edu.co'}, format='json')
        self.assertEqual(respuesta.status_code, 429)
        self.assertEqual(len(mail.outbox), 3)
