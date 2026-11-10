from rest_framework import serializers

from conferencias.models import Conferencia, LineaTematica

from .models import Articulo

ESTADO_INICIAL = 'REGISTRADO'


class ArticuloCrearSerializer(serializers.ModelSerializer):
    """Datos para registrar un artículo (HU-008, SDGC-122)."""

    id_conferencia = serializers.PrimaryKeyRelatedField(queryset=Conferencia.objects.all())
    id_linea = serializers.PrimaryKeyRelatedField(queryset=LineaTematica.objects.all())

    class Meta:
        model = Articulo
        fields = [
            'id_articulo', 'id_conferencia', 'id_linea', 'titulo', 'resumen',
            'palabras_clave', 'estado_articulo', 'fecha_postulacion',
        ]
        read_only_fields = ['id_articulo', 'estado_articulo', 'fecha_postulacion']

    def validate(self, datos):
        conferencia = datos['id_conferencia']
        linea = datos['id_linea']
        if linea.id_conferencia_id != conferencia.id_conferencia:
            raise serializers.ValidationError(
                {'id_linea': 'La línea temática no pertenece a la conferencia indicada.'}
            )
        if not linea.habilitada:
            raise serializers.ValidationError(
                {'id_linea': 'La línea temática no está habilitada.'}
            )
        return datos

    def create(self, datos):
        return Articulo.objects.create(
            id_usuario_registra=self.context['request'].user,
            estado_articulo=ESTADO_INICIAL,
            **datos,
        )
