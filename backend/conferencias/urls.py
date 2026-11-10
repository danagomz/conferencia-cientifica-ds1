from django.urls import path

from .views import ConferenciaListCreateView, ConferenciaDetailView
from .views_lineas import LineaTematicaDetailView, LineaTematicaListCreateView
from .views_plazos import PlazoDetailView, PlazoListCreateView

urlpatterns = [
    path(
        'conferencias/',
        ConferenciaListCreateView.as_view(),
        name='conferencia-list-create'
    ),
    path(
        'conferencias/<int:id_conferencia>/',
        ConferenciaDetailView.as_view(),
        name='conferencia-detail'
    ),
    path(
        'conferencias/<int:id_conferencia>/lineas-tematicas/',
        LineaTematicaListCreateView.as_view(),
        name='linea-tematica-list-create'
    ),
    path(
        'conferencias/<int:id_conferencia>/lineas-tematicas/<int:id_linea>/',
        LineaTematicaDetailView.as_view(),
        name='linea-tematica-detail'
    ),
    path(
        'conferencias/<int:id_conferencia>/plazos/',
        PlazoListCreateView.as_view(),
        name='plazo-list-create'
    ),
    path(
        'conferencias/<int:id_conferencia>/plazos/<int:id_plazo>/',
        PlazoDetailView.as_view(),
        name='plazo-detail'
    ),
]