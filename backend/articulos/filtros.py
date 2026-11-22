from django.db.models import Count, Q
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


def criterios_de_filtrado():
    """Criterios de filtrado aprobados para el listado de artículos (HU-010, SDGC-160).

    Los dos criterios aprobados son la línea temática y el estado. El filtro por
    conferencia y la búsqueda por texto se ofrecen además, como complemento.
    """
    lineas = (
        LineaTematica.objects.filter(habilitada=True)
        .select_related('id_conferencia')
        .order_by('id_conferencia__nombre', 'nombre')
    )
    return {
        'criterios': [
            {
                'parametro': 'id_linea',
                'etiqueta': 'Línea temática',
                'opciones': [
                    {
                        'valor': linea.id_linea,
                        'etiqueta': linea.nombre,
                        'id_conferencia': linea.id_conferencia_id,
                    }
                    for linea in lineas
                ],
            },
            {
                'parametro': 'estado',
                'etiqueta': 'Estado',
                'opciones': [
                    {'valor': estado, 'etiqueta': estado.replace('_', ' ').capitalize()}
                    for estado in ESTADOS_ARTICULO
                ],
            },
        ],
        'adicionales': [
            {'parametro': 'id_conferencia', 'etiqueta': 'Conferencia'},
            {'parametro': 'q', 'etiqueta': 'Buscar por título o palabras clave'},
        ],
    }


VALORES_VERDADEROS = ('true', '1', 'si', 'sí')
VALORES_FALSOS = ('false', '0', 'no')


def anotar_evaluadores_asignados(queryset):
    """Agrega `evaluadores_asignados` (cantidad de evaluadores de cada artículo)."""
    return queryset.annotate(
        evaluadores_asignados=Count('asignaciones_evaluador', distinct=True)
    )


def aplicar_filtro_sin_evaluadores(queryset, params):
    """HU-015, CA-099: `?sin_evaluadores=true` deja solo los artículos sin evaluadores.

    Solo se llama para administrador y comité, y el queryset ya trae `evaluadores_asignados`.
    `false` (o no enviarlo) no filtra.
    """
    valor = (params.get('sin_evaluadores') or '').strip().lower()
    if not valor or valor in VALORES_FALSOS:
        return queryset
    if valor not in VALORES_VERDADEROS:
        raise serializers.ValidationError({'sin_evaluadores': 'Debe ser true o false.'})
    return queryset.filter(evaluadores_asignados=0)
