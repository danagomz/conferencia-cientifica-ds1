import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/useAuth'
import { ROLES, RUTA_ELEGIR_ROL, rutaInicial } from './auth/roles'
import { LoginForm } from './LoginForm'
import { RoleHome } from './pages/RoleHome'
import { RoleSelect } from './pages/RoleSelect'

// Login: al autenticarse la sesión cambia y este componente redirige según el rol (SDGC-102).
function PaginaLogin() {
  const { session, login } = useAuth()
  if (session) return <Navigate to={rutaInicial(session)} replace />
  return <LoginForm onSubmit={(credenciales) => login(credenciales)} />
}

// Guarda: sin sesión, solo el login.
function RequiereSesion() {
  const { session } = useAuth()
  return session ? <Outlet /> : <Navigate to="/login" replace />
}

// Selector de rol: solo para cuentas con varios roles (CA-042A).
function PaginaElegirRol() {
  const { session } = useAuth()
  return session.roles.length > 1 ? <RoleSelect /> : <Navigate to={rutaInicial(session)} replace />
}

// Cada ruta de rol solo la ve quien tiene ese rol activo (CA-042B).
function SoloRol({ rol }) {
  const { session } = useAuth()
  if (!session.activeRole) return <Navigate to={RUTA_ELEGIR_ROL} replace />
  if (session.activeRole !== rol) return <Navigate to={rutaInicial(session)} replace />
  return <RoleHome rol={rol} />
}

// "/" y rutas desconocidas: a donde corresponda.
function RedireccionInicial() {
  const { session } = useAuth()
  return <Navigate to={session ? rutaInicial(session) : '/login'} replace />
}

// OJO: esto es solo experiencia de usuario. Los permisos reales deben validarse en el backend (SDGC-101).
function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PaginaLogin />} />

        <Route element={<RequiereSesion />}>
          <Route path={RUTA_ELEGIR_ROL} element={<PaginaElegirRol />} />
          {Object.entries(ROLES).map(([rol, info]) => (
            <Route key={rol} path={info.home} element={<SoloRol rol={rol} />} />
          ))}
        </Route>

        <Route path="*" element={<RedireccionInicial />} />
      </Routes>
    </AuthProvider>
  )
}

export default App