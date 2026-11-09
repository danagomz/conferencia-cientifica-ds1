// ════════════════════════════════════════════════════════════════
//  CAPA DE API DEL LOGIN  ·  único lugar que conoce el backend
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
//  Si el backend responde distinto, solo hay que ajustar `urlLogin`,
//  el body de `login` y la función `leerUsuario`. El resto del front no cambia.
//
//  MODO DEMO (sin backend): crear frontend/.env.local con  VITE_USE_MOCK=true
// ════════════════════════════════════════════════════════════════

const API = import.meta.env.VITE_API_URL ?? '/api'
const USAR_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const urlLogin = `${API}/auth/login/`

export async function login({ email, password, captchaToken }) {
  if (USAR_MOCK) return loginDemo({ email, password })

  let respuesta
  try {
    respuesta = await fetch(urlLogin, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, captcha_token: captchaToken }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.')
  }

    const datos = await respuesta.json().catch(() => null)
    if (!respuesta.ok) throw new Error(mensajeDeError(respuesta.status, datos))
    return leerUsuario(datos ?? {})
}

// Mensajes del login según lo que responda el backend (CA-040 y CA-041).
function mensajeDeError(status, datos) {
  if (datos === null || status >= 500) {
    return 'El servidor no está disponible. Intenta de nuevo más tarde.'
  }
  if (datos.captcha_token || datos.captcha) {
    return 'El CAPTCHA no es válido. Márcalo de nuevo e inténtalo otra vez.'
  }
  if (status === 400) {
    if (datos.email) return 'Ingresa un correo electrónico válido.'
    if (datos.password) return 'Ingresa tu contraseña.'
  }
  if (status === 429) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
  return datos.detail || 'Correo o contraseña incorrectos.'
}

// Traduce la respuesta del backend al formato interno.
function leerUsuario(datos) {
  const u = datos.usuario ?? {}
  return {
    access: datos.access,
    refresh: datos.refresh,
    user: {
      id: u.id,
      email: u.email,
      nombre: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
    },
    roles: u.roles ?? [],
  }
}

// ───────── Modo demo: cuentas de prueba para ver los tres caminos ─────────
const CUENTAS_DEMO = {
  'admin@demo.co': { nombre: 'Ada Admin', roles: ['ADMIN'] },
  'comite@demo.co': { nombre: 'Carlos Comité', roles: ['COMITE'] },
  'autor@demo.co': { nombre: 'Ana Autora', roles: ['AUTOR'] },
  'multi@demo.co': { nombre: 'Marta Multirrol', roles: ['COMITE', 'AUTOR'] },
}
const CLAVE_DEMO = 'Demo#12345'

async function loginDemo({ email, password }) {
  await new Promise((resolve) => setTimeout(resolve, 500))
  const cuenta = CUENTAS_DEMO[email.trim().toLowerCase()]
  if (!cuenta || password !== CLAVE_DEMO) throw new Error('Correo o contraseña incorrectos.')
  return {
    access: 'token-demo',
    refresh: 'refresh-demo',
    user: { id: email, email, nombre: cuenta.nombre },
    roles: cuenta.roles,
  }
}
