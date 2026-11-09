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
  if (!respuesta.ok) {
    if (datos === null || respuesta.status >= 500) {
      throw new Error('El servidor no está disponible. Intenta de nuevo más tarde.')
    }
    if (respuesta.status === 400 && datos.email) throw new Error('Ingresa un correo electrónico válido.')
    throw new Error(datos.detail || 'Correo o contraseña incorrectos.')
  }
  return leerUsuario(datos ?? {})
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
