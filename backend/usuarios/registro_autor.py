from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegistroAutorSerializer


class RegistroAutorView(APIView):
    """SDGC-136: POST /api/auth/registro-autor/ — una persona sin cuenta se registra como autor."""

    # Es público: no exige sesión (y no falla si llega un token vencido).
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistroAutorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        return Response(RegistroAutorSerializer(usuario).data, status=status.HTTP_201_CREATED)
