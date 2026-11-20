from types import SimpleNamespace

from django.contrib.auth.models import AnonymousUser
from django.test import TestCase

from django.contrib.auth.models import User

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from .models import AutorArticulo
from .permisos_detalle import PuedeConsultarDetalleArticulo, puede_ver_articulo
from .tests_consulta import crear_articulo


class PermisosDetalleTests(TestCase):
    """SDGC-154: quién puede consultar el detalle de un artículo."""

    def setUp(self):
        conf = crear_conferencia()
        linea = LineaTematica.objects.create(id_conferencia=conf, nombre='IA')
        self.autor1 = usuario_con_rol('a1@x.co', 'AUTOR')
        self.autor2 = usuario_con_rol('a2@x.co', 'AUTOR')
        self.comite = usuario_con_rol('c@x.co', 'COMITE')
        self.admin = usuario_con_rol('ad@x.co', 'ADMIN')
        self.sin_rol = User.objects.create_user('sr@x.co', 'sr@x.co', 'Clave#12345')
        self.art1 = crear_articulo(conf, linea, self.autor1, 'Uno')
        self.art2 = crear_articulo(conf, linea, self.autor2, 'Dos')
        self.oculto = crear_articulo(conf, linea, self.autor1, 'Oculto', habilitado=False)

    def test_comite_y_admin_ven_cualquier_articulo_habilitado(self):
        for usuario in (self.comite, self.admin):
            self.assertTrue(puede_ver_articulo(usuario, self.art1))
            self.assertTrue(puede_ver_articulo(usuario, self.art2))

    def test_autor_ve_los_suyos_y_no_los_ajenos(self):
        self.assertTrue(puede_ver_articulo(self.autor1, self.art1))
        self.assertFalse(puede_ver_articulo(self.autor1, self.art2))

    def test_coautor_ve_el_articulo_donde_figura(self):
        AutorArticulo.objects.create(
            id_articulo=self.art2, id_usuario=self.autor1, nombres='Ana', apellidos='Uno',
            email='a1@x.co', institucion='UV', orden_autoria=2, es_responsable=False,
        )
        self.assertTrue(puede_ver_articulo(self.autor1, self.art2))

    def test_nadie_ve_un_articulo_deshabilitado(self):
        for usuario in (self.comite, self.admin, self.autor1):
            self.assertFalse(puede_ver_articulo(usuario, self.oculto))

    def test_permiso_de_vista_exige_sesion_y_un_rol_valido(self):
        permiso = PuedeConsultarDetalleArticulo()
        peticion = lambda u: SimpleNamespace(user=u)
        self.assertTrue(permiso.has_permission(peticion(self.autor1), None))
        self.assertTrue(permiso.has_permission(peticion(self.comite), None))
        self.assertFalse(permiso.has_permission(peticion(self.sin_rol), None))
        self.assertFalse(permiso.has_permission(peticion(AnonymousUser()), None))

    def test_permiso_de_objeto(self):
        permiso = PuedeConsultarDetalleArticulo()
        peticion = SimpleNamespace(user=self.autor1)
        self.assertTrue(permiso.has_object_permission(peticion, None, self.art1))
        self.assertFalse(permiso.has_object_permission(peticion, None, self.art2))
