from rest_framework import generics

from usuarios.permissions import EsAdminOComite

from .models import Conferencia
from .serializers import ConferenciaSerializer


class ConferenciaListCreateView(generics.ListCreateAPIView):
    """
    Permite consultar todas las conferencias y registrar una nueva.
    """

    queryset = Conferencia.objects.all()
    serializer_class = ConferenciaSerializer
    permission_classes = [EsAdminOComite]


class ConferenciaDetailView(generics.RetrieveUpdateAPIView):
    """
    Permite consultar y actualizar una conferencia específica.
    """

    queryset = Conferencia.objects.all()
    serializer_class = ConferenciaSerializer
    permission_classes = [EsAdminOComite]
    lookup_field = 'id_conferencia'