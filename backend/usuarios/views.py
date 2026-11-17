from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import EsAdminOComite
from .queries import consultar_usuarios
from .serializers import UsuarioCrearSerializer, UsuarioConsultaSerializer


class UsuarioCrearView(APIView):
    """GET consulta usuarios y POST crea usuarios."""


    permission_classes = [EsAdminOComite]

    def post(self, request):
        serializer = UsuarioCrearSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        return Response(UsuarioCrearSerializer(usuario).data, status=status.HTTP_201_CREATED)

    def get(self, request):
        usuarios = consultar_usuarios()
        serializer = UsuarioConsultaSerializer(usuarios, many=True)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
