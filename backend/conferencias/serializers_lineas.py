from rest_framework import serializers

from .models import LineaTematica


class LineaTematicaSerializer(serializers.ModelSerializer):
    """Crea, consulta y actualiza las líneas temáticas de una conferencia."""

    class Meta:
        model = LineaTematica
        fields = ['id_linea', 'id_conferencia', 'nombre', 'descripcion', 'habilitada']
        # La conferencia sale de la URL, no del cuerpo de la petición.
        read_only_fields = ['id_linea', 'id_conferencia']

    def validate_nombre(self, valor):
        nombre = valor.strip()
        if not nombre:
            raise serializers.ValidationError('El nombre de la línea temática es obligatorio.')
        conferencia = self.context['conferencia']
        repetidas = LineaTematica.objects.filter(id_conferencia=conferencia, nombre__iexact=nombre)
        if self.instance is not None:
            repetidas = repetidas.exclude(pk=self.instance.pk)
        if repetidas.exists():
            raise serializers.ValidationError('Ya existe una línea temática con este nombre en la conferencia.')
        return nombre
