"""SDGC-205 (HU-015): restricciones para asignar evaluadores a un artículo.

Se validan antes de guardar la asignación (CA-102):
- La asignación solo se hace cuando terminó el periodo de postulaciones de la conferencia.
- Cada evaluador debe pertenecer al comité científico y tener la cuenta habilitada (CA-105).
- Nadie puede evaluar un artículo del que es autor: quien lo registró o figura como autor,
  por cuenta o por correo.

Si el plazo de postulación no está configurado para la conferencia no se bloquea la asignación.
Los errores salen como 400 con el campo `plazo` o `evaluadores`.
"""
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from conferencias.models import Plazo
from usuarios.roles import COMITE, nombres_de_roles

from .seleccion_evaluadores import usuarios_autores_del_articulo

MENSAJE_POSTULACION_ABIERTA = (
    'La asignación de evaluadores solo está disponible cuando termina el periodo de postulaciones.'
)


def _nombre(usuario):
    return f'{usuario.first_name} {usuario.last_name}'.strip() or usuario.email


def _lista(usuarios):
    return ', '.join(_nombre(u) for u in usuarios)


def postulacion_terminada(articulo, ahora=None):
    """True si ya pasó la fecha fin del plazo POSTULACION (o si no hay plazo configurado)."""
    plazo = Plazo.objects.filter(
        id_conferencia=articulo.id_conferencia, tipo_plazo=Plazo.POSTULACION
    ).first()
    if plazo is None:
        return True
    return (ahora or timezone.now()) > plazo.fecha_fin


def validar_restricciones_asignacion(articulo, evaluadores):
    """Lanza ValidationError si la asignación no cumple las condiciones requeridas."""
    if not postulacion_terminada(articulo):
        raise ValidationError({'plazo': [MENSAJE_POSTULACION_ABIERTA]})

    fuera_del_comite = [
        u for u in evaluadores if not u.is_active or COMITE not in nombres_de_roles(u)
    ]
    if fuera_del_comite:
        raise ValidationError({
            'evaluadores': [
                'Solo pueden ser evaluadores miembros habilitados del comité científico: '
                f'{_lista(fuera_del_comite)}.'
            ]
        })

    ids, correos = usuarios_autores_del_articulo(articulo)
    autores = [
        u for u in evaluadores
        if u.pk in ids or (u.email or '').strip().lower() in correos
    ]
    if autores:
        raise ValidationError({
            'evaluadores': [
                f'Un autor no puede ser evaluador de su propio artículo: {_lista(autores)}.'
            ]
        })
