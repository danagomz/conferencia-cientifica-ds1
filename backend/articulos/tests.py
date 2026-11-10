from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from conferencias.models import LineaTematica, Plazo
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from usuarios.models import PerfilUsuario

from .models import Articulo, AutorArticulo

URL = '/api/articulos/'
URL_CONTEXTO = '/api/articulos/contexto/'


class ContextoArticuloTests(APITestCase):

    def test_autor_consulta_convocatorias_abiertas_y_su_perfil(self):
        conferencia = crear_conferencia()
        conferencia.estado = 'ACTIVA'
        conferencia.save(update_fields=['estado'])
        linea = LineaTematica.objects.create(id_conferencia=conferencia, nombre='Inteligencia artificial')
        ahora = timezone.now()
        Plazo.objects.create(
            id_conferencia=conferencia,
            tipo_plazo=Plazo.POSTULACION,
            fecha_inicio=ahora - timedelta(days=1),
            fecha_fin=ahora + timedelta(days=5),
        )
        autor = usuario_con_rol('autora@x.co', 'AUTOR')
        self.client.force_authenticate(autor)

        respuesta = self.client.get(URL_CONTEXTO)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['autor_actual']['email'], autor.email)
        self.assertEqual(respuesta.data['convocatorias'][0]['id'], conferencia.id_conferencia)
        self.assertTrue(respuesta.data['convocatorias'][0]['postulaciones_abiertas'])
        self.assertEqual(
            respuesta.data['convocatorias'][0]['lineas_tematicas'],
            [{'id': linea.id_linea, 'nombre': linea.nombre}],
        )

    def test_contexto_requiere_rol_autor(self):
        usuario = usuario_con_rol('comite@x.co', 'COMITE')
        self.client.force_authenticate(usuario)

        respuesta = self.client.get(URL_CONTEXTO)

        self.assertEqual(respuesta.status_code, 403)


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

    # ---- SDGC-129: asociación del artículo con su autor ----
    def test_articulo_queda_asociado_al_autor_responsable(self):
        self.autor.first_name, self.autor.last_name = 'Ana', 'Pérez'
        self.autor.save()
        PerfilUsuario.objects.create(usuario=self.autor, institucion='Univalle')
        self.client.force_authenticate(self.autor)
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 201)
        autores = AutorArticulo.objects.filter(id_articulo=r.data['id_articulo'])
        self.assertEqual(autores.count(), 1)
        a = autores.first()
        self.assertEqual(a.id_usuario, self.autor)
        self.assertEqual((a.nombres, a.apellidos), ('Ana', 'Pérez'))
        self.assertEqual(a.email, 'autor@x.co')
        self.assertEqual(a.institucion, 'Univalle')
        self.assertEqual(a.orden_autoria, 1)
        self.assertTrue(a.es_responsable)

    def test_respuesta_incluye_el_autor(self):
        self.client.force_authenticate(self.autor)
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(len(r.data['autores']), 1)
        self.assertTrue(r.data['autores'][0]['es_responsable'])

    def test_autor_sin_perfil_no_rompe_el_registro(self):
        self.client.force_authenticate(self.autor)
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['autores'][0]['institucion'], '')

    def test_articulo_rechazado_no_deja_autores_huerfanos(self):
        self.client.force_authenticate(self.autor)
        self.plazo.delete()
        self.client.post(URL, self.datos, format='json')
        self.assertEqual(AutorArticulo.objects.count(), 0)

    # ---- CA-060A..D: varios autores, responsable y coautores sin cuenta ----
    def coautor(self, correo='co@x.co', **extra):
        d = {'nombres': 'Luis', 'apellidos': 'Gil', 'email': correo, 'institucion': 'UNAL'}
        d.update(extra)
        return d

    def test_registra_varios_autores_sin_cuenta(self):
        self.client.force_authenticate(self.autor)
        self.datos['coautores'] = [self.coautor('a@x.co'), self.coautor('b@x.co', nombres='Eva')]
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 201)
        autores = list(AutorArticulo.objects.filter(id_articulo=r.data['id_articulo']).order_by('orden_autoria'))
        self.assertEqual(len(autores), 3)
        self.assertEqual([a.orden_autoria for a in autores], [1, 2, 3])
        self.assertIsNone(autores[1].id_usuario)
        self.assertEqual((autores[1].nombres, autores[1].email, autores[1].institucion),
                         ('Luis', 'a@x.co', 'UNAL'))
        self.assertTrue(autores[0].es_responsable)
        self.assertEqual(sum(a.es_responsable for a in autores), 1)

    def test_un_coautor_puede_ser_el_responsable(self):
        self.client.force_authenticate(self.autor)
        self.datos['coautores'] = [self.coautor('a@x.co', es_responsable=True), self.coautor('b@x.co')]
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 201)
        resp = AutorArticulo.objects.filter(id_articulo=r.data['id_articulo'], es_responsable=True)
        self.assertEqual(resp.count(), 1)
        self.assertEqual(resp.first().email, 'a@x.co')

    def test_dos_responsables_se_rechazan(self):
        self.client.force_authenticate(self.autor)
        self.datos['coautores'] = [self.coautor('a@x.co', es_responsable=True),
                                   self.coautor('b@x.co', es_responsable=True)]
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Articulo.objects.count(), 0)

    def test_coautor_con_datos_incompletos_se_rechaza(self):
        self.client.force_authenticate(self.autor)
        self.datos['coautores'] = [{'nombres': 'Luis', 'email': 'no-es-correo'}]
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 400)
        for campo in ('apellidos', 'email', 'institucion'):
            self.assertIn(campo, r.data['coautores'][0])

    def test_correos_repetidos_se_rechazan(self):
        self.client.force_authenticate(self.autor)
        self.datos['coautores'] = [self.coautor('a@x.co'), self.coautor('A@x.co')]
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 400)

    def test_coautor_con_el_correo_de_quien_registra_se_rechaza(self):
        self.client.force_authenticate(self.autor)
        self.datos['coautores'] = [self.coautor('autor@x.co')]
        r = self.client.post(URL, self.datos, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Articulo.objects.count(), 0)
