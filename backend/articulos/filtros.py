from django.db.models import Q
from rest_framework import serializers


def _entero(valor, nombre):
    try:
        return int(valor)
    except (TypeError, ValueError):
        raise serializers.ValidationError({nombre: 'Debe ser un número entero.'})


def aplicar_filtros(queryset, params):
    """Filtra el listado de artículos (HU-009, SDGC-141).

    Filtros disponibles (se pueden combinar):
      - id_conferencia: artículos de esa conferencia.
      - id_linea: artículos de esa línea temática.
      - estado: estado del artículo (REGISTRADO, EN_REVISION, ACEPTADO, RECHAZADO...).
      - q: texto que debe aparecer en el título o en las palabras clave.
    """
    id_conferencia = params.get('id_conferencia')
    if id_conferencia not in (None, ''):
        queryset = queryset.filter(id_conferencia=_entero(id_conferencia, 'id_conferencia'))

    id_linea = params.get('id_linea')
    if id_linea not in (None, ''):
        queryset = queryset.filter(id_linea=_entero(id_linea, 'id_linea'))

    estado = (params.get('estado') or '').strip()
    if estado:
        queryset = queryset.filter(estado_articulo__iexact=estado)

    texto = (params.get('q') or '').strip()
    if texto:
        queryset = queryset.filter(
            Q(titulo__icontains=texto) | Q(palabras_clave__icontains=texto)
        )
    return queryset
