from rest_framework.test import APITestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol
from usuarios.models import PerfilUsuario

from .asignaciones import asociar_evaluadores
from .models import AutorArticulo
from .tests_consulta import crear_articulo


class CandidatosEvaluadoresTests(APITestCase):
    """SDGC-195: miembros del comité que se pueden elegir como evaluadores de un artículo."""

    def setUp(self):
        conf = crear_conferencia()
        self.ia = LineaTematica.objects.create(id_conferencia=conf, nombre='Inteligencia artificial')
        self.conf = conf
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        self.admin = usuario_con_rol('admin@x.co', 'ADMIN')
        self.autor = usuario_con_rol('autor@x.co', 'AUTOR')
        self.eval_a = usuario_con_rol('a@x.co', 'COMITE')
        self.eval_b = usuario_con_rol('b@x.co', 'COMITE')
        for usuario, nombre, inst in ((self.eval_a, 'Ana', 'Univalle'), (self.eval_b, 'Beto', 'UNAL')):
            usuario.first_name, usuario.last_name = nombre, 'Evaluador'
            usuario.save()
            PerfilUsuario.objects.create(usuario=usuario, institucion=inst)
        self.articulo = crear_articulo(conf, self.ia, self.autor, 'Modelos generativos')
        self.url = f'/api/articulos/{self.articulo.pk}/evaluadores/candidatos/'

    def correos(self, respuesta):
        return [e['correo'] for e in respuesta.json()['evaluadores']]

    def test_comite_ve_el_articulo_su_linea_y_los_candidatos(self):
        self.client.force_authenticate(self.comite)
        respuesta = self.client.get(self.url)
        self.assertEqual(respuesta.status_code, 200)
        datos = respuesta.json()
        self.assertEqual(datos['articulo']['titulo'], 'Modelos generativos')
        self.assertEqual(datos['articulo']['linea_tematica'], 'Inteligencia artificial')
        self.assertEqual(datos['evaluadores_requeridos'], 3)

    def test_solo_aparecen_miembros_del_comite(self):
        self.client.force_authenticate(self.comite)
        correos = self.correos(self.client.get(self.url))
        self.assertIn('a@x.co', correos)
        self.assertIn('b@x.co', correos)
        self.assertNotIn('admin@x.co', correos)
        self.assertNotIn('autor@x.co', correos)

    def test_cada_candidato_trae_nombre_institucion_y_carga(self):
        self.client.force_authenticate(self.comite)
        ana = next(e for e in self.client.get(self.url).json()['evaluadores'] if e['correo'] == 'a@x.co')
        self.assertEqual(ana['nombre'], 'Ana Evaluador')
        self.assertEqual(ana['institucion'], 'Univalle')
        self.assertEqual(ana['articulos_asignados'], 0)

    def test_la_carga_cuenta_los_articulos_ya_asignados(self):
        otro = crear_articulo(self.conf, self.ia, self.autor, 'Otro')
        asociar_evaluadores(otro, [self.eval_a], self.comite)
        self.client.force_authenticate(self.comite)
        ana = next(e for e in self.client.get(self.url).json()['evaluadores'] if e['correo'] == 'a@x.co')
        self.assertEqual(ana['articulos_asignados'], 1)

    def test_un_miembro_del_comite_que_es_autor_del_articulo_no_aparece(self):
        AutorArticulo.objects.create(
            id_articulo=self.articulo, id_usuario=self.eval_a, nombres='Ana', apellidos='Coautora',
            email='a@x.co', institucion='UV', orden_autoria=2,
        )
        self.client.force_authenticate(self.comite)
        correos = self.correos(self.client.get(self.url))
        self.assertNotIn('a@x.co', correos)
        self.assertIn('b@x.co', correos)

    def test_un_autor_sin_cuenta_se_excluye_por_correo(self):
        AutorArticulo.objects.create(
            id_articulo=self.articulo, id_usuario=None, nombres='Beto', apellidos='Externo',
            email='B@X.co', institucion='UV', orden_autoria=2,
        )
        self.client.force_authenticate(self.comite)
        self.assertNotIn('b@x.co', self.correos(self.client.get(self.url)))

    def test_quien_registro_el_articulo_no_aparece(self):
        propio = crear_articulo(self.conf, self.ia, self.eval_a, 'Del comité')
        self.client.force_authenticate(self.comite)
        respuesta = self.client.get(f'/api/articulos/{propio.pk}/evaluadores/candidatos/')
        self.assertNotIn('a@x.co', self.correos(respuesta))

    def test_las_cuentas_deshabilitadas_no_aparecen(self):
        self.eval_b.is_active = False
        self.eval_b.save()
        self.client.force_authenticate(self.comite)
        self.assertNotIn('b@x.co', self.correos(self.client.get(self.url)))

    def test_cuenta_con_varios_roles_aparece_una_sola_vez(self):
        from usuarios.roles import asignar_roles
        asignar_roles(self.eval_a, ['COMITE', 'AUTOR'])
        self.client.force_authenticate(self.comite)
        self.assertEqual(self.correos(self.client.get(self.url)).count('a@x.co'), 1)

    def test_articulo_inexistente_o_deshabilitado_da_404(self):
        oculto = crear_articulo(self.conf, self.ia, self.autor, 'Oculto', habilitado=False)
        self.client.force_authenticate(self.comite)
        self.assertEqual(self.client.get('/api/articulos/99999/evaluadores/candidatos/').status_code, 404)
        self.assertEqual(
            self.client.get(f'/api/articulos/{oculto.pk}/evaluadores/candidatos/').status_code, 404
        )

    def test_el_autor_no_puede_ver_los_candidatos(self):
        self.client.force_authenticate(self.autor)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_sin_sesion_no_hay_acceso(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url).status_code, 401)
