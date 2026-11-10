
from django.db import models


class Conferencia(models.Model):

    ESTADOS = [
        ('BORRADOR', 'Borrador'),
        ('ACTIVA', 'Activa'),
        ('FINALIZADA', 'Finalizada'),
    ]

    id_conferencia = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=200)
    edicion = models.CharField(max_length=50)
    descripcion = models.TextField()
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='BORRADOR'
    )
    zona_horaria = models.CharField(max_length=50)
    agenda_publicada = models.BooleanField(default=False)
    fecha_publicacion_agenda = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'conferencia'
        verbose_name = 'Conferencia'
        verbose_name_plural = 'Conferencias'
        constraints = [
            models.UniqueConstraint(
                fields=['nombre', 'edicion'],
                name='uq_nombre_edicion_conferencia'
            )
        ]

    def __str__(self):
        return f"{self.nombre} - {self.edicion}"


class LineaTematica(models.Model):
    """Línea temática disponible en una conferencia (HU-030, SDGC-276)."""

    id_linea = models.AutoField(primary_key=True)
    id_conferencia = models.ForeignKey(
        Conferencia,
        on_delete=models.CASCADE,
        db_column='id_conferencia',
        related_name='lineas_tematicas'
    )
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    habilitada = models.BooleanField(default=True)

    class Meta:
        db_table = 'linea_tematica'
        verbose_name = 'Línea temática'
        verbose_name_plural = 'Líneas temáticas'
        constraints = [
            models.UniqueConstraint(
                fields=['id_conferencia', 'nombre'],
                name='uq_nombre_linea_por_conferencia'
            )
        ]

    def __str__(self):
        return self.nombre


class Plazo(models.Model):
    """Fechas de una etapa del proceso de una conferencia (HU-030, SDGC-274)."""

    POSTULACION = 'POSTULACION'
    EVALUACION = 'EVALUACION'
    VERSIONES_CORREGIDAS = 'VERSIONES_CORREGIDAS'
    PRESENTACION = 'PRESENTACION'
    DOCUMENTOS_FINALES = 'DOCUMENTOS_FINALES'

    # El orden de esta lista es el orden cronológico que deben respetar las etapas.
    TIPOS = [
        (POSTULACION, 'Postulación de artículos'),
        (EVALUACION, 'Evaluación'),
        (VERSIONES_CORREGIDAS, 'Entrega de versiones corregidas'),
        (PRESENTACION, 'Presentación'),
        (DOCUMENTOS_FINALES, 'Entrega de documentos finales para publicación'),
    ]

    id_plazo = models.AutoField(primary_key=True)
    id_conferencia = models.ForeignKey(
        Conferencia,
        on_delete=models.CASCADE,
        db_column='id_conferencia',
        related_name='plazos'
    )
    tipo_plazo = models.CharField(max_length=30, choices=TIPOS)
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    descripcion = models.TextField(blank=True)

    class Meta:
        db_table = 'plazo'
        verbose_name = 'Plazo'
        verbose_name_plural = 'Plazos'
        constraints = [
            models.UniqueConstraint(
                fields=['id_conferencia', 'tipo_plazo'],
                name='uq_un_plazo_por_etapa_y_conferencia'
            )
        ]

    @classmethod
    def orden_de(cls, tipo):
        return [t for t, _ in cls.TIPOS].index(tipo)

    def __str__(self):
        return f"{self.get_tipo_plazo_display()} ({self.id_conferencia})"
