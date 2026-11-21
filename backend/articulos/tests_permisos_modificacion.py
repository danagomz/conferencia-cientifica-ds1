from types import SimpleNamespace

from django.contrib.auth.models import AnonymousUser, User
from django.test import TestCase

from conferencias.models import LineaTematica
from conferencias.tests_lineas import crear_conferencia, usuario_con_rol

from usuarios.roles import asignar_roles

from .models import AutorArticulo
from .permisos_modificacion import PuedeModificarArticulo, puede_modificar_articulo
from .tests_consulta import crear_articulo


class PermisosModificacionTests(TestCase):
    """SDGC-178: quién puede modificar los datos generales de un artículo."""

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

    def _agregar_autor(self, articulo, usuario, responsable=False):
        AutorArticulo.objects.create(
            id_articulo=articulo, id_usuario=usuario, nombres='Ana', apellidos='Coautora',
            email=usuario.email, institucion='UV', orden_autoria=9, es_responsable=responsable,
        )

    def test_autor_modifica_su_propio_articulo(self):
        self.assertTrue(puede_modificar_articulo(self.autor1, self.art1))

    def test_autor_no_modifica_un_articulo_ajeno(self):
        self.assertFalse(puede_modificar_articulo(self.autor1, self.art2))

    def test_autor_asociado_no_responsable_si_puede_modificar(self):
        self._agregar_autor(self.art2, self.autor1, responsable=False)
        self.assertTrue(puede_modificar_articulo(self.autor1, self.art2))

    def test_autor_responsable_tambien_puede_modificar(self):
        AutorArticulo.objects.filter(id_articulo=self.art2).update(es_responsable=False)
        self._agregar_autor(self.art2, self.autor1, responsable=True)
        self.assertTrue(puede_modificar_articulo(self.autor1, self.art2))

    def test_admin_y_comite_no_modifican(self):
        for usuario in (self.admin, self.comite):
            self.assertFalse(puede_modificar_articulo(usuario, self.art1))

    def test_admin_que_tambien_es_autor_asociado_si_modifica(self):
        multirol = usuario_con_rol('m@x.co', 'ADMIN')
        asignar_roles(multirol, ['ADMIN', 'AUTOR'])
        self._agregar_autor(self.art1, multirol)
        self.assertTrue(puede_modificar_articulo(multirol, self.art1))

    def test_nadie_modifica_un_articulo_deshabilitado(self):
        self.assertFalse(puede_modificar_articulo(self.autor1, self.oculto))

    def test_permiso_de_vista_exige_sesion_y_rol_autor(self):
        permiso = PuedeModificarArticulo()
        peticion = lambda u: SimpleNamespace(user=u)
        self.assertTrue(permiso.has_permission(peticion(self.autor1), None))
        for usuario in (self.admin, self.comite, self.sin_rol, AnonymousUser()):
            self.assertFalse(permiso.has_permission(peticion(usuario), None))

    def test_permiso_de_objeto_y_mensaje(self):
        permiso = PuedeModificarArticulo()
        peticion = SimpleNamespace(user=self.autor1)
        self.assertTrue(permiso.has_object_permission(peticion, None, self.art1))
        self.assertFalse(permiso.has_object_permission(peticion, None, self.art2))
        self.assertEqual(permiso.message, 'Este artículo no está asociado a tu cuenta.')
