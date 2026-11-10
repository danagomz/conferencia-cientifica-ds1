import { useContext } from 'react'
import { AuthContext } from './authContext'

// session: null | { access, refresh, user, roles, activeRole }
// login(credenciales) → session   · selectRole(rol)   · logout()
export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return contexto
}
