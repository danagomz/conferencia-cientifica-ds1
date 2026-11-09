import { useState } from 'react'
import { AuthContext } from './authContext'
import { login as apiLogin } from './api'
import { normalizarRoles } from './roles'
import { borrarSesion, guardarSesion, leerSesion } from './session'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(leerSesion)

  function actualizar(nueva) {
    if (nueva) guardarSesion(nueva)
    else borrarSesion()
    setSession(nueva)
  }

  // Inicia sesión. Si la cuenta tiene un solo rol, queda activo de una vez;
  // si tiene varios, queda sin rol activo hasta que el usuario elija (CA-042A).
  async function login(credenciales) {
    const datos = await apiLogin(credenciales)
    const roles = normalizarRoles(datos.roles)
    if (roles.length === 0) {
      throw new Error('Tu cuenta no tiene un rol asignado. Contacta al administrador.')
    }

    const nueva = {
      access: datos.access,
      refresh: datos.refresh,
      user: datos.user,
      roles,
      activeRole: roles.length === 1 ? roles[0] : null,
    }
    actualizar(nueva)
    return nueva
  }

  // Solo se puede elegir un rol que pertenezca a la cuenta (CA-042B).
  function selectRole(rol) {
    if (!session || !session.roles.includes(rol)) {
      throw new Error('Ese rol no está asociado a tu cuenta.')
    }

    const nueva = { ...session, activeRole: rol }
    actualizar(nueva)
    return nueva
  }

  function logout() {
    actualizar(null)
  }

  return (
    <AuthContext.Provider value={{ session, login, selectRole, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
