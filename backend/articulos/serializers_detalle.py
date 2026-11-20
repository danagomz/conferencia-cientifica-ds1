from rest_framework import serializers

from .serializers_consulta import ArticuloListadoSerializer


class VersionDetalleSerializer(serializers.Serializer):
    """Una versión del artículo y su documento. No se expone la ruta interna del archivo."""

    id = serializers.IntegerField(source='id_version')
    numero_version = serializers.IntegerField()
    tipo_version = serializers.CharField()
    nombre_archivo = serializers.CharField()
    tamano_bytes = serializers.IntegerField()
    fecha_carga = serializers.DateTimeField()
    observaciones = serializers.CharField(allow_null=True)


class ArticuloDetalleSerializer(ArticuloListadoSerializer):
    """Detalle de un artículo (HU-011, SDGC-152).

    Incluye todo lo del listado y además quién lo registró, sus versiones con documentos y el
    estado de la cesión de derechos.
    """

    registrado_por = serializers.SerializerMethodField()
    versiones = serializers.SerializerMethodField()
    cesion = serializers.SerializerMethodField()

    class Meta(ArticuloListadoSerializer.Meta):
        fields = ArticuloListadoSerializer.Meta.fields + ['registrado_por', 'versiones', 'cesion']

    def get_registrado_por(self, articulo):
        u = articulo.id_usuario_registra
        return {'nombre': f'{u.first_name} {u.last_name}'.strip(), 'email': u.email}

    def get_versiones(self, articulo):
        versiones = sorted(articulo.versiones.all(), key=lambda v: v.numero_version)
        return VersionDetalleSerializer(versiones, many=True).data

    def get_cesion(self, articulo):
        return {
            'cargada': bool(articulo.archivo_cesion_path),
            'fecha': articulo.fecha_cesion,
        }
