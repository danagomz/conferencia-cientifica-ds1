import uuid

from django.conf import settings
from supabase import create_client


def obtener_bucket():
    """Obtiene el bucket privado de Supabase para los artículos."""

    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        raise RuntimeError(
            'La configuración de Supabase Storage está incompleta.'
        )

    cliente = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SECRET_KEY
    )

    return cliente.storage.from_(settings.SUPABASE_BUCKET)


def subir_pdf_articulo(articulo_id, numero_version, contenido):
    """Sube un PDF y devuelve su ruta dentro del bucket."""

    nombre_unico = f'{uuid.uuid4().hex}.pdf'

    ruta = (
        f'articulos/{articulo_id}/'
        f'versiones/{numero_version}/{nombre_unico}'
    )

    respuesta = obtener_bucket().upload(
        path=ruta,
        file=contenido,
        file_options={
            'content-type': 'application/pdf',
        }
    )

    return respuesta.path
