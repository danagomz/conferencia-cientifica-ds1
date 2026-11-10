from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from conferencias.models import Conferencia, Plazo

from .permissions import EsAutor
from .serializers import ArticuloCrearSerializer


class ArticuloContextoView(APIView):
    """GET /api/articulos/contexto/ — opciones de registro para autores."""

    permission_classes = [EsAutor]

    def get(self, request):
        ahora = timezone.now()
        convocatorias = []
        conferencias = Conferencia.objects.filter(estado='ACTIVA').prefetch_related(
            'lineas_tematicas',
            'plazos',
        ).order_by('fecha_inicio')

        for conferencia in conferencias:
            plazo = next(
                (item for item in conferencia.plazos.all() if item.tipo_plazo == Plazo.POSTULACION),
                None,
            )
            lineas = [
                {'id': linea.id_linea, 'nombre': linea.nombre}
                for linea in conferencia.lineas_tematicas.all()
                if linea.habilitada
            ]
            convocatorias.append({
                'id': conferencia.id_conferencia,
                'nombre': f'{conferencia.nombre} - {conferencia.edicion}',
                'postulaciones_abiertas': bool(
                    plazo and plazo.fecha_inicio <= ahora <= plazo.fecha_fin
                ),
                'fecha_limite_postulaciones': (
                    plazo.fecha_fin.date().isoformat()
                    if plazo else conferencia.fecha_fin.isoformat()
                ),
                'lineas_tematicas': lineas,
            })

        perfil = getattr(request.user, 'perfil', None)
        return Response({
            'convocatorias': convocatorias,
            'autor_actual': {
                'nombres': request.user.first_name,
                'apellidos': request.user.last_name,
                'email': request.user.email,
                'institucion': perfil.institucion if perfil else '',
            },
        })


class ArticuloCrearView(APIView):
    """POST /api/articulos/ — registra un artículo (SDGC-122)."""

    permission_classes = [EsAutor]

    def post(self, request):
        serializer = ArticuloCrearSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        articulo = serializer.save()
        return Response(ArticuloCrearSerializer(articulo).data, status=status.HTTP_201_CREATED)
