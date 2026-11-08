from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import EsAdminOComite
from .serializers import UsuarioCrearSerializer


class UsuarioCrearView(APIView):
    """POST /api/usuarios/ — crea un usuario (solo ADMIN o COMITE)."""

    permission_classes = [EsAdminOComite]

    def post(self, request):
        serializer = UsuarioCrearSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        return Response(UsuarioCrearSerializer(usuario).data, status=status.HTTP_201_CREATED)
