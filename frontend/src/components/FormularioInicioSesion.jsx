import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { VerificacionHumana } from './VerificacionHumana'
import { Marca } from './Marca'

const IMAGEN_PORTADA = '/login-hero.jpg'
const claseCampo =
  'w-full rounded-xl border-2 border-highlight bg-panel px-4 py-3 outline-none placeholder:text-muted/60 focus:border-brand focus:ring-4 focus:ring-highlight/30'

export function FormularioInicioSesion({ alEnviar }) {
  const [correo, establecerCorreo] = useState('')
  const [contrasena, establecerContrasena] = useState('')
  const [mostrarContrasena, establecerMostrarContrasena] = useState(false)
  const [tokenCaptcha, establecerTokenCaptcha] = useState(null)
  const [cargando, establecerCargando] = useState(false)
  const [error, establecerError] = useState('')
  const referenciaCaptcha = useRef(null)

  const puedeEnviar = correo.trim() !== '' && contrasena !== '' && tokenCaptcha !== null && !cargando

  async function enviarFormulario(evento) {
    evento.preventDefault()
    if (!puedeEnviar) return

    establecerError('')
    establecerCargando(true)
    try {
      await alEnviar({ correo, contrasena, tokenCaptcha })
    } catch (errorEnvio) {
      establecerError(errorEnvio?.message || 'No se pudo iniciar sesión. Intenta de nuevo.')
      referenciaCaptcha.current?.reiniciar()
    } finally {
      establecerCargando(false)
    }
  }

  return (
    <div className="grid min-h-dvh bg-page font-sans text-fg md:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12 lg:px-20">
        <header>
          <Marca />
        </header>

        <main className="my-auto mx-auto w-full max-w-md py-10">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Iniciar sesión
          </h1>
          <p className="mt-3 text-muted">Acceda a su panel de gestión académica y científica.</p>

          <form onSubmit={enviarFormulario} className="mt-8 space-y-5">
            <div>
              <label htmlFor="correo" className="mb-1.5 block text-sm font-semibold">
                Correo electrónico
              </label>
              <input
                id="correo"
                type="email"
                required
                autoComplete="username"
                value={correo}
                onChange={(event) => {
                  establecerCorreo(event.target.value)
                  establecerError('')
                }}
                placeholder="ejemplo@correo.com"
                className={claseCampo}
              />
            </div>

            <div>
              <label htmlFor="contrasena" className="mb-1.5 block text-sm font-semibold">
                Contraseña
              </label>
              <div className="flex gap-2">
                <input
                  id="contrasena"
                  type={mostrarContrasena ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={contrasena}
                  onChange={(event) => {
                    establecerContrasena(event.target.value)
                    establecerError('')
                  }}
                  placeholder="Contraseña"
                  className={claseCampo}
                />
                <button
                  type="button"
                  onClick={() => establecerMostrarContrasena((visible) => !visible)}
                  aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="rounded-xl border border-line px-3 text-sm font-medium hover:bg-soft"
                >
                  {mostrarContrasena ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <VerificacionHumana
              ref={referenciaCaptcha}
              alCambiar={establecerTokenCaptcha}
              deshabilitada={cargando}
            />

            {error && (
              <p role="alert" className="rounded-xl border border-highlight bg-soft px-4 py-3 text-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!puedeEnviar}
              className="w-full rounded-full bg-brand px-8 py-3.5 font-semibold text-brand-fg transition hover:bg-brand-hover hover:text-brand-hover-fg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            ¿Eres nuevo?{' '}
            <Link to="/registro-autor" className="font-semibold text-highlight underline underline-offset-4">
              Regístrate como autor
            </Link>
          </p>
        </main>
      </div>

      <aside className="relative hidden p-4 md:block">
        <div className="relative h-full min-h-[32rem] overflow-hidden rounded-3xl">
          <img
            src={IMAGEN_PORTADA}
            alt="Libros en una biblioteca"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-0 p-8 text-white sm:p-12">
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
              Plataforma de revisión y evaluación por pares
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80">
              Gestione convocatorias, envíe artículos científicos y consulte dictámenes del comité.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
