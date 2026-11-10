from django.shortcuts import get_object_or_404
from rest_framework import generics

from .models import Conferencia, LineaTematica
from .permissions import EsAdminOComiteOLecturaAutenticada
from .serializers_lineas import LineaTematicaSerializer


class LineasDeConferenciaMixin:
    """Trabaja solo con las líneas de la conferencia indicada en la URL."""

    serializer_class = LineaTematicaSerializer
    permission_classes = [EsAdminOComiteOLecturaAutenticada]

    def get_conferencia(self):
        return get_object_or_404(Conferencia, pk=self.kwargs['id_conferencia'])

    def get_queryset(self):
        return LineaTematica.objects.filter(id_conferencia=self.kwargs['id_conferencia']).order_by('nombre')

    def get_serializer_context(self):
        contexto = super().get_serializer_context()
        contexto['conferencia'] = self.get_conferencia()
        return contexto


class LineaTematicaListCreateView(LineasDeConferenciaMixin, generics.ListCreateAPIView):
    """GET lista las líneas de la conferencia. POST crea una nueva (ADMIN o COMITE)."""

    def perform_create(self, serializer):
        serializer.save(id_conferencia=self.get_conferencia())


class LineaTematicaDetailView(LineasDeConferenciaMixin, generics.RetrieveUpdateAPIView):
    """GET consulta una línea. PATCH la modifica o la habilita/deshabilita (ADMIN o COMITE)."""

    lookup_field = 'id_linea'
