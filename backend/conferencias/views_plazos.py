from django.shortcuts import get_object_or_404
from rest_framework import generics
from django.db.models import Case, IntegerField, Value, When

from .models import Conferencia, Plazo
from .permissions import EsAdminOComiteOLecturaAutenticada
from .serializers_plazos import PlazoSerializer


class PlazosDeConferenciaMixin:
    """Trabaja solo con los plazos de la conferencia indicada en la URL."""

    serializer_class = PlazoSerializer
    permission_classes = [EsAdminOComiteOLecturaAutenticada]

    def get_conferencia(self):
        return get_object_or_404(Conferencia, pk=self.kwargs['id_conferencia'])

    def get_queryset(self):
        # Se listan en el orden cronológico de las etapas.
        orden = Case(
            *[When(tipo_plazo=tipo, then=Value(i)) for i, (tipo, _) in enumerate(Plazo.TIPOS)],
            output_field=IntegerField(),
        )
        return Plazo.objects.filter(id_conferencia=self.kwargs['id_conferencia']).order_by(orden)

    def get_serializer_context(self):
        contexto = super().get_serializer_context()
        contexto['conferencia'] = self.get_conferencia()
        return contexto


class PlazoListCreateView(PlazosDeConferenciaMixin, generics.ListCreateAPIView):
    """GET lista los plazos de la conferencia. POST configura uno nuevo (ADMIN o COMITE)."""

    def perform_create(self, serializer):
        serializer.save(id_conferencia=self.get_conferencia())


class PlazoDetailView(PlazosDeConferenciaMixin, generics.RetrieveUpdateAPIView):
    """GET consulta un plazo. PATCH modifica sus fechas o descripción (ADMIN o COMITE)."""

    lookup_field = 'id_plazo'
