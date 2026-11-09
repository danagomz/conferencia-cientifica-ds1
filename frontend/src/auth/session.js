// Guarda la sesión en sessionStorage: se borra al cerrar la pestaña.
// Forma de la sesión: { access, refresh, user: { id, email, nombre }, roles: [...], activeRole }

const CLAVE = 'sgc.session'

export function leerSesion() {
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    return crudo ? JSON.parse(crudo) : null
  } catch {
    return null
  }
}

export function guardarSesion(session) {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(session))
  } catch {
    /* sin almacenamiento disponible: la sesión vive solo en memoria */
  }
}

export function borrarSesion() {
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {
    /* nada que borrar */
  }
}
