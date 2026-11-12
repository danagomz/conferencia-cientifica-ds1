from rest_framework import serializers

from .models import Articulo


class ArticuloListadoSerializer(serializers.ModelSerializer):
    """Datos de un artículo en el listado (HU-009, SDGC-141)."""

    id = serializers.IntegerField(source='id_articulo', read_only=True)
    conferencia = serializers.SerializerMethodField()
    linea = serializers.CharField(source='id_linea.nombre', read_only=True)
    fecha = serializers.DateTimeField(source='fecha_postulacion', read_only=True)
    estado = serializers.CharField(source='estado_articulo', read_only=True)
    autores = serializers.SerializerMethodField()

    class Meta:
        model = Articulo
        fields = [
            'id', 'titulo', 'resumen', 'palabras_clave',
            'id_conferencia', 'conferencia', 'id_linea', 'linea',
            'fecha', 'estado', 'autores',
        ]

    def get_conferencia(self, articulo):
        c = articulo.id_conferencia
        return f'{c.nombre} - {c.edicion}'

    def get_autores(self, articulo):
        # Los autores ya vienen ordenados por orden_autoria (prefetch de consultar_articulos).
        return [
            {
                'nombre': f'{a.nombres} {a.apellidos}'.strip(),
                'email': a.email,
                'institucion': a.institucion,
                'orden_autoria': a.orden_autoria,
                'es_responsable': a.es_responsable,
            }
            for a in articulo.autores.all()
        ]
