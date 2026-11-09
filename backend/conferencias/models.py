
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
