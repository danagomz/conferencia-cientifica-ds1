from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from rest_framework.exceptions import ValidationError

from .validacion_pdf import (
    MENSAJE_ARCHIVO_VACIO, MENSAJE_NO_ES_PDF, MENSAJE_SIN_ARCHIVO,
    validar_archivo_pdf,
)

PDF = b'%PDF-1.4 contenido de prueba'


def archivo(nombre='articulo.pdf', contenido=PDF):
    return SimpleUploadedFile(nombre, contenido, content_type='application/pdf')


class ValidacionPdfTests(SimpleTestCase):
    """SDGC-200: formato y características permitidas del archivo de la versión."""

    def mensaje_de_error(self, subido):
        with self.assertRaises(ValidationError) as contexto:
            validar_archivo_pdf(subido)
        return contexto.exception.detail['archivo'][0]

    def test_acepta_un_pdf_valido(self):
        subido = archivo()
        self.assertIs(validar_archivo_pdf(subido), subido)

    def test_deja_el_archivo_listo_para_leerse_completo(self):
        subido = validar_archivo_pdf(archivo())
        self.assertEqual(subido.read(), PDF)

    def test_acepta_extension_en_mayusculas(self):
        validar_archivo_pdf(archivo('ARTICULO.PDF'))

    def test_rechaza_cuando_no_hay_archivo(self):
        self.assertEqual(self.mensaje_de_error(None), MENSAJE_SIN_ARCHIVO)

    def test_rechaza_extension_distinta_de_pdf(self):
        self.assertEqual(self.mensaje_de_error(archivo('articulo.docx')), MENSAJE_NO_ES_PDF)
        self.assertEqual(self.mensaje_de_error(archivo('articulo')), MENSAJE_NO_ES_PDF)

    def test_rechaza_archivo_vacio(self):
        self.assertEqual(self.mensaje_de_error(archivo(contenido=b'')), MENSAJE_ARCHIVO_VACIO)

    def test_rechaza_contenido_que_no_es_pdf_aunque_se_llame_pdf(self):
        falso = archivo('falso.pdf', b'MZ esto es un ejecutable')
        self.assertEqual(self.mensaje_de_error(falso), MENSAJE_NO_ES_PDF)

    def test_rechaza_archivo_que_supera_el_tamano_maximo(self):
        grande = archivo(contenido=PDF + b'0' * (10 * 1024 * 1024))
        self.assertEqual(
            self.mensaje_de_error(grande),
            'El archivo supera el tamaño máximo permitido de 10 MB.',
        )

    def test_acepta_un_archivo_justo_en_el_limite(self):
        justo = archivo(contenido=PDF + b'0' * (10 * 1024 * 1024 - len(PDF)))
        validar_archivo_pdf(justo)

    @override_settings(TAMANO_MAXIMO_PDF_MB=1)
    def test_el_tamano_maximo_se_puede_configurar(self):
        grande = archivo(contenido=PDF + b'0' * (1024 * 1024))
        self.assertEqual(
            self.mensaje_de_error(grande),
            'El archivo supera el tamaño máximo permitido de 1 MB.',
        )
