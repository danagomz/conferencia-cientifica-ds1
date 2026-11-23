from rest_framework.test import APITestCase

from .roles import ADMIN, AUTOR, COMITE, asignar_roles
from .tests_filtros_usuarios import crear

CABECERA = 'HTTP_X_ROL_ACTIVO'


class PermisosEdicionUsuarioTests(APITestCase):
    """SDGC-86 (HU-004): quién puede editar los datos de qué usuario."""

    def setUp(self):
        self.admin = crear('admin@x.co', 'Ana', 'Admin', ADMIN)
        self.otro_admin = crear('admin2@x.co', 'Beto', 'Admin', ADMIN)
        self.comite = crear('comite@x.co', 'Carlos', 'Comite', COMITE)
        self.otro_comite = crear('comite2@x.co', 'Clara', 'Comite', COMITE)
        self.autor = crear('autor@x.co', 'Laura', 'Autor', AUTOR)
        self.otro_autor = crear('autor2@x.co', 'Mario', 'Autor', AUTOR)
        self.multirol = crear('multi@x.co', 'Mia', 'Multi', ADMIN, AUTOR)

    def editar(self, quien, objetivo, nombre='Nuevo', **extra):
        self.client.force_authenticate(quien)
        return self.client.patch(
            f'/api/usuarios/{objetivo.pk}/', {'first_name': nombre}, format='json', **extra
        )

    def nombre_de(self, usuario):
        usuario.refresh_from_db()
        return usuario.first_name

    def test_cada_usuario_edita_sus_propios_datos(self):
        for usuario in (self.admin, self.comite, self.autor):
            nombre = f'Propio {usuario.pk}'
            self.assertEqual(self.editar(usuario, usuario, nombre).status_code, 200)
            self.assertEqual(self.nombre_de(usuario), nombre)

    def test_admin_edita_a_cualquier_usuario(self):
        for objetivo in (self.otro_admin, self.comite, self.autor):
            self.assertEqual(self.editar(self.admin, objetivo, 'Editado').status_code, 200)
            self.assertEqual(self.nombre_de(objetivo), 'Editado')

    def test_comite_edita_autores_y_otros_miembros_del_comite(self):
        for objetivo in (self.autor, self.otro_comite):
            self.assertEqual(self.editar(self.comite, objetivo, 'Editado').status_code, 200)
            self.assertEqual(self.nombre_de(objetivo), 'Editado')

    def test_comite_no_edita_administradores(self):
        for objetivo in (self.admin, self.multirol):
            respuesta = self.editar(self.comite, objetivo, 'Hackeado')
            self.assertEqual(respuesta.status_code, 403)
            self.assertNotEqual(self.nombre_de(objetivo), 'Hackeado')

    def test_autor_no_edita_a_otro_usuario(self):
        for objetivo in (self.otro_autor, self.comite, self.admin):
            respuesta = self.editar(self.autor, objetivo, 'Hackeado')
            self.assertIn(respuesta.status_code, (403, 404))
            self.assertNotEqual(self.nombre_de(objetivo), 'Hackeado')

    def test_sin_sesion_no_se_edita(self):
        self.client.force_authenticate(None)
        respuesta = self.client.patch(
            f'/api/usuarios/{self.autor.pk}/', {'first_name': 'X'}, format='json'
        )
        self.assertEqual(respuesta.status_code, 401)
        self.assertEqual(self.nombre_de(self.autor), 'Laura')

    def test_rol_activo_que_la_cuenta_no_tiene_se_rechaza(self):
        respuesta = self.editar(self.autor, self.autor, 'X', **{CABECERA: ADMIN})
        self.assertEqual(respuesta.status_code, 403)
        self.assertEqual(self.nombre_de(self.autor), 'Laura')

    def test_cuenta_multirol_trabajando_como_autor_solo_edita_lo_propio(self):
        respuesta = self.editar(self.multirol, self.otro_autor, 'Hackeado', **{CABECERA: AUTOR})
        self.assertIn(respuesta.status_code, (403, 404))
        self.assertNotEqual(self.nombre_de(self.otro_autor), 'Hackeado')
        propio = self.editar(self.multirol, self.multirol, 'Mia Nueva', **{CABECERA: AUTOR})
        self.assertEqual(propio.status_code, 200)

    def test_cuenta_multirol_trabajando_como_admin_edita_a_otros(self):
        respuesta = self.editar(self.multirol, self.otro_autor, 'Editado', **{CABECERA: ADMIN})
        self.assertEqual(respuesta.status_code, 200)

    def test_nadie_cambia_su_propio_rol_con_el_formulario(self):
        # CA-028: ni siquiera el administrador cambia sus propios roles.
        for usuario in (self.admin, self.comite, self.autor):
            self.client.force_authenticate(usuario)
            respuesta = self.client.patch(
                f'/api/usuarios/{usuario.pk}/', {'roles': [ADMIN, COMITE, AUTOR]}, format='json'
            )
            self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(
            set(self.autor.roles_asignados.values_list('rol__nombre_rol', flat=True)), {AUTOR}
        )

    def test_comite_no_puede_dar_el_rol_de_administrador(self):
        self.client.force_authenticate(self.comite)
        respuesta = self.client.patch(
            f'/api/usuarios/{self.autor.pk}/', {'roles': [ADMIN]}, format='json'
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(
            set(self.autor.roles_asignados.values_list('rol__nombre_rol', flat=True)), {AUTOR}
        )

    def test_la_consulta_de_datos_sigue_con_su_permiso_de_consulta(self):
        self.client.force_authenticate(self.autor)
        self.assertEqual(self.client.get(f'/api/usuarios/{self.autor.pk}/').status_code, 200)
