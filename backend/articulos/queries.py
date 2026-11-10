
from django.db.models import Prefetch

from .models import Articulo, AutorArticulo


def consultar_articulos():
    """
    Consulta los artículos habilitados y recupera su información relacionada.
    Los autores se organizan según su orden de autoría.
    """
    autores_ordenados = AutorArticulo.objects.order_by('orden_autoria')

    return (
        Articulo.objects
        .filter(habilitado=True)
        .select_related(
            'id_conferencia',
            'id_linea',
            'id_usuario_registra'
        )
        .prefetch_related(
            Prefetch(
                'autores',
                queryset=autores_ordenados
            ),
            'versiones'
        )
        .order_by('-fecha_postulacion')
    )
