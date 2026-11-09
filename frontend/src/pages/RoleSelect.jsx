import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { ROLES, rutaInicial } from '../auth/roles'
import { useNavigate } from 'react-router-dom'
import { Marca } from '../components/Marca'


// Pantalla para cuentas con más de un rol (CA-042A): el usuario elige con cuál trabaja en esta sesión.
export function RoleSelect() {
  const navigate = useNavigate()
  const { session, selectRole, logout } = useAuth()
  const [elegido, setElegido] = useState(session.activeRole ?? session.roles[0])
  const [error, setError] = useState('')

  const continuar = (e) => {
    e.preventDefault()
    try {
      const nueva = selectRole(elegido)
      navigate(rutaInicial(nueva))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-dvh bg-page font-sans text-fg">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-6 py-8">
        <header>
          <Marca />
        </header>

        <main className="my-auto py-10 motion-safe:animate-rise">
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">¿Con qué rol quieres trabajar?</h1>
          <span className="mt-3 block h-1.5 w-14 rounded-full bg-highlight" />
          <p className="mt-3 text-muted">
            Hola, {session.user.nombre}. Tu cuenta tiene varios roles. El que elijas define qué puedes hacer
            durante esta sesión.
          </p>

          <form onSubmit={continuar} className="mt-8 space-y-3">
            <fieldset className="space-y-3">
              <legend className="sr-only">Rol de la sesión</legend>
              {session.roles.map((rol) => (
                <label key={rol} className="block cursor-pointer">
                  <input
                    type="radio"
                    name="rol"
                    value={rol}
                    checked={elegido === rol}
                    onChange={() => setElegido(rol)}
                    className="peer sr-only"
                  />
                  <span className="block rounded-2xl border-2 border-highlight bg-panel p-4 transition hover:border-brand/60 peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-fg peer-focus-visible:ring-4 peer-focus-visible:ring-highlight/40">
                    <span className="block font-display text-lg font-bold">{ROLES[rol].label}</span>
                    <span className="mt-0.5 block text-sm text-muted peer-checked:text-brand-fg/80">
                      {ROLES[rol].descripcion}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            {error && (
              <p role="alert" className="rounded-xl border-2 border-highlight bg-soft px-4 py-3 text-sm font-medium">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                type="submit"
                className="rounded-full bg-brand px-8 py-3 font-semibold text-brand-fg shadow-lg shadow-brand/25 transition hover:-translate-y-0.5 hover:bg-brand-hover hover:text-brand-hover-fg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-highlight/40"
              >
                Continuar como {ROLES[elegido].label}
              </button>
              <button
                type="button"
                onClick={logout}
                className="text-sm font-semibold underline underline-offset-4 hover:text-highlight"
              >
                Cerrar sesión
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}
