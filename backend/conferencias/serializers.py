from rest_framework import serializers

from .models import Conferencia


class ConferenciaSerializer(serializers.ModelSerializer):
    """Serializador para registrar, consultar y actualizar conferencias."""

    class Meta:
        model = Conferencia
        fields = [
            'id_conferencia',
            'nombre',
            'edicion',
            'descripcion',
            'fecha_inicio',
            'fecha_fin',
            'estado',
            'zona_horaria',
            'agenda_publicada',
            'fecha_publicacion_agenda',
        ]
        read_only_fields = ['id_conferencia']