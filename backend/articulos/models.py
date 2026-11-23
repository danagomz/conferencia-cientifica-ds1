
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Articulo(models.Model):
    id_articulo = models.AutoField(primary_key=True)

    id_conferencia = models.ForeignKey(
        'conferencias.Conferencia',
        on_delete=models.PROTECT,
        db_column='id_conferencia',
        related_name='articulos'
    )

    id_linea = models.ForeignKey(
        'conferencias.LineaTematica',
        on_delete=models.PROTECT,
        db_column='id_linea',
        related_name='articulos'
    )

    id_usuario_registra = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        db_column='id_usuario_registra',
        related_name='articulos_registrados'
    )

    titulo = models.CharField(max_length=255)
    resumen = models.TextField()
    palabras_clave = models.TextField()
    fecha_postulacion = models.DateTimeField(default=timezone.now)
    estado_articulo = models.CharField(max_length=30)
    habilitado = models.BooleanField(default=True)

    fecha_deshabilitacion = models.DateTimeField(null=True, blank=True)

    id_usuario_deshabilita = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        db_column='id_usuario_deshabilita',
        related_name='articulos_deshabilitados',
        null=True,
        blank=True
    )

    archivo_cesion_path = models.CharField(
        max_length=500,
        null=True,
        blank=True
    )

    fecha_cesion = models.DateTimeField(null=True, blank=True)

    id_usuario_carga_cesion = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        db_column='id_usuario_carga_cesion',
        related_name='cesiones_cargadas',
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'articulo'
        verbose_name = 'Artículo'
        verbose_name_plural = 'Artículos'

    def __str__(self):
        return self.titulo


class AutorArticulo(models.Model):
    id_autor_articulo = models.AutoField(primary_key=True)

    id_articulo = models.ForeignKey(
        Articulo,
        on_delete=models.CASCADE,
        db_column='id_articulo',
        related_name='autores'
    )

    id_usuario = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        db_column='id_usuario',
        related_name='autorias',
        null=True,
        blank=True
    )

    nombres = models.CharField(max_length=150)
    apellidos = models.CharField(max_length=150)
    email = models.EmailField(max_length=254)
    institucion = models.CharField(max_length=200)
    orden_autoria = models.PositiveIntegerField()
    es_responsable = models.BooleanField(default=False)

    class Meta:
        db_table = 'autor_articulo'
        verbose_name = 'Autor de artículo'
        verbose_name_plural = 'Autores de artículos'
        constraints = [
            models.UniqueConstraint(
                fields=['id_articulo'],
                condition=models.Q(es_responsable=True),
                name='uq_un_responsable_por_articulo'
            )
        ]

    def __str__(self):
        return f"{self.nombres} {self.apellidos}"


class VersionArticulo(models.Model):
    id_version = models.AutoField(primary_key=True)

    id_articulo = models.ForeignKey(
        Articulo,
        on_delete=models.CASCADE,
        db_column='id_articulo',
        related_name='versiones'
    )

    numero_version = models.PositiveIntegerField()
    tipo_version = models.CharField(max_length=50)
    archivo_pdf_path = models.CharField(max_length=500)
    nombre_archivo = models.CharField(max_length=255)
    tamano_bytes = models.PositiveBigIntegerField()
    fecha_carga = models.DateTimeField(default=timezone.now)

    id_usuario_carga = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        db_column='id_usuario_carga',
        related_name='versiones_cargadas'
    )

    observaciones = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'version_articulo'
        verbose_name = 'Versión de artículo'
        verbose_name_plural = 'Versiones de artículos'

    def __str__(self):
        return f"{self.id_articulo.titulo} - Versión {self.numero_version}"


class AsignacionEvaluador(models.Model):
    """Asociación entre un artículo y un evaluador del comité científico (HU-015, SDGC-201)."""

    ESTADO_ASIGNADA = 'ASIGNADA'

    id_asignacion = models.AutoField(primary_key=True)

    id_articulo = models.ForeignKey(
        Articulo,
        on_delete=models.CASCADE,
        db_column='id_articulo',
        related_name='asignaciones_evaluador'
    )

    id_evaluador = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        db_column='id_evaluador',
        related_name='asignaciones_como_evaluador'
    )

    id_usuario_asigna = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        db_column='id_usuario_asigna',
        related_name='asignaciones_realizadas'
    )

    fecha_asignacion = models.DateTimeField(default=timezone.now)
    estado_asignacion = models.CharField(max_length=30, default=ESTADO_ASIGNADA)

    class Meta:
        db_table = 'asignacion_evaluador'
        verbose_name = 'Asignación de evaluador'
        verbose_name_plural = 'Asignaciones de evaluadores'
        constraints = [
            models.UniqueConstraint(
                fields=['id_articulo', 'id_evaluador'],
                name='uq_evaluador_por_articulo'
            )
        ]

    def __str__(self):
        return f"{self.id_articulo.titulo} - {self.id_evaluador.email}"


class EvaluadorLinea(models.Model):
    """Línea temática en la que un miembro del comité tiene experiencia (HU-015, SDGC-195).

    Permite relacionar la línea temática de un artículo con las áreas de conocimiento de los
    evaluadores (CA-105A). Corresponde a la entidad EVALUADOR_LINEA del modelo de datos.
    """

    id_evaluador_linea = models.AutoField(primary_key=True)

    id_usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column='id_usuario',
        related_name='lineas_experiencia'
    )

    id_linea = models.ForeignKey(
        'conferencias.LineaTematica',
        on_delete=models.CASCADE,
        db_column='id_linea',
        related_name='evaluadores_con_experiencia'
    )

    class Meta:
        db_table = 'evaluador_linea'
        verbose_name = 'Línea de experiencia del evaluador'
        verbose_name_plural = 'Líneas de experiencia de los evaluadores'
        constraints = [
            models.UniqueConstraint(
                fields=['id_usuario', 'id_linea'],
                name='uq_linea_por_evaluador'
            )
        ]

    def __str__(self):
        return f'{self.id_usuario.email} - {self.id_linea.nombre}'
