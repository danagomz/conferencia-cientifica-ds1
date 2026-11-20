from django.db.models import Max
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from conferencias.models import Conferencia, Plazo

from .filtros import aplicar_filtros, criterios_de_filtrado
from .models import Articulo, AutorArticulo, VersionArticulo
from .permisos_detalle import (
    MENSAJE_NO_DISPONIBLE, MENSAJE_NO_ASOCIADO, PuedeConsultarDetalleArticulo, puede_ver_articulo,
)
from .permisos_consulta import PuedeConsultarArticulos, articulos_permitidos
from .permissions import EsAutor
from .queries import consultar_articulos
from .serializers import ArticuloCrearSerializer
from .serializers_consulta import ArticuloListadoSerializer
from .serializers_detalle import ArticuloDetalleSerializer
from .permisos_propios import PuedeConsultarArticulosPropios, articulos_propios
from .storage import subir_pdf_articulo
from storage3.utils import StorageException

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
                {
                    'id': linea.id_linea,
                    'nombre': linea.nombre,
                    'habilitada': linea.habilitada,
                }
                for linea in conferencia.lineas_tematicas.filter(habilitada=True).order_by('nombre')
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


class ArticuloDetalleView(APIView):
    """GET /api/articulos/<id>/ — detalle de un artículo (HU-011, SDGC-152 y SDGC-154)."""

    permission_classes = [PuedeConsultarDetalleArticulo]

    def get(self, request, pk):
        # Si no existe o está deshabilitado: 404 para todos (CA-077).
        articulo = consultar_articulos().filter(pk=pk).first()
        if articulo is None:
            raise NotFound(MENSAJE_NO_DISPONIBLE)
        # Existe pero el usuario no puede verlo (p. ej. un autor con un artículo ajeno): 403.
        if not puede_ver_articulo(request.user, articulo):
            raise PermissionDenied(MENSAJE_NO_ASOCIADO)
        return Response(ArticuloDetalleSerializer(articulo).data)


class ArticuloVersionCrearView(APIView):
    """POST /api/articulos/<id>/versiones/ - carga una versión del artículo."""

    permission_classes = [EsAutor]
    parser_classes = [MultiPartParser]

    def post(self, request, pk):
        articulo = Articulo.objects.filter(pk=pk).first()

        if articulo is None:
            raise NotFound('El artículo no existe.')

        es_responsable = AutorArticulo.objects.filter(
            id_articulo=articulo,
            id_usuario=request.user,
            es_responsable=True,
        ).exists()

        if not es_responsable:
            raise PermissionDenied(
                'Solo el autor responsable puede cargar versiones del artículo.'
            )

        archivo = request.FILES.get('archivo')

        if archivo is None:
            return Response(
                {'mensaje': 'Debe seleccionar un archivo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ultima_version = VersionArticulo.objects.filter(
            id_articulo=articulo
        ).aggregate(maximo=Max('numero_version'))['maximo']

        numero_version = (ultima_version or 0) + 1
        tipo_version = 'ORIGINAL' if numero_version == 1 else 'CORREGIDA'
        if numero_version == 1:
            ArticuloCrearSerializer._validar_plazo_postulacion(
                articulo.id_conferencia
            )

        try:
            ruta = subir_pdf_articulo(
                articulo.id_articulo,
                numero_version,
                archivo.read(),
            )
        except StorageException:
            return Response(
                {
                    'mensaje': 'No fue posible almacenar el archivo. Inténtelo nuevamente.'
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        version = VersionArticulo.objects.create(
            id_articulo=articulo,
            numero_version=numero_version,
            tipo_version=tipo_version,
            archivo_pdf_path=ruta,
            nombre_archivo=archivo.name,
            tamano_bytes=archivo.size,
            id_usuario_carga=request.user,
        )

        return Response(
            {
                'mensaje': 'La versión del artículo se cargó correctamente.',
                'id_version': version.id_version,
                'numero_version': version.numero_version,
                'tipo_version': version.tipo_version,
                'nombre_archivo': version.nombre_archivo,
            },
            status=status.HTTP_201_CREATED,
        )
