// Guarda la sesión en sessionStorage, que se borra al cerrar la pestaña.
// También lee claves antiguas en inglés para conservar sesiones existentes.

const CLAVE = 'sgc.session'

export function leerSesion() {
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    if (!crudo) return null

    const sesion = JSON.parse(crudo)
    const usuarioGuardado = sesion.usuario ?? sesion.user
    return {
      tokenAcceso: sesion.tokenAcceso ?? sesion.access,
      tokenRenovacion: sesion.tokenRenovacion ?? sesion.refresh,
      usuario: usuarioGuardado
        ? {
            ...usuarioGuardado,
            correo: usuarioGuardado.correo ?? usuarioGuardado.email,
          }
        : null,
      roles: sesion.roles,
      rolActivo: sesion.rolActivo ?? sesion.activeRole,
    }
  } catch {
    return null
  }
}

export function guardarSesion(sesion) {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(sesion))
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
