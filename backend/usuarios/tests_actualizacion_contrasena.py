import re
from unittest.mock import patch

from django.contrib.auth.hashers import identify_hasher
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle

from .models import CodigoRecuperacionContrasena
from .tests_login import CLAVE, LOGIN, REST_FRAMEWORK_PRUEBAS, crear_usuario

SOLICITAR = '/api/auth/recuperar-contrasena/'
RESTABLECER = '/api/auth/restablecer-contrasena/'
CORREO_EN_MEMORIA = 'django.core.mail.backends.locmem.EmailBackend'
NUEVA = 'NuevaClaveSegura#2026'


@override_settings(REST_FRAMEWORK=REST_FRAMEWORK_PRUEBAS, EMAIL_BACKEND=CORREO_EN_MEMORIA)
class ActualizacionContrasenaTests(APITestCase):
    """SDGC-112 (HU-007, CA-048 a CA-051): establecer la nueva contraseña con un PIN válido."""

    def setUp(self):
        cache.clear()
        parche = patch.dict(
            ScopedRateThrottle.THROTTLE_RATES, REST_FRAMEWORK_PRUEBAS['DEFAULT_THROTTLE_RATES']
        )
        parche.start()
        self.addCleanup(parche.stop)
        captcha = patch('usuarios.autenticacion.captcha_es_valido', return_value=True)
        captcha.start()
        self.addCleanup(captcha.stop)
        self.usuario = crear_usuario()
        self.client.post(SOLICITAR, {'email': self.usuario.email}, format='json')
        self.pin = re.search(r'\b\d{6}\b', mail.outbox[-1].body).group()

    def restablecer(self, password, pin=None, correo=None):
        return self.client.post(
            RESTABLECER,
            {'email': correo or self.usuario.email, 'pin': pin or self.pin, 'password': password},
            format='json',
        )

    def iniciar_sesion(self, password):
        return self.client.post(
            LOGIN,
            {'email': self.usuario.email, 'password': password, 'captcha_token': 'x'},
            format='json',
        )

    def codigo(self):
        return CodigoRecuperacionContrasena.objects.get(usuario=self.usuario)

    # ---- Contraseña válida (CA-048, CA-050, CA-051) ----
    def test_con_el_pin_valido_se_actualiza_la_contrasena_y_se_informa(self):
        respuesta = self.restablecer(NUEVA)
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['detail'], 'Tu contraseña se actualizó correctamente.')

    def test_la_nueva_contrasena_queda_asociada_al_usuario_y_la_anterior_deja_de_servir(self):
        self.restablecer(NUEVA)
        self.assertEqual(self.iniciar_sesion(NUEVA).status_code, 200)
        self.assertEqual(self.iniciar_sesion(CLAVE).status_code, 401)

    def test_la_contrasena_se_guarda_con_hash_y_nunca_en_claro(self):
        self.restablecer(NUEVA)
        self.usuario.refresh_from_db()
        self.assertNotEqual(self.usuario.password, NUEVA)
        self.assertNotIn(NUEVA, self.usuario.password)
        self.assertEqual(identify_hasher(self.usuario.password).algorithm, 'pbkdf2_sha256')

    def test_al_cambiarla_el_pin_queda_usado(self):
        self.restablecer(NUEVA)
        self.assertIsNotNone(self.codigo().usado_en)

    def test_solo_cambia_la_contrasena_de_la_cuenta_del_pin(self):
        otro = crear_usuario('otro@univalle.edu.co')
        self.restablecer(NUEVA)
        otro.refresh_from_db()
        self.assertTrue(otro.check_password(CLAVE))

    def test_se_conservan_los_demas_datos_de_la_cuenta(self):
        self.restablecer(NUEVA)
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.email, 'ana@univalle.edu.co')
        self.assertEqual(self.usuario.first_name, 'Ana')
        self.assertTrue(self.usuario.is_active)

    def test_la_contrasena_puede_llevar_espacios_internos_y_no_se_recorta(self):
        con_espacios = 'Clave Segura # 2026'
        self.assertEqual(self.restablecer(con_espacios).status_code, 200)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password(con_espacios))

    # ---- Contraseña inválida (CA-049) ----
    def test_una_contrasena_que_incumple_las_reglas_se_rechaza_y_no_se_guarda(self):
        invalidas = {
            'corta': 'Ab#1',
            'solo_numeros': '48201937465',
            'muy_comun': 'password123',
            'parecida_al_correo': 'ana@univalle.edu.co',
        }
        for nombre, clave in invalidas.items():
            with self.subTest(nombre):
                respuesta = self.restablecer(clave)
                self.assertEqual(respuesta.status_code, 400)
                self.assertIn('password', respuesta.data)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password(CLAVE))

    def test_una_contrasena_rechazada_no_gasta_el_pin_y_se_puede_reintentar(self):
        self.assertEqual(self.restablecer('corta').status_code, 400)
        self.assertEqual(self.codigo().intentos, 0)
        self.assertIsNone(self.codigo().usado_en)
        self.assertEqual(self.restablecer(NUEVA).status_code, 200)

    def test_sin_contrasena_se_rechaza(self):
        respuesta = self.client.post(
            RESTABLECER, {'email': self.usuario.email, 'pin': self.pin}, format='json'
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('password', respuesta.data)

    def test_una_contrasena_en_blanco_se_rechaza(self):
        respuesta = self.restablecer('')
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('password', respuesta.data)

    # ---- Seguridad (el PIN manda) ----
    def test_con_un_pin_incorrecto_no_se_cambia_la_contrasena_aunque_la_nueva_sea_valida(self):
        pin_malo = '000000' if self.pin != '000000' else '000001'
        self.assertEqual(self.restablecer(NUEVA, pin=pin_malo).status_code, 400)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password(CLAVE))

    def test_no_se_puede_cambiar_la_contrasena_dos_veces_con_el_mismo_pin(self):
        self.restablecer(NUEVA)
        segunda = 'SegundaClave#2027'
        self.assertEqual(self.restablecer(segunda).status_code, 400)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password(NUEVA))
