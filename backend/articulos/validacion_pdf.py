"""SDGC-200 (HU-014): validar formato y características permitidas del archivo de una versión.

Condiciones (CA-093):
- Se envió un archivo y no está vacío.
- Tiene extensión .pdf y su contenido realmente es un PDF (empieza con la marca %PDF-).
- No supera el tamaño máximo (TAMANO_MAXIMO_PDF_MB en settings, 10 MB por defecto).

`validar_archivo_pdf` lanza ValidationError de DRF con la forma {'archivo': [mensaje]}, que el
frontend (VersionesArticulo / solicitudes.js) ya muestra como mensaje de error (CA-098).
"""
from django.conf import settings
from rest_framework.exceptions import ValidationError

TAMANO_MAXIMO_MB_POR_DEFECTO = 10
MARCA_PDF = b'%PDF-'

MENSAJE_SIN_ARCHIVO = 'Debe seleccionar un archivo.'
MENSAJE_ARCHIVO_VACIO = 'El archivo está vacío.'
MENSAJE_NO_ES_PDF = 'El archivo debe estar en formato PDF.'


def tamano_maximo_bytes():
    megabytes = getattr(settings, 'TAMANO_MAXIMO_PDF_MB', TAMANO_MAXIMO_MB_POR_DEFECTO)
    return int(megabytes * 1024 * 1024)


def mensaje_tamano_excedido():
    megabytes = getattr(settings, 'TAMANO_MAXIMO_PDF_MB', TAMANO_MAXIMO_MB_POR_DEFECTO)
    return f'El archivo supera el tamaño máximo permitido de {megabytes:g} MB.'


def validar_archivo_pdf(archivo):
    """Valida el archivo subido; si es correcto lo devuelve listo para volver a leerse."""
    if archivo is None:
        raise ValidationError({'archivo': [MENSAJE_SIN_ARCHIVO]})

    nombre = archivo.name or ''
    if not nombre.lower().endswith('.pdf'):
        raise ValidationError({'archivo': [MENSAJE_NO_ES_PDF]})
    if archivo.size == 0:
        raise ValidationError({'archivo': [MENSAJE_ARCHIVO_VACIO]})
    if archivo.size > tamano_maximo_bytes():
        raise ValidationError({'archivo': [mensaje_tamano_excedido()]})

    # El contenido debe ser un PDF de verdad, no solo tener la extensión.
    archivo.seek(0)
    cabecera = archivo.read(1024)
    archivo.seek(0)
    if MARCA_PDF not in cabecera:
        raise ValidationError({'archivo': [MENSAJE_NO_ES_PDF]})

    return archivo
