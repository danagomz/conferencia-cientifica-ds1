"""SDGC-108 (HU-007): envío de correos por medio de la API de Brevo.

Render (plan gratuito) bloquea la salida a los puertos SMTP 25, 465 y 587,
así que el backend SMTP de Django se queda esperando y nunca envía el PIN.
Este backend envía el correo por HTTPS (puerto 443) a la API de Brevo,
que sí está permitido.

Para usarlo en el servidor se configuran estas variables de entorno:
    EMAIL_BACKEND=usuarios.correo_brevo.BrevoEmailBackend
    BREVO_API_KEY=<clave de la API de Brevo>
    DEFAULT_FROM_EMAIL=Sistema de Gestión de Conferencias <correo verificado en Brevo>
"""
import json
import urllib.error
import urllib.request
from email.utils import parseaddr

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend

URL_API_BREVO = 'https://api.brevo.com/v3/smtp/email'


class ErrorEnvioCorreo(Exception):
    """La API de Brevo no aceptó el correo."""


def direccion(texto):
    """Convierte 'Nombre <correo>' en el formato que pide Brevo."""
    nombre, correo = parseaddr(texto)
    datos = {'email': correo}
    if nombre:
        datos['name'] = nombre
    return datos


class BrevoEmailBackend(BaseEmailBackend):
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = getattr(settings, 'BREVO_API_KEY', '')
        self.timeout = getattr(settings, 'EMAIL_TIMEOUT', None) or 10

    def send_messages(self, email_messages):
        if not self.api_key:
            if self.fail_silently:
                return 0
            raise ImproperlyConfigured('Falta la variable BREVO_API_KEY para enviar correos.')

        enviados = 0
        for mensaje in email_messages:
            try:
                self.enviar(mensaje)
                enviados += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return enviados

    def enviar(self, mensaje):
        datos = {
            'sender': direccion(mensaje.from_email or settings.DEFAULT_FROM_EMAIL),
            'to': [direccion(destino) for destino in mensaje.to],
            'subject': mensaje.subject,
            'textContent': mensaje.body,
        }
        peticion = urllib.request.Request(
            URL_API_BREVO,
            data=json.dumps(datos).encode('utf-8'),
            headers={
                'api-key': self.api_key,
                'accept': 'application/json',
                'content-type': 'application/json',
            },
            method='POST',
        )
        try:
            with urllib.request.urlopen(peticion, timeout=self.timeout) as respuesta:
                if respuesta.status >= 300:
                    raise ErrorEnvioCorreo(f'Brevo respondió con el código {respuesta.status}.')
        except urllib.error.HTTPError as error:
            detalle = error.read().decode('utf-8', errors='replace')
            raise ErrorEnvioCorreo(f'Brevo respondió con el código {error.code}: {detalle}') from error
