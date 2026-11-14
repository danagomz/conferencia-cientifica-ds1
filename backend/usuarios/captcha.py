import json
from urllib import parse, request
from urllib.error import URLError

from django.conf import settings

URL_VERIFICACION = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
TOKEN_SIMULADO_LOCAL = 'token-de-prueba'


def captcha_es_valido(token):
    if not token:
        return False

    if not settings.TURNSTILE_SECRET_KEY:
        return settings.DEBUG and token == TOKEN_SIMULADO_LOCAL

    datos = parse.urlencode({'secret': settings.TURNSTILE_SECRET_KEY, 'response': token}).encode()

    try:
        with request.urlopen(URL_VERIFICACION, data=datos, timeout=5) as respuesta:
            resultado = json.loads(respuesta.read())
    except (URLError, TimeoutError, ValueError):
        return False

    return resultado.get('success') is True
