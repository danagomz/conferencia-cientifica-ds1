from django.urls import path

from .registro_autor import RegistroAutorView
from .views import UsuarioCrearView

urlpatterns = [
    path('usuarios/', UsuarioCrearView.as_view(), name='usuario-crear'),
    path('auth/registro-autor/', RegistroAutorView.as_view(), name='registro-autor'),
]
