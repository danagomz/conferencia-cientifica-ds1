
from datetime import date

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from usuarios.models import Rol, UsuarioRol

from .models import Conferencia, LineaTematica


def usuario_con_rol(correo, rol):
    usuario = User.objects.create_user(correo, correo, 'Clave#12345')
    rol_obj, _ = Rol.objects.get_or_create(
        nombre_rol=rol,
        defaults={'descripcion': rol}
    )
    UsuarioRol.objects.create(usuario=usuario, rol=rol_obj)
    return usuario


def crear_conferencia(nombre='Congreso A', edicion='2026'):
    return Conferencia.objects.create(
        nombre=nombre,
        edicion=edicion,
        descripcion='x',
        fecha_inicio=date(2027, 3, 1),
        fecha_fin=date(2027, 3, 5),
        zona_horaria='America/Bogota',
    )


class LineasTematicasTests(APITestCase):

    def setUp(self):
        self.conf = crear_conferencia()
        self.otra = crear_conferencia('Congreso B', '2026')
        self.admin = usuario_con_rol('admin@x.co', 'ADMIN')
        self.comite = usuario_con_rol('comite@x.co', 'COMITE')
        self.autor = usuario_con_rol('autor@x.co', 'AUTOR')
        self.url = (
            f'/api/conferencias/{self.conf.id_conferencia}/lineas-tematicas/'
        )

    # ---- creación y gestión ----

    def test_admin_crea_linea_tematica(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(
            self.url,
            {'nombre': 'Inteligencia artificial', 'descripcion': 'IA y datos'},
            format='json'
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['id_conferencia'], self.conf.id_conferencia)
        self.assertTrue(r.data['habilitada'])

    def test_comite_tambien_puede_crear(self):
        self.client.force_authenticate(self.comite)
        r = self.client.post(
            self.url,
            {'nombre': 'Redes'},
            format='json'
        )
        self.assertEqual(r.status_code, 201)

    def test_nombre_obligatorio(self):
        self.client.force_authenticate(self.admin)
        for cuerpo in ({}, {'nombre': '   '}):
            r = self.client.post(self.url, cuerpo, format='json')
            self.assertEqual(r.status_code, 400)
            self.assertIn('nombre', r.data)

    def test_nombre_repetido_en_la_misma_conferencia(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.url, {'nombre': 'Redes'}, format='json')
        r = self.client.post(
            self.url,
            {'nombre': 'REDES'},
            format='json'
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn('nombre', r.data)

    def test_mismo_nombre_en_otra_conferencia_si_se_permite(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.url, {'nombre': 'Redes'}, format='json')

        otra_url = (
            f'/api/conferencias/{self.otra.id_conferencia}/lineas-tematicas/'
        )
        r = self.client.post(
            otra_url,
            {'nombre': 'Redes'},
            format='json'
        )
        self.assertEqual(r.status_code, 201)

    def test_conferencia_inexistente(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(
            '/api/conferencias/9999/lineas-tematicas/',
            {'nombre': 'Redes'},
            format='json'
        )
        self.assertEqual(r.status_code, 404)

    def test_modificar_y_deshabilitar(self):
        self.client.force_authenticate(self.admin)
        linea = self.client.post(
            self.url,
            {'nombre': 'Redes'},
            format='json'
        ).data

        detalle = f"{self.url}{linea['id_linea']}/"
        r = self.client.patch(
            detalle,
            {
                'nombre': 'Redes y telecomunicaciones',
                'habilitada': False
            },
            format='json'
        )

        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['nombre'], 'Redes y telecomunicaciones')
        self.assertFalse(r.data['habilitada'])

    def test_no_se_puede_modificar_linea_de_otra_conferencia(self):
        self.client.force_authenticate(self.admin)

        linea = LineaTematica.objects.create(
            id_conferencia=self.otra,
            nombre='Bases de datos'
        )

        url_otra_conferencia = f'{self.url}{linea.id_linea}/'

        r = self.client.patch(
            url_otra_conferencia,
            {'nombre': 'Inteligencia artificial'},
            format='json'
        )

        self.assertEqual(r.status_code, 404)

        linea.refresh_from_db()
        self.assertEqual(linea.nombre, 'Bases de datos')

    def test_renombrar_a_su_propio_nombre_no_da_error(self):
        self.client.force_authenticate(self.admin)
        linea = self.client.post(
            self.url,
            {'nombre': 'Redes'},
            format='json'
        ).data

        r = self.client.patch(
            f"{self.url}{linea['id_linea']}/",
            {'nombre': 'Redes', 'descripcion': 'nueva'},
            format='json'
        )
        self.assertEqual(r.status_code, 200)

    # ---- consulta ----

    def test_listar_solo_las_de_esa_conferencia(self):
        LineaTematica.objects.create(
            id_conferencia=self.conf,
            nombre='Redes'
        )
        LineaTematica.objects.create(
            id_conferencia=self.otra,
            nombre='Bases de datos'
        )

        self.client.force_authenticate(self.autor)
        r = self.client.get(self.url)

        self.assertEqual(r.status_code, 200)
        nombres = [
            x['nombre']
            for x in (r.data['results'] if 'results' in r.data else r.data)
        ]
        self.assertEqual(nombres, ['Redes'])

    # ---- permisos ----

    def test_autor_puede_consultar_pero_no_crear(self):
        self.client.force_authenticate(self.autor)

        self.assertEqual(self.client.get(self.url).status_code, 200)
        self.assertEqual(
            self.client.post(
                self.url,
                {'nombre': 'Redes'},
                format='json'
            ).status_code,
            403
        )

    def test_sin_sesion_no_hay_acceso(self):
        self.assertIn(self.client.get(self.url).status_code, (401, 403))
        self.assertIn(
            self.client.post(
                self.url,
                {'nombre': 'Redes'},
                format='json'
            ).status_code,
            (401, 403)
        )
