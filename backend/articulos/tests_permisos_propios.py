from types import SimpleNamespace

from django.contrib.auth.models import AnonymousUser
from django.test import TestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .models import AutorArticulo
from .permisos_propios import EsAutorDelArticulo, PuedeConsultarArticulosPropios, articulos_propios
from .tests_consulta import crear_articulo


def peticion(usuario):
    return SimpleNamespace(user=usuario)


class ArticulosPropiosTests(TestCase):
    """CA-233, CA-237, CA-238: cada autor solo accede a lo suyo."""

    def setUp(self):
        self.conf = crear_conferencia()
        self.linea = LineaTematica.objects.create(id_conferencia=self.conf, nombre='IA')
        self.autor1 = usuario_con_rol('autor1@x.co', 'AUTOR')
        self.autor2 = usuario_con_rol('autor2@x.co', 'AUTOR')
        self.sin_articulos = usuario_con_rol('autor3@x.co', 'AUTOR')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        self.admin = usuario_con_rol('admin@x.co', 'ADMIN')
        self.a1 = crear_articulo(self.conf, self.linea, self.autor1, 'Uno')
        self.a1b = crear_articulo(self.conf, self.linea, self.autor1, 'Uno B')
        self.a2 = crear_articulo(self.conf, self.linea, self.autor2, 'Dos')

    def ids(self, usuario):
        return {a.id_articulo for a in articulos_propios(usuario)}

    def test_autor_con_varios_articulos_los_ve_todos(self):
        self.assertEqual(self.ids(self.autor1), {self.a1.id_articulo, self.a1b.id_articulo})

    def test_autor_no_ve_los_ajenos(self):
        self.assertEqual(self.ids(self.autor2), {self.a2.id_articulo})

    def test_autor_sin_articulos_recibe_lista_vacia(self):
        self.assertEqual(self.ids(self.sin_articulos), set())

    def test_coautor_ve_el_articulo_donde_figura(self):
        AutorArticulo.objects.create(
            id_articulo=self.a2, id_usuario=self.autor1, nombres='Ana', apellidos='Uno',
            email='autor1@x.co', institucion='UV', orden_autoria=2, es_responsable=False,
        )
        self.assertIn(self.a2.id_articulo, self.ids(self.autor1))

    def test_no_se_repite_un_articulo_si_es_registrante_y_coautor(self):
        lista = list(articulos_propios(self.autor1))
        self.assertEqual(len(lista), len({a.id_articulo for a in lista}))

    def test_admin_y_comite_sin_articulos_propios_no_ven_los_de_otros(self):
        self.assertEqual(self.ids(self.admin), set())
        self.assertEqual(self.ids(self.comite), set())

    def test_permiso_solo_para_autores_autenticados(self):
        permiso = PuedeConsultarArticulosPropios()
        self.assertTrue(permiso.has_permission(peticion(self.autor1), None))
        self.assertFalse(permiso.has_permission(peticion(self.comite), None))
        self.assertFalse(permiso.has_permission(peticion(self.admin), None))
        self.assertFalse(permiso.has_permission(peticion(AnonymousUser()), None))

    def test_permiso_de_objeto_impide_el_detalle_ajeno(self):
        permiso = EsAutorDelArticulo()
        self.assertTrue(permiso.has_object_permission(peticion(self.autor1), None, self.a1))
        self.assertFalse(permiso.has_object_permission(peticion(self.autor1), None, self.a2))
        self.assertFalse(permiso.has_object_permission(peticion(self.autor2), None, self.a1))
