from django.urls import path

from .views import ArticuloCrearView

urlpatterns = [
    path('articulos/', ArticuloCrearView.as_view(), name='articulo-crear'),
]
