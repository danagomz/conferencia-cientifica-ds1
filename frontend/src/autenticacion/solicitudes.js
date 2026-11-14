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
const RUTA_CREAR_USUARIO = `${URL_API}/usuarios/`
const RUTA_REGISTRO_AUTOR = `${URL_API}/auth/registro-autor/`
const RUTA_SOLICITAR_RECUPERACION = `${URL_API}/auth/recuperar-contrasena/`
const RUTA_RESTABLECER_CONTRASENA = `${URL_API}/auth/restablecer-contrasena/`
const RUTA_CONTEXTO_ARTICULOS = `${URL_API}/articulos/contexto/`
const RUTA_REGISTRAR_ARTICULO = `${URL_API}/articulos/`
const RUTA_CONFERENCIAS = `${URL_API}/conferencias/`

export async function crearUsuario({ token, nombre, apellido, correo, institucion, contrasena, roles }) {
  try {
    const respuesta = await axios.post(
      RUTA_CREAR_USUARIO,
      {
        first_name: nombre.trim(),
        last_name: apellido.trim(),
        email: correo.trim().toLowerCase(),
        institucion: institucion.trim(),
        password: contrasena,
        roles,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    return respuesta.data
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error

    const estado = error.response?.status
    const datos = error.response?.data
    const { erroresCampo, erroresGenerales } = extraerErroresCrearUsuario(datos)
    let mensaje

    if (!error.response) {
      mensaje = 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
    } else if (estado === 401) {
      mensaje = 'Tu sesión no es válida o ha vencido. Inicia sesión con una cuenta autorizada para crear usuarios.'
    } else if (estado === 403) {
      mensaje = 'No tienes permisos para crear usuarios. Se requiere el rol de Administrador o Comité científico.'
    } else if (estado >= 500) {
      mensaje = 'El servidor no pudo completar la creación del usuario. Inténtalo más tarde.'
    } else {
      mensaje = erroresGenerales.join(' ')
        || (Object.keys(erroresCampo).length
          ? 'El servidor rechazó algunos datos. Revisa los campos indicados.'
          : 'No se pudo crear el usuario. Revisa los datos e inténtalo de nuevo.')
    }

    const errorSolicitud = new Error(mensaje, { cause: error })
    errorSolicitud.erroresCampo = erroresCampo
    errorSolicitud.erroresGenerales = erroresGenerales
    errorSolicitud.estadoHttp = estado
    throw errorSolicitud
  }
}

function extraerErroresCrearUsuario(datos) {
  const campos = {
    first_name: 'nombre',
    nombre: 'nombre',
    last_name: 'apellido',
    apellido: 'apellido',
    email: 'correo',
    username: 'correo',
    correo: 'correo',
    institucion: 'institucion',
    password: 'contrasena',
    contrasena: 'contrasena',
    roles: 'roles',
  }
  const errores = {}
  const generales = []

  function recopilar(valor, destino = []) {
    if (typeof valor === 'string' && valor.trim()) {
      destino.push(valor.trim())
    } else if (Array.isArray(valor)) {
      valor.forEach((elemento) => recopilar(elemento, destino))
    } else if (valor && typeof valor === 'object') {
      Object.values(valor).forEach((elemento) => recopilar(elemento, destino))
    }
    return destino
  }

  if (typeof datos === 'string' || Array.isArray(datos)) {
    generales.push(...recopilar(datos))
  } else if (datos && typeof datos === 'object') {
    for (const [campo, valor] of Object.entries(datos)) {
      const mensajes = recopilar(valor)
      const campoFormulario = campos[campo]
      if (campoFormulario) {
        errores[campoFormulario] = [
          ...new Set([...(errores[campoFormulario] ?? []), ...mensajes]),
        ]
      } else {
        generales.push(...mensajes)
      }
    }
  }

  return {
    erroresCampo: errores,
    erroresGenerales: [...new Set(generales)],
  }
}

function crearErrorConferencia(error, mensajePredeterminado) {
  if (!axios.isAxiosError(error)) throw error
  const estado = error.response?.status
  const datos = error.response?.data
  const detalle = mensajeErrorApi(datos, '')
  let mensaje = detalle || mensajePredeterminado

  if (!error.response) {
    mensaje = 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
  } else if (estado === 401) {
    mensaje = 'Tu sesión ha vencido. Inicia sesión nuevamente.'
  } else if (estado === 403) {
    mensaje = detalle || 'No tienes permisos para configurar conferencias.'
  } else if (estado >= 500) {
    mensaje = 'El servidor no pudo completar la solicitud. Inténtalo más tarde.'
  }

  const errorSolicitud = new Error(mensaje, { cause: error })
  errorSolicitud.estadoHttp = estado
  errorSolicitud.erroresCampos = datos && typeof datos === 'object' ? datos : {}
  throw errorSolicitud
}

function opcionesAutenticadas(token) {
  return { headers: { Authorization: `Bearer ${token}` } }
}

export async function obtenerConferenciasConfigurables(token) {
  try {
    const respuesta = await axios.get(RUTA_CONFERENCIAS, opcionesAutenticadas(token))
    const conferencias = Array.isArray(respuesta.data) ? respuesta.data : respuesta.data.results ?? []
    return conferencias.filter((conferencia) => conferencia.estado === 'ACTIVA')
  } catch (error) {
    crearErrorConferencia(error, 'No se pudieron cargar las conferencias activas.')
  }
}

export async function obtenerConfiguracionConferencia(idConferencia, token) {
  const base = `${RUTA_CONFERENCIAS}${idConferencia}/`
  try {
    const [plazos, lineas] = await Promise.all([
      axios.get(`${base}plazos/`, opcionesAutenticadas(token)),
      axios.get(`${base}lineas-tematicas/`, opcionesAutenticadas(token)),
    ])
    return {
      plazos: Array.isArray(plazos.data) ? plazos.data : plazos.data.results ?? [],
      lineas: Array.isArray(lineas.data) ? lineas.data : lineas.data.results ?? [],
    }
  } catch (error) {
    crearErrorConferencia(error, 'No se pudo cargar la configuración de esta conferencia.')
  }
}

export async function guardarPlazoConferencia(idConferencia, plazo, token) {
  const base = `${RUTA_CONFERENCIAS}${idConferencia}/plazos/`
  try {
    const respuesta = plazo.id_plazo
      ? await axios.patch(`${base}${plazo.id_plazo}/`, plazo, opcionesAutenticadas(token))
      : await axios.post(base, plazo, opcionesAutenticadas(token))
    return respuesta.data
  } catch (error) {
    crearErrorConferencia(error, 'No se pudo guardar el plazo.')
  }
}

export async function guardarLineaTematica(idConferencia, linea, token) {
  const base = `${RUTA_CONFERENCIAS}${idConferencia}/lineas-tematicas/`
  try {
    const respuesta = linea.id_linea
      ? await axios.patch(`${base}${linea.id_linea}/`, linea, opcionesAutenticadas(token))
      : await axios.post(base, linea, opcionesAutenticadas(token))
    return respuesta.data
  } catch (error) {
    crearErrorConferencia(error, 'No se pudo guardar la línea temática.')
  }
}

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
    const estadoHttp = error.response?.status
    const datosError = error.response?.data
    const erroresCampos = extraerErroresRegistroArticulo(datosError)
    const mensajeApi = mensajeErrorApi(datosError, '')
    let mensaje

    if (!error.response) {
      mensaje = 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
    } else if (estadoHttp === 401) {
      mensaje = 'Tu sesión no es válida o ha vencido. Inicia sesión nuevamente.'
    } else if (estadoHttp === 403) {
      mensaje = mensajeApi || 'No tienes permisos para registrar artículos. Inicia sesión con una cuenta de autor.'
    } else if (estadoHttp >= 500) {
      mensaje = 'Ocurrió un error inesperado en el servidor. Inténtalo de nuevo más tarde.'
    } else if (estadoHttp === 400 && /plazo|postulaci[oó]n|venci[oó]|comenzado/i.test(mensajeApi)) {
      mensaje = `El periodo de postulación está cerrado o no disponible. ${mensajeApi}`
    } else {
      mensaje = mensajeApi || 'No se pudo registrar el artículo. Revisa los campos indicados e inténtalo de nuevo.'
    }

    const errorRegistro = new Error(mensaje, { cause: error })
    errorRegistro.erroresCampos = erroresCampos
    errorRegistro.estadoHttp = estadoHttp
    throw errorRegistro
  }
}

function mensajeErrorApi(datos, predeterminado) {
  const mensajes = []
  function recopilar(valor) {
    if (typeof valor === 'string') mensajes.push(valor)
    else if (Array.isArray(valor)) valor.forEach(recopilar)
    else if (valor && typeof valor === 'object') Object.values(valor).forEach(recopilar)
  }
  recopilar(datos)
  return mensajes.join(' ') || predeterminado
}

function extraerErroresRegistroArticulo(datos) {
  const errores = {}
  const traduccionCampos = {
    titulo: 'titulo',
    resumen: 'resumen',
    palabras_clave: 'palabrasClave',
    id_conferencia: 'convocatoriaId',
    convocatoria: 'convocatoriaId',
    id_linea: 'lineaTematica',
    linea_tematica: 'lineaTematica',
    responsable: 'responsableClave',
    responsableClave: 'responsableClave',
  }

  function mensajesDe(valor) {
    if (typeof valor === 'string') return [valor]
    if (Array.isArray(valor)) return valor.flatMap(mensajesDe)
    if (valor && typeof valor === 'object' && typeof valor.message === 'string') {
      return [valor.message]
    }
    return []
  }

  function agregar(clave, valor) {
    const mensajes = mensajesDe(valor)
    if (mensajes.length) {
      errores[clave] = [...new Set([...(errores[clave] ?? []), ...mensajes])].join(' ')
    }
  }

  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return errores

  for (const [campo, valor] of Object.entries(datos)) {
    if (campo === 'coautores' && Array.isArray(valor)) {
      valor.forEach((erroresAutor, indice) => {
        if (!erroresAutor || typeof erroresAutor !== 'object' || Array.isArray(erroresAutor)) return
        for (const [campoAutor, errorAutor] of Object.entries(erroresAutor)) {
          if (['nombres', 'apellidos', 'email', 'institucion'].includes(campoAutor)) {
            agregar(`autores.${indice + 1}.${campoAutor}`, errorAutor)
          } else {
            agregar('autores', errorAutor)
          }
        }
      })
      continue
    }

    const campoFormulario = traduccionCampos[campo]
    if (campoFormulario) agregar(campoFormulario, valor)
  }

  return errores
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
