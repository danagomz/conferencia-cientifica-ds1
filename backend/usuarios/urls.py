
from django.urls import path

from .registro_autor import RegistroAutorView
from .views import (
    UsuarioCrearView,
    UsuarioDetalleView,
    UsuarioFiltrosView,
)


urlpatterns = [
    path(
        'usuarios/filtros/',
        UsuarioFiltrosView.as_view(),
        name='usuario-filtros',
    ),

    path(
        'usuarios/<int:pk>/',
        UsuarioDetalleView.as_view(),
        name='usuario-detalle',
    ),

    path(
        'usuarios/',
        UsuarioCrearView.as_view(),
        name='usuario-crear',
    ),

    path(
        'auth/registro-autor/',
        RegistroAutorView.as_view(),
        name='registro-autor',
    ),
]
