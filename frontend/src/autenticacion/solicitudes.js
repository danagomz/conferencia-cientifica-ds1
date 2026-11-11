import axios from 'axios'

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
const RUTA_SOLICITAR_RECUPERACION = `${URL_API}/auth/recuperar-contrasena/`
const RUTA_RESTABLECER_CONTRASENA = `${URL_API}/auth/restablecer-contrasena/`
const RUTA_CONTEXTO_ARTICULOS = `${URL_API}/articulos/contexto/`
const RUTA_REGISTRAR_ARTICULO = `${URL_API}/articulos/`

export async function obtenerContextoArticulos(token) {
  try {
    const respuesta = await axios.get(RUTA_CONTEXTO_ARTICULOS, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return respuesta.data
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error
    throw new Error(
      mensajeErrorApi(
        error.response?.data,
        error.response
          ? 'No se pudo cargar la información de la convocatoria.'
          : 'No se pudo conectar con la API. Comprueba que el backend esté ejecutándose.',
      ),
      { cause: error },
    )
  }
}

export async function registrarArticulo({
  token,
  titulo,
  resumen,
  palabrasClave,
  convocatoriaId,
  lineaTematica,
  autores,
  responsableClave,
}) {
  try {
    const respuesta = await axios({
      url: RUTA_REGISTRAR_ARTICULO,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        id_conferencia: Number(convocatoriaId),
        id_linea: Number(lineaTematica),
        titulo: titulo.trim(),
        resumen: resumen.trim(),
        palabras_clave: palabrasClave.trim(),
        coautores: autores.slice(1).map(({ clave, nombres, apellidos, email, institucion }) => ({
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          email: email.trim().toLowerCase(),
          institucion: institucion.trim(),
          es_responsable: clave === responsableClave,
        })),
      },
    })
    return respuesta.data
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error
    throw new Error(
      mensajeErrorApi(
        error.response?.data,
        error.response
          ? 'No se pudo registrar el artículo. Revisa los datos e inténtalo otra vez.'
          : 'No se pudo conectar con la API. Comprueba que el backend esté ejecutándose.',
      ),
      { cause: error },
    )
  }
}

function mensajeErrorApi(datos, predeterminado) {
  if (typeof datos?.detail === 'string') return datos.detail
  const mensajes = []
  function recopilar(valor) {
    if (typeof valor === 'string') mensajes.push(valor)
    else if (Array.isArray(valor)) valor.forEach(recopilar)
    else if (valor && typeof valor === 'object') Object.values(valor).forEach(recopilar)
  }
  recopilar(datos)
  return mensajes.join(' ') || predeterminado
}

export async function solicitarCodigoRecuperacion(correo) {
  let respuesta
  try {
    respuesta = await fetch(RUTA_SOLICITAR_RECUPERACION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: correo.trim().toLowerCase() }),
    })
  } catch {
    throw new Error('No se pudo conectar con la API. Comprueba que el backend esté ejecutándose.')
  }

  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    throw new Error(
      datos?.detail || 'No se pudo enviar el PIN. Intenta de nuevo más tarde.',
    )
  }
  return datos
}

export async function restablecerContrasena({ correo, pin, contrasena }) {
  let respuesta
  try {
    respuesta = await fetch(RUTA_RESTABLECER_CONTRASENA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: correo.trim().toLowerCase(),
        pin: pin.trim(),
        password: contrasena,
      }),
    })
  } catch {
    throw new Error('No se pudo conectar con la API. Comprueba que el backend esté ejecutándose.')
  }

  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    const errores = datos && typeof datos === 'object' ? Object.values(datos).flat() : []
    throw new Error(
      errores.join(' ') || 'No se pudo actualizar la contraseña. Revisa el PIN e inténtalo otra vez.',
    )
  }
  return datos
}

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
