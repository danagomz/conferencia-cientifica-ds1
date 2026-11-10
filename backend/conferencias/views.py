from rest_framework import generics

from .models import Conferencia
from .permissions import EsAdminOComiteOLecturaAutenticada
from .serializers import ConferenciaSerializer


class ConferenciaListCreateView(generics.ListCreateAPIView):
    """
    Cualquier usuario con sesión consulta las conferencias; solo ADMIN o COMITE registran.
    """

    queryset = Conferencia.objects.all()
    serializer_class = ConferenciaSerializer
    permission_classes = [EsAdminOComiteOLecturaAutenticada]


class ConferenciaDetailView(generics.RetrieveUpdateAPIView):
    """
    Cualquier usuario con sesión consulta una conferencia; solo ADMIN o COMITE la actualizan.
    """

    queryset = Conferencia.objects.all()
    serializer_class = ConferenciaSerializer
    permission_classes = [EsAdminOComiteOLecturaAutenticada]
    lookup_field = 'id_conferencia'