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
        inicio = datos.get('fecha_inicio', actual.fecha_inicio if actual else None)
        fin = datos.get('fecha_fin', actual.fecha_fin if actual else None)
        errores = {}

        # SDGC-275: las fechas deben ser válidas.
        if inicio is not None and fin is not None and fin <= inicio:
            errores['fecha_fin'] = 'La fecha de fin debe ser posterior a la fecha de inicio.'

        # La etapa de un plazo no se cambia una vez creado.
        if actual is not None and tipo != actual.tipo_plazo:
            errores['tipo_plazo'] = 'No se puede cambiar la etapa de un plazo ya creado.'

        otros = Plazo.objects.filter(id_conferencia=conferencia)
        if actual is not None:
            otros = otros.exclude(pk=actual.pk)

        # Cada etapa se configura una sola vez por conferencia.
        if actual is None and tipo and otros.filter(tipo_plazo=tipo).exists():
            errores['tipo_plazo'] = 'Esta conferencia ya tiene un plazo configurado para esta etapa.'

        # SDGC-275: las etapas deben seguir la secuencia cronológica del proceso.
        if not errores and tipo and inicio is not None and fin is not None:
            mi_orden = Plazo.orden_de(tipo)
            for otro in otros:
                nombre = otro.get_tipo_plazo_display()
                if Plazo.orden_de(otro.tipo_plazo) < mi_orden and inicio < otro.fecha_fin:
                    errores['fecha_inicio'] = (
                        f'Esta etapa debe empezar después de que termine «{nombre}» ({otro.fecha_fin:%Y-%m-%d %H:%M}).'
                    )
                    break
                if Plazo.orden_de(otro.tipo_plazo) > mi_orden and fin > otro.fecha_inicio:
                    errores['fecha_fin'] = (
                        f'Esta etapa debe terminar antes de que empiece «{nombre}» ({otro.fecha_inicio:%Y-%m-%d %H:%M}).'
                    )
                    break

        if errores:
            raise serializers.ValidationError(errores)
        return datos