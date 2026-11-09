
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

    fecha_deshabilitacion = models.DateTimeField(
        null=True,
        blank=True
    )

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

    fecha_cesion = models.DateTimeField(
        null=True,
        blank=True
    )

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
