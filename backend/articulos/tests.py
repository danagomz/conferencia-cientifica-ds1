from rest_framework.test import APITestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .models import Articulo

URL = '/api/articulos/'


class RegistrarArticuloTests(APITestCase):

    def setUp(self):
        self.conf = crear_conferencia()
        self.otra = crear_conferencia('Congreso B', '2026')
        self.linea = LineaTematica.objects.create(id_conferencia=self.conf, nombre='IA')
        self.linea_otra = LineaTematica.objects.create(id_conferencia=self.otra, nombre='Redes')
        self.autor = usuario_con_rol('autor@x.co', 'AUTOR')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        self.datos = {
            'id_conferencia': self.conf.id_conferencia,
            'id_linea': self.linea.id_linea,
            'titulo': 'Un artículo',
            'resumen': 'Resumen del artículo',
            'palabras_clave': 'ia, datos',
        }

    def test_autor_registra_articulo(self):
        self.client.force_authenticate(self.autor)
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 201)
        art = Articulo.objects.get(pk=r.data['id_articulo'])
        self.assertEqual(art.id_usuario_registra, self.autor)
        self.assertEqual(art.estado_articulo, 'REGISTRADO')
        self.assertTrue(art.habilitado)

    def test_sin_autenticar_no_puede_registrar(self):
        r = self.client.post(URL, self.datos, format='json')
        self.assertIn(r.status_code, (401, 403))

    def test_comite_no_puede_registrar(self):
        self.client.force_authenticate(self.comite)
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(Articulo.objects.count(), 0)

    def test_linea_de_otra_conferencia_se_rechaza(self):
        self.client.force_authenticate(self.autor)
        self.datos['id_linea'] = self.linea_otra.id_linea
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('id_linea', r.data)

    def test_linea_deshabilitada_se_rechaza(self):
        self.client.force_authenticate(self.autor)
        self.linea.habilitada = False
        self.linea.save()
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 400)

    def test_faltan_campos_obligatorios(self):
        self.client.force_authenticate(self.autor)
        r = self.client.post(URL, {'id_conferencia': self.conf.id_conferencia}, format='json')
        self.assertEqual(r.status_code, 400)
        for campo in ('id_linea', 'titulo', 'resumen', 'palabras_clave'):
            self.assertIn(campo, r.data)

    def test_conferencia_inexistente(self):
        self.client.force_authenticate(self.autor)
        self.datos['id_conferencia'] = 9999
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 400)
