from django.utils import timezone
from rest_framework import serializers

from conferencias.models import Conferencia, LineaTematica, Plazo

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
        self._validar_plazo_postulacion(conferencia)
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

    @staticmethod
    def _validar_plazo_postulacion(conferencia):
        """La postulación solo se permite dentro del plazo POSTULACION (SDGC-127)."""
        plazo = Plazo.objects.filter(
            id_conferencia=conferencia, tipo_plazo=Plazo.POSTULACION
        ).first()
        if plazo is None:
            raise serializers.ValidationError(
                {'id_conferencia': 'La conferencia aún no tiene configurado el plazo de postulación.'}
            )
        ahora = timezone.now()
        if ahora < plazo.fecha_inicio:
            raise serializers.ValidationError(
                {'id_conferencia': 'El plazo de postulación aún no ha comenzado.'}
            )
        if ahora > plazo.fecha_fin:
            raise serializers.ValidationError(
                {'id_conferencia': 'El plazo de postulación ya venció.'}
            )

    def create(self, datos):
        return Articulo.objects.create(
            id_usuario_registra=self.context['request'].user,
            estado_articulo=ESTADO_INICIAL,
            **datos,
        )
