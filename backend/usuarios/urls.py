from django.urls import path

from .views import UsuarioCrearView

urlpatterns = [
    path('usuarios/', UsuarioCrearView.as_view(), name='usuario-crear'),
]
