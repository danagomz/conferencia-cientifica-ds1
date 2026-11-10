import { useAutenticacion } from '../autenticacion/useAutenticacion'
import { ROLES_DISPONIBLES, RUTA_ELEGIR_ROL } from '../autenticacion/roles'
import { Link, useNavigate } from 'react-router-dom'
import { Marca } from '../components/Marca'

// Pantalla de inicio de cada rol (destino de la redirección, CA-039).
// Por ahora es un esqueleto: cada historia de usuario irá agregando sus pantallas aquí.
export function InicioRol({ rol }) {
  const navegar = useNavigate()
  const { sesion, cerrarSesion } = useAutenticacion()
  const informacion = ROLES_DISPONIBLES[rol]
  const variosRoles = sesion.roles.length > 1

  return (
    <div className="min-h-dvh bg-page font-sans text-fg">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Marca compacta />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="text-muted">
              {sesion.usuario.nombre} · <strong className="font-semibold text-fg">{informacion.nombre}</strong>
            </span>
            {variosRoles && (
              <button
                type="button"
                onClick={() => navegar(RUTA_ELEGIR_ROL)}
                className="font-semibold underline underline-offset-4 hover:text-highlight"
              >
                Cambiar de rol
              </button>
            )}
            <button
              type="button"
              onClick={cerrarSesion}
              className="font-semibold underline underline-offset-4 hover:text-highlight"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 motion-safe:animate-rise">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Panel de {informacion.nombre.toLowerCase()}</h1>
        <span className="mt-3 block h-1.5 w-14 rounded-full bg-highlight" />
        <p className="mt-3 max-w-prose text-muted">{informacion.descripcion}</p>

        {rol === 'AUTOR' && (
          <Link
            to="/autor/articulos/nuevo"
            className="mt-7 inline-flex min-h-12 items-center justify-center bg-brand px-6 font-semibold text-brand-fg transition hover:bg-brand-hover"
          >
            Registrar un artículo
          </Link>
        )}

        <h2 className="mt-10 font-display text-xl font-bold">Disponible para este rol</h2>
        <ul className="mt-3 max-w-prose divide-y divide-line border-y border-line">
          {informacion.funciones.map((funcion) => (
            <li key={funcion} className="flex items-center justify-between gap-4 py-3">
              <span>{funcion}</span>
              <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-muted">
                {rol === 'AUTOR' ? 'Disponible' : 'Próximamente'}
              </span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
