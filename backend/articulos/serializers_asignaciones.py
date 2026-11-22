from django.contrib.auth.models import User
from rest_framework import serializers

EVALUADORES_REQUERIDOS = 3

MENSAJE_TRES_EVALUADORES = 'Un artículo debe tener exactamente tres evaluadores.'
MENSAJE_EVALUADOR_REPETIDO = 'No se puede asignar al mismo evaluador más de una vez.'


class AsignarEvaluadoresSerializer(serializers.Serializer):
    """Datos para registrar los evaluadores de un artículo (SDGC-199).

    SDGC-197: cada artículo debe tener exactamente tres evaluadores, distintos entre sí.
    """

    evaluadores = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        allow_empty=False,
        error_messages={'empty': MENSAJE_TRES_EVALUADORES},
    )

    def validate_evaluadores(self, evaluadores):
        if len({evaluador.pk for evaluador in evaluadores}) != len(evaluadores):
            raise serializers.ValidationError(MENSAJE_EVALUADOR_REPETIDO)
        if len(evaluadores) != EVALUADORES_REQUERIDOS:
            raise serializers.ValidationError(MENSAJE_TRES_EVALUADORES)
        return evaluadores
