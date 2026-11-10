from rest_framework import serializers

from .models import Plazo


class PlazoSerializer(serializers.ModelSerializer):
    """Crea, consulta y actualiza los plazos (fechas límite) de una conferencia."""

    class Meta:
        model = Plazo
        fields = ['id_plazo', 'id_conferencia', 'tipo_plazo', 'fecha_inicio', 'fecha_fin', 'descripcion']
        # La conferencia sale de la URL, no del cuerpo de la petición.
        read_only_fields = ['id_plazo', 'id_conferencia']

    def validate(self, datos):
        conferencia = self.context['conferencia']
        actual = self.instance
        tipo = datos.get('tipo_plazo', actual.tipo_plazo if actual else None)
        errores = {}

        # La etapa de un plazo no se cambia una vez creado.
        if actual is not None and tipo != actual.tipo_plazo:
            errores['tipo_plazo'] = 'No se puede cambiar la etapa de un plazo ya creado.'

        otros = Plazo.objects.filter(id_conferencia=conferencia)
        if actual is not None:
            otros = otros.exclude(pk=actual.pk)

        # Cada etapa se configura una sola vez por conferencia.
        if actual is None and tipo and otros.filter(tipo_plazo=tipo).exists():
            errores['tipo_plazo'] = 'Esta conferencia ya tiene un plazo configurado para esta etapa.'

        if errores:
            raise serializers.ValidationError(errores)
        return datos
