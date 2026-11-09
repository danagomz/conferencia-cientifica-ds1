import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Captcha } from './Captcha'
import { Marca } from './Marca'

const HERO_IMAGE = '/login-hero.jpg'
const fieldClass =
  'w-full rounded-xl border-2 border-highlight bg-panel px-4 py-3 outline-none placeholder:text-muted/60 focus:border-brand focus:ring-4 focus:ring-highlight/30'

export function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const captchaRef = useRef(null)

  const canSubmit = email.trim() !== '' && password !== '' && captchaToken !== null && !loading

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return

    setError('')
    setLoading(true)
    try {
      await onSubmit({ email, password, captchaToken })
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar sesión. Intenta de nuevo.')
      captchaRef.current?.reset()
    } finally {
      setLoading(false)
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

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                }}
                placeholder="ejemplo@correo.com"
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
                Contraseña
              </label>
              <div className="flex gap-2">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError('')
                  }}
                  placeholder="Contraseña"
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="rounded-xl border border-line px-3 text-sm font-medium hover:bg-soft"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <Captcha ref={captchaRef} onChange={setCaptchaToken} disabled={loading} />

            {error && (
              <p role="alert" className="rounded-xl border border-highlight bg-soft px-4 py-3 text-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-full bg-brand px-8 py-3.5 font-semibold text-brand-fg transition hover:bg-brand-hover hover:text-brand-hover-fg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
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
            src={HERO_IMAGE}
            alt="Biblioteca universitaria"
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
