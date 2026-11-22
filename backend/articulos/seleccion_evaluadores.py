"""SDGC-195 (HU-015): selección manual de tres evaluadores considerando la línea temática.

El comité elige a mano a los evaluadores. Esta pieza le entrega, para un artículo, la lista de
miembros del comité que pueden ser evaluadores, junto con la línea temática del artículo y los
datos que ayudan a decidir la correspondencia (institución y cuántos artículos tiene ya
asignados cada miembro).

Quedan fuera de la lista quienes no pueden ser evaluadores de ese artículo: quien lo registró y
quienes figuran como sus autores (por cuenta o por correo), y las cuentas deshabilitadas.
Las validaciones al confirmar la asignación están en SDGC-197 y SDGC-205.
"""
from django.contrib.auth.models import User
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.permissions import EsAdminOComite
from usuarios.roles import COMITE

from .permisos_detalle import MENSAJE_NO_DISPONIBLE
from .queries import consultar_articulos

EVALUADORES_REQUERIDOS = 3


def usuarios_autores_del_articulo(articulo):
    """Ids de cuenta y correos asociados al artículo: quien lo registró y sus autores."""
    ids = {articulo.id_usuario_registra_id}
    correos = set()
    for autor in articulo.autores.all():
        if autor.id_usuario_id:
            ids.add(autor.id_usuario_id)
        if autor.email:
            correos.add(autor.email.strip().lower())
    return ids, correos


def candidatos_a_evaluador(articulo):
    """Miembros del comité habilitados que pueden evaluar el artículo, por nombre."""
    ids, correos = usuarios_autores_del_articulo(articulo)

    candidatos = (
        User.objects
        .filter(is_active=True, roles_asignados__rol__nombre_rol=COMITE)
        .exclude(pk__in=ids)
        .select_related('perfil')
        .annotate(
            articulos_asignados=Count(
                'asignaciones_como_evaluador',
                filter=Q(asignaciones_como_evaluador__id_articulo__habilitado=True),
                distinct=True,
            )
        )
        .distinct()
        .order_by('first_name', 'last_name', 'email')
    )
    return [c for c in candidatos if (c.email or '').strip().lower() not in correos]


def _institucion(usuario):
    perfil = getattr(usuario, 'perfil', None)
    return perfil.institucion if perfil else ''


class CandidatosEvaluadoresView(APIView):
    """GET /api/articulos/<id>/evaluadores/candidatos/ — evaluadores que se pueden elegir."""

    permission_classes = [EsAdminOComite]

    def get(self, request, pk):
        articulo = consultar_articulos().filter(pk=pk).first()
        if articulo is None:
            raise NotFound(MENSAJE_NO_DISPONIBLE)

        return Response(
            {
                'articulo': {
                    'id': articulo.pk,
                    'titulo': articulo.titulo,
                    'linea_tematica': articulo.id_linea.nombre,
                },
                'evaluadores_requeridos': EVALUADORES_REQUERIDOS,
                'evaluadores': [
                    {
                        'id': usuario.pk,
                        'nombre': f'{usuario.first_name} {usuario.last_name}'.strip(),
                        'correo': usuario.email,
                        'institucion': _institucion(usuario),
                        'articulos_asignados': usuario.articulos_asignados,
                    }
                    for usuario in candidatos_a_evaluador(articulo)
                ],
            },
            status=status.HTTP_200_OK,
        )
