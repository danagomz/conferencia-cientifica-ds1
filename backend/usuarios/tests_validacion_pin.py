import re
from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle

from .models import CodigoRecuperacionContrasena
from .tests_login import CLAVE, REST_FRAMEWORK_PRUEBAS, crear_usuario

SOLICITAR = '/api/auth/recuperar-contrasena/'
RESTABLECER = '/api/auth/restablecer-contrasena/'
CORREO_EN_MEMORIA = 'django.core.mail.backends.locmem.EmailBackend'
NUEVA = 'NuevaClaveSegura#2026'
MENSAJE_PIN_INVALIDO = 'El PIN no es válido o ha vencido. Solicita uno nuevo.'


@override_settings(REST_FRAMEWORK=REST_FRAMEWORK_PRUEBAS, EMAIL_BACKEND=CORREO_EN_MEMORIA)
class ValidacionPinRecuperacionTests(APITestCase):
    """SDGC-110 (HU-007, CA-045 a CA-047): validación del PIN antes de cambiar la contraseña."""

    def setUp(self):
        cache.clear()
        parche = patch.dict(
            ScopedRateThrottle.THROTTLE_RATES, REST_FRAMEWORK_PRUEBAS['DEFAULT_THROTTLE_RATES']
        )
        parche.start()
        self.addCleanup(parche.stop)
        self.usuario = crear_usuario()

    def solicitar_pin(self, usuario=None):
        usuario = usuario or self.usuario
        self.client.post(SOLICITAR, {'email': usuario.email}, format='json')
        return re.search(r'\b\d{6}\b', mail.outbox[-1].body).group()

    def restablecer(self, pin, correo=None, password=NUEVA):
        return self.client.post(
            RESTABLECER,
            {'email': correo or self.usuario.email, 'pin': pin, 'password': password},
            format='json',
        )

    def pin_incorrecto(self, pin_real):
        return '000000' if pin_real != '000000' else '000001'

    def contrasena_intacta(self, usuario=None):
        usuario = usuario or self.usuario
        usuario.refresh_from_db()
        return usuario.check_password(CLAVE)

    def codigo(self, usuario=None):
        return CodigoRecuperacionContrasena.objects.get(usuario=usuario or self.usuario)

    # ---- PIN correcto ----
    def test_el_pin_correcto_permite_cambiar_la_contrasena(self):
        respuesta = self.restablecer(self.solicitar_pin())
        self.assertEqual(respuesta.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password(NUEVA))

    def test_el_pin_correcto_se_acepta_con_el_correo_en_otras_mayusculas(self):
        pin = self.solicitar_pin()
        self.assertEqual(self.restablecer(pin, correo='ANA@UNIVALLE.EDU.CO').status_code, 200)

    def test_un_pin_correcto_tras_unos_intentos_fallidos_todavia_funciona(self):
        pin = self.solicitar_pin()
        for _ in range(4):
            self.restablecer(self.pin_incorrecto(pin))
        self.assertEqual(self.codigo().intentos, 4)
        self.assertEqual(self.restablecer(pin).status_code, 200)

    # ---- PIN incorrecto (CA-047) ----
    def test_un_pin_incorrecto_informa_el_error_y_no_cambia_la_contrasena(self):
        pin = self.solicitar_pin()
        respuesta = self.restablecer(self.pin_incorrecto(pin))
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['detail'], MENSAJE_PIN_INVALIDO)
        self.assertTrue(self.contrasena_intacta())

    def test_cada_pin_incorrecto_suma_un_intento(self):
        pin = self.solicitar_pin()
        for esperado in (1, 2, 3):
            self.restablecer(self.pin_incorrecto(pin))
            self.assertEqual(self.codigo().intentos, esperado)

    def test_tras_cinco_intentos_fallidos_el_pin_se_bloquea_aunque_luego_se_escriba_bien(self):
        pin = self.solicitar_pin()
        for _ in range(5):
            self.restablecer(self.pin_incorrecto(pin))
        respuesta = self.restablecer(pin)
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['detail'], MENSAJE_PIN_INVALIDO)
        self.assertTrue(self.contrasena_intacta())

    def test_tras_el_bloqueo_se_puede_pedir_un_pin_nuevo(self):
        pin = self.solicitar_pin()
        for _ in range(5):
            self.restablecer(self.pin_incorrecto(pin))
        pin_nuevo = self.solicitar_pin()
        self.assertEqual(self.codigo().intentos, 0)
        self.assertEqual(self.restablecer(pin_nuevo).status_code, 200)

    def test_un_pin_vencido_se_rechaza(self):
        pin = self.solicitar_pin()
        codigo = self.codigo()
        codigo.expira_en = codigo.creado_en - timedelta(seconds=1)
        codigo.save(update_fields=['expira_en'])
        respuesta = self.restablecer(pin)
        self.assertEqual(respuesta.status_code, 400)
        self.assertTrue(self.contrasena_intacta())

    def test_un_pin_ya_usado_no_sirve_de_nuevo(self):
        pin = self.solicitar_pin()
        self.assertEqual(self.restablecer(pin).status_code, 200)
        self.assertIsNotNone(self.codigo().usado_en)
        otra = 'OtraClaveSegura#2027'
        self.assertEqual(self.restablecer(pin, password=otra).status_code, 400)
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.check_password(otra))

    def test_sin_haber_solicitado_un_pin_no_se_puede_cambiar_la_contrasena(self):
        respuesta = self.restablecer('123456')
        self.assertEqual(respuesta.status_code, 400)
        self.assertTrue(self.contrasena_intacta())

    # ---- Seguridad: evitar que otra persona cambie la contraseña ----
    def test_el_pin_de_un_usuario_no_sirve_para_cambiar_la_contrasena_de_otro(self):
        victima = crear_usuario('victima@univalle.edu.co')
        pin_propio = self.solicitar_pin()
        respuesta = self.restablecer(pin_propio, correo=victima.email)
        self.assertEqual(respuesta.status_code, 400)
        self.assertTrue(self.contrasena_intacta(victima))

    def test_no_se_distingue_entre_correo_inexistente_y_pin_incorrecto(self):
        pin = self.solicitar_pin()
        pin_malo = self.restablecer(self.pin_incorrecto(pin))
        sin_cuenta = self.restablecer('123456', correo='nadie@univalle.edu.co')
        self.assertEqual(pin_malo.status_code, sin_cuenta.status_code)
        self.assertEqual(pin_malo.data, sin_cuenta.data)

    def test_una_cuenta_deshabilitada_no_puede_restablecer(self):
        pin = self.solicitar_pin()
        self.usuario.is_active = False
        self.usuario.save()
        self.assertEqual(self.restablecer(pin).status_code, 400)

    # ---- Formato de los datos ----
    def test_un_pin_con_formato_invalido_se_rechaza_y_no_cuenta_como_intento(self):
        self.solicitar_pin()
        for pin in ('12345', '1234567', 'abcdef', '12 456', ''):
            respuesta = self.restablecer(pin)
            self.assertEqual(respuesta.status_code, 400)
            self.assertIn('pin', respuesta.data)
        self.assertEqual(self.codigo().intentos, 0)

    def test_faltan_campos_obligatorios(self):
        for datos in ({}, {'email': 'ana@univalle.edu.co'}, {'email': 'ana@univalle.edu.co', 'pin': '123456'}):
            self.assertEqual(self.client.post(RESTABLECER, datos, format='json').status_code, 400)


class LimiteDeValidacionDePinTests(APITestCase):
    """SDGC-110: máximo 10 intentos por minuto contra el endpoint de validación."""

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        parche = patch.dict(ScopedRateThrottle.THROTTLE_RATES, {'password_recovery_reset': '10/minute'})
        parche.start()
        self.addCleanup(parche.stop)
        crear_usuario()

    def test_el_intento_once_en_un_minuto_se_bloquea(self):
        datos = {'email': 'ana@univalle.edu.co', 'pin': '123456', 'password': NUEVA}
        for _ in range(10):
            self.assertEqual(self.client.post(RESTABLECER, datos, format='json').status_code, 400)
        self.assertEqual(self.client.post(RESTABLECER, datos, format='json').status_code, 429)
