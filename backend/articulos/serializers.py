from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from conferencias.models import Conferencia, LineaTematica, Plazo

from .models import Articulo, AutorArticulo

ESTADO_INICIAL = 'REGISTRADO'


class CoautorSerializer(serializers.Serializer):
    """Coautor del artículo; no necesita cuenta en el sistema (CA-060B, CA-060D)."""

    nombres = serializers.CharField(max_length=150)
    apellidos = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    institucion = serializers.CharField(max_length=200)
    es_responsable = serializers.BooleanField(required=False, default=False)


class ArticuloCrearSerializer(serializers.ModelSerializer):
    """Datos para registrar un artículo (HU-008, SDGC-122)."""

    id_conferencia = serializers.PrimaryKeyRelatedField(queryset=Conferencia.objects.all())
    id_linea = serializers.PrimaryKeyRelatedField(queryset=LineaTematica.objects.all())

    autores = serializers.SerializerMethodField()
    coautores = CoautorSerializer(many=True, required=False, write_only=True)

    class Meta:
        model = Articulo
        fields = [
            'id_articulo', 'id_conferencia', 'id_linea', 'titulo', 'resumen',
            'palabras_clave', 'estado_articulo', 'fecha_postulacion', 'autores', 'coautores',
        ]
        read_only_fields = ['id_articulo', 'estado_articulo', 'fecha_postulacion']

    def validate(self, datos):
        conferencia = datos['id_conferencia']
        self._validar_plazo_postulacion(conferencia)
        usuario = self.context['request'].user
        self._validar_autor_registrador(usuario)
        self._validar_coautores(datos.get('coautores', []), usuario.email)
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
    def _validar_autor_registrador(usuario):
        perfil = getattr(usuario, 'perfil', None)
        correo = usuario.email.strip()
        try:
            serializers.EmailField().run_validation(correo)
        except serializers.ValidationError as error:
            raise serializers.ValidationError({
                'autor_registra': 'Completa un correo electrónico válido en tu perfil antes de registrar el artículo.',
            }) from error

        if (
            not usuario.first_name.strip()
            or not usuario.last_name.strip()
            or perfil is None
            or not perfil.institucion.strip()
        ):
            raise serializers.ValidationError({
                'autor_registra': (
                    'Completa tu nombre, apellido y afiliación universitaria '
                    'en tu perfil antes de registrar el artículo.'
                ),
            })

    @staticmethod
    def _validar_coautores(coautores, email_autor):
        """Máximo un responsable y sin correos repetidos (CA-060A, CA-060C)."""
        if sum(1 for c in coautores if c['es_responsable']) > 1:
            raise serializers.ValidationError(
                {'coautores': 'Solo un autor puede ser el responsable de las versiones.'}
            )
        correos = [email_autor.strip().casefold()]
        correos.extend(c['email'].strip().casefold() for c in coautores)
        if len(correos) != len(set(correos)):
            raise serializers.ValidationError(
                {'coautores': 'Los correos electrónicos de los autores deben ser diferentes.'}
            )

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
        """Crea el artículo y sus autores: quien registra (SDGC-129) más los coautores.

        Quien registra es el autor 1 y queda como responsable, salvo que un
        coautor venga marcado como responsable de las versiones.
        """
        usuario = self.context['request'].user
        coautores = datos.pop('coautores', [])
        responsable_es_coautor = any(c['es_responsable'] for c in coautores)
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
                nombres=usuario.first_name.strip(),
                apellidos=usuario.last_name.strip(),
                email=usuario.email.strip().lower(),
                institucion=perfil.institucion.strip(),
                orden_autoria=1,
                es_responsable=not responsable_es_coautor,
            )
            for orden, c in enumerate(coautores, start=2):
                AutorArticulo.objects.create(
                    id_articulo=articulo,
                    id_usuario=None,
                    nombres=c['nombres'].strip(),
                    apellidos=c['apellidos'].strip(),
                    email=c['email'].strip().lower(),
                    institucion=c['institucion'].strip(),
                    orden_autoria=orden,
                    es_responsable=c['es_responsable'],
                )
        return articulo