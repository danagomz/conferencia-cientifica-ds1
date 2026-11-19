from rest_framework.test import APITestCase

from .roles import COMITE
from .tests_filtros_usuarios import crear


class CriteriosDeFiltradoUsuariosTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(crear('a@x.co', 'A', 'B', COMITE))

    def test_lista_los_criterios_nombre_y_rol(self):
        r = self.client.get('/api/usuarios/filtros/')
        self.assertEqual(r.status_code, 200)
        parametros = [c['parametro'] for c in r.data['criterios']]
        self.assertEqual(parametros, ['nombre', 'rol'])
        rol = r.data['criterios'][1]
        self.assertEqual([o['valor'] for o in rol['opciones']], ['ADMIN', 'COMITE', 'AUTOR'])

    def test_requiere_sesion(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/usuarios/filtros/').status_code, 401)
