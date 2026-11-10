from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from conferencias.models import Conferencia, LineaTematica, Plazo

from .models import Articulo, AutorArticulo

ESTADO_INICIAL = 'REGISTRADO'


class ArticuloCrearSerializer(serializers.ModelSerializer):
    """Datos para registrar un artículo (HU-008, SDGC-122)."""

    id_conferencia = serializers.PrimaryKeyRelatedField(queryset=Conferencia.objects.all())
    id_linea = serializers.PrimaryKeyRelatedField(queryset=LineaTematica.objects.all())
    autores = serializers.SerializerMethodField()

    class Meta:
        model = Articulo
        fields = [
            'id_articulo', 'id_conferencia', 'id_linea', 'titulo', 'resumen',
            'palabras_clave', 'estado_articulo', 'fecha_postulacion', 'autores',
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

    def get_autores(self, articulo):
        return [
            {
                'id_usuario': a.id_usuario_id,
                'nombres': a.nombres,
                'apellidos': a.apellidos,
                'email': a.email,
                'institucion': a.institucion,
                'orden_autoria': a.orden_autoria,
                'es_responsable': a.es_responsable,
            }
            for a in articulo.autores.order_by('orden_autoria')
        ]

    def create(self, datos):
        """Crea el artículo y lo asocia a quien lo registra como autor responsable (SDGC-129)."""
        usuario = self.context['request'].user
        with transaction.atomic():
            articulo = Articulo.objects.create(
                id_usuario_registra=usuario,
                estado_articulo=ESTADO_INICIAL,
                **datos,
            )
            perfil = getattr(usuario, 'perfil', None)
            AutorArticulo.objects.create(
                id_articulo=articulo,
                id_usuario=usuario,
                nombres=usuario.first_name,
                apellidos=usuario.last_name,
                email=usuario.email,
                institucion=perfil.institucion if perfil else '',
                orden_autoria=1,
                es_responsable=True,
            )
        return articulo