from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .filtros import aplicar_filtros, criterios_de_filtrado
from .permisos_consulta import PuedeConsultarUsuarios, usuarios_visibles
from .permisos_edicion import PuedeEditarUsuario
from .permissions import EsAdminOComite
from .serializers import (
    UsuarioCrearSerializer,
    UsuarioConsultaSerializer,
    UsuarioEditarSerializer,
)
from django.shortcuts import get_object_or_404


class UsuarioCrearView(APIView):
    """GET consulta usuarios (según el rol) y POST crea usuarios (ADMIN o COMITE)."""

    def get_permissions(self):
        # Consultar: cualquier usuario con sesión, pero solo ve lo que su rol permite (SDGC-125).
        # Crear: solo ADMIN o COMITE.
        if self.request.method == 'GET':
            return [PuedeConsultarUsuarios()]
        return [EsAdminOComite()]

    def post(self, request):
        serializer = UsuarioCrearSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        return Response(UsuarioCrearSerializer(usuario).data, status=status.HTTP_201_CREATED)

    def get(self, request):
        usuarios = aplicar_filtros(usuarios_visibles(request), request.query_params)
        serializer = UsuarioConsultaSerializer(usuarios, many=True)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


class UsuarioDetalleView(APIView):
    """
    GET /api/usuarios/<pk>/:
    Consulta un usuario individual.

    PATCH /api/usuarios/<pk>/:
    Actualiza un usuario según los permisos y el rol activo.
    """

    def get_permissions(self):
        # SDGC-86: la edición tiene su propio control de permisos.
        if self.request.method == 'PATCH':
            return [PuedeEditarUsuario()]
        return [PuedeConsultarUsuarios()]

    def obtener_usuario_visible(self, request, pk):
        """
        Busca únicamente usuarios permitidos por la lógica existente
        de usuarios_visibles().
        """
        return get_object_or_404(
            usuarios_visibles(request),
            pk=pk,
        )

    def get(self, request, pk):
        usuario = self.obtener_usuario_visible(request, pk)

        serializer = UsuarioConsultaSerializer(usuario)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk):
        usuario = self.obtener_usuario_visible(request, pk)
        self.check_object_permissions(request, usuario)

        serializer = UsuarioEditarSerializer(
            usuario,
            data=request.data,
            partial=True,
            context={'request': request},
        )

        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()

        # Actualiza las relaciones almacenadas en caché antes
        # de construir la respuesta.
        usuario.refresh_from_db()

        respuesta = UsuarioConsultaSerializer(usuario)

        return Response(
            respuesta.data,
            status=status.HTTP_200_OK,
        )


class UsuarioFiltrosView(APIView):
    """GET /api/usuarios/filtros/ — criterios de filtrado disponibles (SDGC-76)."""

    permission_classes = [PuedeConsultarUsuarios]

    def get(self, request):
        return Response(criterios_de_filtrado())
