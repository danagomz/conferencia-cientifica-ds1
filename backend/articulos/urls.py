from django.urls import path

from .views import (
    ArticuloContextoView,
    ArticuloCrearView,
    ArticuloFiltrosView,
    ArticulosPropiosView,
)

urlpatterns = [
    path('articulos/contexto/', ArticuloContextoView.as_view(), name='articulo-contexto'),
    path('articulos/filtros/', ArticuloFiltrosView.as_view(), name='articulo-filtros'),
    path('articulos/propios/', ArticulosPropiosView.as_view(), name='articulos-propios'),
    path('articulos/', ArticuloCrearView.as_view(), name='articulo-crear'),
]
