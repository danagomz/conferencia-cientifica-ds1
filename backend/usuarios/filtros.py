"""HU-003 (Filtrar usuarios): SDGC-75 lógica de filtrado."""
from django.db.models import Q
from rest_framework import serializers

from .roles import ROLES_VALIDOS

def aplicar_filtros(queryset, params):
    """Filtra el listado de usuarios (SDGC-75).

    Se aplica sobre el queryset que ya viene limitado a los usuarios habilitados y a los que
    quien consulta puede ver (SDGC-125), así que nunca amplía permisos. Los criterios se pueden
    combinar (deben cumplirse todos); sin criterios se devuelve el listado general (CA-019).
      - nombre: texto que debe aparecer en el nombre o el apellido. Si trae varias palabras
        (por ejemplo "ana gomez"), cada una debe aparecer en alguno de los dos.
      - rol: tipo de usuario (ADMIN, COMITE o AUTOR).
    """
    for palabra in (params.get('nombre') or '').split():
        queryset = queryset.filter(
            Q(first_name__icontains=palabra) | Q(last_name__icontains=palabra)
        )

    rol = (params.get('rol') or '').strip().upper()
    if rol:
        if rol not in ROLES_VALIDOS:
            raise serializers.ValidationError({
                'rol': f'Rol no válido. Opciones: {", ".join(ROLES_VALIDOS)}.'
            })
        queryset = queryset.filter(roles_asignados__rol__nombre_rol=rol)
    return queryset
