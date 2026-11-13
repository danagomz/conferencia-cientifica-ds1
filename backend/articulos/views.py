from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from conferencias.models import Conferencia, Plazo

from .filtros import aplicar_filtros, criterios_de_filtrado
from .permisos_consulta import PuedeConsultarArticulos, articulos_permitidos
from .permissions import EsAutor
from .queries import consultar_articulos
from .serializers import ArticuloCrearSerializer
from .serializers_consulta import ArticuloListadoSerializer
from .permisos_propios import PuedeConsultarArticulosPropios, articulos_propios

MENSAJE_SIN_RESULTADOS = 'No se encontraron artículos que coincidan con la consulta.'


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
    """/api/articulos/ — GET consulta el listado (SDGC-141); POST registra un artículo (SDGC-122)."""

    def get_permissions(self):
        if self.request.method == 'GET':
            return [PuedeConsultarArticulos()]
        return [EsAutor()]

    def get(self, request):
        visibles = articulos_permitidos(consultar_articulos(), request.user)
        articulos = aplicar_filtros(visibles, request.query_params)
        resultados = ArticuloListadoSerializer(articulos, many=True).data
        return Response({
            'count': len(resultados),
            'mensaje': None if resultados else MENSAJE_SIN_RESULTADOS,
            'resultados': resultados,
        })

    def post(self, request):
        serializer = ArticuloCrearSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        articulo = serializer.save()
        datos = ArticuloCrearSerializer(articulo).data
        datos['mensaje'] = f'El artículo "{articulo.titulo}" se registró correctamente.'
        return Response(datos, status=status.HTTP_201_CREATED)


class ArticuloFiltrosView(APIView):
    """GET /api/articulos/filtros/ — criterios de filtrado disponibles (SDGC-160)."""

    permission_classes = [PuedeConsultarArticulos]

    def get(self, request):
        return Response(criterios_de_filtrado())

class ArticulosPropiosView(APIView):
    """GET /api/articulos/propios/ - consulta los articulos del autor autenticado."""

    permission_classes = [PuedeConsultarArticulosPropios]

    def get(self, request):
        articulos = articulos_propios(request.user)
        resultados = ArticuloListadoSerializer(articulos, many=True).data

        return Response({
            'count': len(resultados),
            'mensaje': None if resultados else MENSAJE_SIN_RESULTADOS,
            'resultados': resultados,
        })
