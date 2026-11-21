from django.urls import path

from .views import (
    ArticuloContextoView,
    ArticuloCrearView,
    ArticuloDetalleView,
    ArticuloFiltrosView,
    ArticuloVersionCrearView,
    ArticulosPropiosView,
)

urlpatterns = [
    path('articulos/contexto/', ArticuloContextoView.as_view(), name='articulo-contexto'),
    path('articulos/filtros/', ArticuloFiltrosView.as_view(), name='articulo-filtros'),
    path('articulos/propios/', ArticulosPropiosView.as_view(), name='articulos-propios'),
    path('articulos/<int:pk>/', ArticuloDetalleView.as_view(), name='articulo-detalle'),
    path('articulos/', ArticuloCrearView.as_view(), name='articulo-crear'),
    path(
        'articulos/<int:pk>/versiones/',
        ArticuloVersionCrearView.as_view(),
        name='articulo-version-crear',
    ),
]
