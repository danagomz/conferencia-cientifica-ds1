from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from conferencias.models import LineaTematica, Plazo
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol
from usuarios.roles import asignar_roles

from .models import AsignacionEvaluador, AutorArticulo
from .restricciones_asignacion import MENSAJE_POSTULACION_ABIERTA
from .tests_consulta import crear_articulo


class RestriccionesAsignacionTests(APITestCase):
    """SDGC-205: condiciones que debe cumplir la asignación de evaluadores."""

    def setUp(self):
        self.conf = crear_conferencia()
        linea = LineaTematica.objects.create(id_conferencia=self.conf, nombre='IA')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        self.autor = usuario_con_rol('autor@x.co', 'AUTOR')
        self.e = [usuario_con_rol(f'e{i}@x.co', 'COMITE') for i in range(1, 5)]
        self.articulo = crear_articulo(self.conf, linea, self.autor)
        self.url = f'/api/articulos/{self.articulo.pk}/evaluadores/'
        self.client.force_authenticate(self.comite)
        self.poner_plazo(terminado=True)

    def poner_plazo(self, terminado):
        ahora = timezone.now()
        fin = ahora - timedelta(days=1) if terminado else ahora + timedelta(days=5)
        Plazo.objects.update_or_create(
            id_conferencia=self.conf, tipo_plazo=Plazo.POSTULACION,
            defaults={'fecha_inicio': ahora - timedelta(days=30), 'fecha_fin': fin},
        )

    def asignar(self, usuarios):
        return self.client.post(self.url, {'evaluadores': [u.pk for u in usuarios]}, format='json')

    def cantidad(self):
        return AsignacionEvaluador.objects.filter(id_articulo=self.articulo).count()

    def test_asigna_cuando_se_cumplen_todas_las_condiciones(self):
        self.assertEqual(self.asignar(self.e[:3]).status_code, 201)
        self.assertEqual(self.cantidad(), 3)

    def test_rechaza_mientras_la_postulacion_sigue_abierta(self):
        self.poner_plazo(terminado=False)
        respuesta = self.asignar(self.e[:3])
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.json()['plazo'], [MENSAJE_POSTULACION_ABIERTA])
        self.assertEqual(self.cantidad(), 0)

    def test_sin_plazo_de_postulacion_configurado_no_se_bloquea(self):
        Plazo.objects.filter(id_conferencia=self.conf).delete()
        self.assertEqual(self.asignar(self.e[:3]).status_code, 201)

    def test_rechaza_a_quien_no_pertenece_al_comite(self):
        admin = usuario_con_rol('admin@x.co', 'ADMIN')
        otro_autor = usuario_con_rol('otro@x.co', 'AUTOR')
        for intruso in (admin, otro_autor):
            respuesta = self.asignar([self.e[0], self.e[1], intruso])
            self.assertEqual(respuesta.status_code, 400)
            self.assertIn('comité científico', respuesta.json()['evaluadores'][0])
        self.assertEqual(self.cantidad(), 0)

    def test_rechaza_una_cuenta_deshabilitada(self):
        self.e[2].is_active = False
        self.e[2].save()
        self.assertEqual(self.asignar(self.e[:3]).status_code, 400)
        self.assertEqual(self.cantidad(), 0)

    def test_rechaza_que_el_autor_evalue_su_propio_articulo(self):
        miembro = usuario_con_rol('miembro@x.co', 'COMITE')
        AutorArticulo.objects.create(
            id_articulo=self.articulo, id_usuario=miembro, nombres='Mia', apellidos='Coautora',
            email='miembro@x.co', institucion='UV', orden_autoria=2,
        )
        respuesta = self.asignar([self.e[0], self.e[1], miembro])
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('Un autor no puede ser evaluador de su propio artículo', respuesta.json()['evaluadores'][0])
        self.assertEqual(self.cantidad(), 0)

    def test_rechaza_al_autor_que_solo_figura_por_correo(self):
        AutorArticulo.objects.create(
            id_articulo=self.articulo, id_usuario=None, nombres='E', apellidos='Tres',
            email='E3@X.co', institucion='UV', orden_autoria=2,
        )
        self.assertEqual(self.asignar(self.e[:3]).status_code, 400)

    def test_rechaza_a_quien_registro_el_articulo_aunque_sea_del_comite(self):
        asignar_roles(self.autor, ['AUTOR', 'COMITE'])
        respuesta = self.asignar([self.e[0], self.e[1], self.autor])
        self.assertEqual(respuesta.status_code, 400)

    def test_un_miembro_del_comite_que_es_autor_de_otro_articulo_si_puede_evaluar(self):
        miembro = usuario_con_rol('miembro@x.co', 'COMITE')
        asignar_roles(miembro, ['COMITE', 'AUTOR'])
        crear_articulo(self.conf, self.articulo.id_linea, miembro, 'Suyo')
        self.assertEqual(self.asignar([self.e[0], self.e[1], miembro]).status_code, 201)

    def test_un_intento_invalido_conserva_la_asignacion_anterior(self):
        self.assertEqual(self.asignar(self.e[:3]).status_code, 201)
        admin = usuario_con_rol('admin@x.co', 'ADMIN')
        self.assertEqual(self.asignar([self.e[0], self.e[1], admin]).status_code, 400)
        asignados = set(
            AsignacionEvaluador.objects.filter(id_articulo=self.articulo)
            .values_list('id_evaluador', flat=True)
        )
        self.assertEqual(asignados, {u.pk for u in self.e[:3]})
