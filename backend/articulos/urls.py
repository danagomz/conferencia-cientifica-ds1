from django.urls import path

from .views import ArticuloContextoView, ArticuloCrearView

urlpatterns = [
    path('articulos/contexto/', ArticuloContextoView.as_view(), name='articulo-contexto'),
    path('articulos/', ArticuloCrearView.as_view(), name='articulo-crear'),
]
