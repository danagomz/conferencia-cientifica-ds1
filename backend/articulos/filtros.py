from django.db.models import Q
from rest_framework import serializers

from conferencias.models import LineaTematica

# Estados que puede tener un artículo y que se pueden usar como filtro (HU-010).
ESTADOS_ARTICULO = ('REGISTRADO', 'EN_REVISION', 'ACEPTADO', 'RECHAZADO')


def _entero(valor, nombre):
    try:
        return int(valor)
    except (TypeError, ValueError):
        raise serializers.ValidationError({nombre: 'Debe ser un número entero.'})


def aplicar_filtros(queryset, params):
    """Filtra el listado de artículos (HU-009, SDGC-141).

    Los filtros se aplican sobre el queryset que ya viene limitado a los artículos
    habilitados y a los que el usuario puede consultar, así que nunca amplían permisos.
    Filtros disponibles (se pueden combinar; sin filtros se devuelve el listado general):
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
        id_linea = _entero(id_linea, 'id_linea')
        if not LineaTematica.objects.filter(pk=id_linea).exists():
            raise serializers.ValidationError({'id_linea': 'La línea temática indicada no existe.'})
        queryset = queryset.filter(id_linea=id_linea)

    estado = (params.get('estado') or '').strip().upper()
    if estado:
        if estado not in ESTADOS_ARTICULO:
            raise serializers.ValidationError({
                'estado': f'Estado no válido. Opciones: {", ".join(ESTADOS_ARTICULO)}.'
            })
        queryset = queryset.filter(estado_articulo=estado)

    texto = (params.get('q') or '').strip()
    if texto:
        queryset = queryset.filter(
            Q(titulo__icontains=texto) | Q(palabras_clave__icontains=texto)
        )
    return queryset
