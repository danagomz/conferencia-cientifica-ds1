from django.test import SimpleTestCase, override_settings

ORIGEN = 'https://frontend-pruebas.vercel.app'


class CorsTests(SimpleTestCase):
    """El navegador solo puede llamar a la API desde los orígenes configurados."""

    @override_settings(CORS_ALLOWED_ORIGINS=[ORIGEN])
    def test_origen_autorizado_recibe_la_cabecera_cors(self):
        r = self.client.get('/api/health/', headers={'Origin': ORIGEN})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Access-Control-Allow-Origin'], ORIGEN)

    @override_settings(CORS_ALLOWED_ORIGINS=[ORIGEN])
    def test_origen_no_autorizado_no_recibe_la_cabecera(self):
        r = self.client.get('/api/health/', headers={'Origin': 'https://otro-sitio.com'})
        self.assertNotIn('Access-Control-Allow-Origin', r)

    @override_settings(CORS_ALLOWED_ORIGINS=[ORIGEN])
    def test_la_peticion_previa_del_navegador_se_acepta(self):
        r = self.client.options(
            '/api/auth/login/',
            headers={
                'Origin': ORIGEN,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'content-type,authorization',
            },
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Access-Control-Allow-Origin'], ORIGEN)
        self.assertIn('POST', r['Access-Control-Allow-Methods'])

    def test_sin_configurar_no_se_autoriza_a_nadie(self):
        r = self.client.get('/api/health/', headers={'Origin': ORIGEN})
        self.assertNotIn('Access-Control-Allow-Origin', r)
