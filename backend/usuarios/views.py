from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .filtros import aplicar_filtros, criterios_de_filtrado
from .permisos_consulta import PuedeConsultarUsuarios, usuarios_visibles
from .permissions import EsAdminOComite
from .serializers import UsuarioCrearSerializer, UsuarioConsultaSerializer


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


class UsuarioFiltrosView(APIView):
    """GET /api/usuarios/filtros/ — criterios de filtrado disponibles (SDGC-76)."""

    permission_classes = [PuedeConsultarUsuarios]

    def get(self, request):
        return Response(criterios_de_filtrado())
