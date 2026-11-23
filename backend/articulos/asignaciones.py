"""SDGC-201 (HU-015): asociar evaluadores con el artículo correspondiente.

Esta pieza solo guarda y consulta las asociaciones artículo-evaluador. Las reglas de la
asignación (exactamente tres, miembros del comité, no autores del artículo, línea temática)
se validan en SDGC-197 y SDGC-205, antes de llamar a `asociar_evaluadores`.
"""
from django.db import transaction

from .models import AsignacionEvaluador


def asociar_evaluadores(articulo, evaluadores, usuario_asigna):
    """Guarda la asignación del artículo, reemplazando la anterior, y devuelve las asociaciones.

    Es atómica: si algo falla no queda una asignación a medias.
    """
    with transaction.atomic():
        AsignacionEvaluador.objects.filter(id_articulo=articulo).delete()
        return [
            AsignacionEvaluador.objects.create(
                id_articulo=articulo,
                id_evaluador=evaluador,
                id_usuario_asigna=usuario_asigna,
            )
            for evaluador in evaluadores
        ]


def evaluadores_del_articulo(articulo):
    """Usuarios asignados como evaluadores del artículo (CA-104)."""
    return [
        a.id_evaluador
        for a in AsignacionEvaluador.objects.filter(id_articulo=articulo)
        .select_related('id_evaluador')
        .order_by('id_asignacion')
    ]


def asignaciones_del_articulo(articulo):
    """Asignaciones del artículo, en el orden en que se registraron, con el evaluador cargado."""
    return list(
        AsignacionEvaluador.objects.filter(id_articulo=articulo)
        .select_related('id_evaluador')
        .order_by('id_asignacion')
    )
