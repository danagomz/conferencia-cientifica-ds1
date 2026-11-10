from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from conferencias.models import LineaTematica, Plazo
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .models import Articulo

URL = '/api/articulos/'


class RegistrarArticuloTests(APITestCase):

    def setUp(self):
        self.conf = crear_conferencia()
        self.otra = crear_conferencia('Congreso B', '2026')
        self.linea = LineaTematica.objects.create(id_conferencia=self.conf, nombre='IA')
        self.linea_otra = LineaTematica.objects.create(id_conferencia=self.otra, nombre='Redes')
        self.plazo = self.crear_plazo(self.conf, -5, 5)
        self.autor = usuario_con_rol('autor@x.co', 'AUTOR')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        self.datos = {
            'id_conferencia': self.conf.id_conferencia,
            'id_linea': self.linea.id_linea,
            'titulo': 'Un artículo',
            'resumen': 'Resumen del artículo',
            'palabras_clave': 'ia, datos',
        }

    @staticmethod
    def crear_plazo(conferencia, dias_inicio, dias_fin):
        ahora = timezone.now()
        return Plazo.objects.create(
            id_conferencia=conferencia, tipo_plazo=Plazo.POSTULACION,
            fecha_inicio=ahora + timedelta(days=dias_inicio),
            fecha_fin=ahora + timedelta(days=dias_fin),
        )

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
        self.crear_plazo(self.otra, -5, 5)
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

    # ---- SDGC-127: fecha límite de postulación ----
    def test_plazo_vencido_se_rechaza(self):
        self.plazo.fecha_inicio = timezone.now() - timedelta(days=10)
        self.plazo.fecha_fin = timezone.now() - timedelta(days=1)
        self.plazo.save()
        self.client.force_authenticate(self.autor)
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('venció', str(r.data['id_conferencia']))
        self.assertEqual(Articulo.objects.count(), 0)

    def test_plazo_que_no_ha_comenzado_se_rechaza(self):
        self.plazo.fecha_inicio = timezone.now() + timedelta(days=1)
        self.plazo.fecha_fin = timezone.now() + timedelta(days=10)
        self.plazo.save()
        self.client.force_authenticate(self.autor)
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('no ha comenzado', str(r.data['id_conferencia']))

    def test_sin_plazo_configurado_se_rechaza(self):
        self.plazo.delete()
        self.client.force_authenticate(self.autor)
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('no tiene configurado', str(r.data['id_conferencia']))

    def test_plazo_de_otra_etapa_no_habilita_postulacion(self):
        self.plazo.tipo_plazo = Plazo.EVALUACION
        self.plazo.save()
        self.client.force_authenticate(self.autor)
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 400)

