from django.contrib.auth.models import User
from rest_framework import serializers


class AsignarEvaluadoresSerializer(serializers.Serializer):
    """Datos para registrar los evaluadores de un artículo (SDGC-199)."""

    evaluadores = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        allow_empty=False,
    )
