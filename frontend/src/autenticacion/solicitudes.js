// ════════════════════════════════════════════════════════════════
//  CAPA DE SOLICITUDES HTTP  ·  único lugar que conoce el backend
// ════════════════════════════════════════════════════════════════
//
//  CONTRATO (coincide con backend/usuarios/autenticacion.py, SDGC-98 / SDGC-99):
//
//    POST {API}/auth/login/
//      body:  { email, password, captcha_token }
//      200:   { access, refresh, usuario: { id, email, first_name, last_name, institucion, roles: ['AUTOR', 'COMITE'] } }
//      401:   { detail: 'Correo o contraseña incorrectos.' }
//      400:   { email: [...], password: [...] }   (campos faltantes o correo mal formado)
//
//  Los nombres en inglés dentro de las solicitudes corresponden al contrato del backend.
//
// ════════════════════════════════════════════════════════════════

const URL_API = import.meta.env.VITE_API_URL ?? '/api'

const RUTA_INICIO_SESION = `${URL_API}/auth/login/`
const RUTA_REGISTRO_AUTOR = `${URL_API}/auth/registro-autor/`

export async function registrarAutor({ nombre, apellido, correo, contrasena, institucion }) {
  let respuesta

  try {
    respuesta = await fetch(RUTA_REGISTRO_AUTOR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: nombre.trim(),
        last_name: apellido.trim(),
        email: correo.trim().toLowerCase(),
        password: contrasena,
        institucion: institucion.trim(),
      }),
    })
  } catch {
    throw new Error('No se pudo conectar con la API. Comprueba que el backend esté ejecutándose.')
  }

  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    throw crearErrorRegistro(datos, respuesta.status)
  }

  return datos
}

function crearErrorRegistro(datos, estadoHttp) {
  const nombresCampo = {
    first_name: 'nombre',
    last_name: 'apellido',
    email: 'correo',
    password: 'contrasena',
    institucion: 'institucion',
  }
  const erroresCampo = {}
  const mensajesGenerales = []

  if (datos && typeof datos === 'object' && !Array.isArray(datos)) {
    for (const [campo, errores] of Object.entries(datos)) {
      const mensaje = convertirErroresATexto(errores)
      const nombreCampo = nombresCampo[campo]
      if (nombreCampo) {
        erroresCampo[nombreCampo] = [erroresCampo[nombreCampo], mensaje].filter(Boolean).join(' ')
      } else {
        mensajesGenerales.push(mensaje)
      }
    }
  }

  const mensaje =
    mensajesGenerales.join(' ') ||
    Object.values(erroresCampo).join(' ') ||
    (estadoHttp >= 500
      ? 'El servidor no pudo completar el registro. Intenta de nuevo más tarde.'
      : 'No se pudo crear la cuenta. Revisa los datos e intenta de nuevo.')
  const errorSolicitud = new Error(mensaje)
  errorSolicitud.erroresCampo = erroresCampo
  return errorSolicitud
}

function convertirErroresATexto(valor) {
  if (Array.isArray(valor)) {
    return valor.map(convertirErroresATexto).filter(Boolean).join(' ')
  }
  if (valor && typeof valor === 'object') {
    return Object.values(valor).map(convertirErroresATexto).filter(Boolean).join(' ')
  }
  return String(valor ?? '')
}

export async function iniciarSesion({ correo, contrasena, tokenCaptcha }) {
  const correoNormalizado = correo.trim().toLowerCase()
  let respuesta
  try {
    respuesta = await fetch(RUTA_INICIO_SESION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: correoNormalizado,
        password: contrasena,
        captcha_token: tokenCaptcha,
      }),
    })
  } catch {
    throw new Error('No se pudo conectar con la API. Comprueba que el backend esté ejecutándose.')
  }

  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    throw new Error(mensajeDeError(respuesta.status, datos))
  }
  return leerUsuario(datos ?? {})
}

// Mensajes del inicio de sesión según lo que responda el backend (CA-040 y CA-041).
function mensajeDeError(estadoHttp, datos) {
  if (datos === null || estadoHttp >= 500) {
    return 'El servidor no está disponible. Intenta de nuevo más tarde.'
  }
  if (datos.captcha_token || datos.captcha) {
    return 'El CAPTCHA no es válido. Márcalo de nuevo e inténtalo otra vez.'
  }
  if (estadoHttp === 400) {
    if (datos.email) return 'Ingresa un correo electrónico válido.'
    if (datos.password) return 'Ingresa tu contraseña.'
  }
  if (estadoHttp === 429) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
  return datos.detail || 'Correo o contraseña incorrectos.'
}

// Traduce la respuesta del backend al formato interno.
function leerUsuario(datos) {
  const usuarioApi = datos.usuario ?? {}
  return {
    tokenAcceso: datos.access,
    tokenRenovacion: datos.refresh,
    usuario: {
      id: usuarioApi.id,
      correo: usuarioApi.email,
      nombre: [usuarioApi.first_name, usuarioApi.last_name].filter(Boolean).join(' ') || usuarioApi.email,
    },
    roles: usuarioApi.roles ?? [],
  }
}
