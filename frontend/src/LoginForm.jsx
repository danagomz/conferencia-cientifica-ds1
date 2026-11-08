import { useRef, useState } from 'react'
import { Captcha } from './Captcha'

// Componente helper para renderizar los iconos SVG internos de forma limpia
function Icon({ className, children }) {
  return (
    <svg
      className={className}
      xmlns="http://w3.org"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

// Foto del panel derecho: guárdala en frontend/public/login-hero.jpg
const HERO_IMAGE = '/login-hero.jpg'

const fieldClass =
  'w-full rounded-xl border-2 border-highlight bg-panel py-3 pl-11 text-fg outline-none transition placeholder:text-muted/60 hover:border-brand/60 focus:border-brand focus:ring-4 focus:ring-highlight/30'

export function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const captchaRef = useRef(null)

  const canSubmit = email.trim() !== '' && password !== '' && captchaToken !== null && !loading

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setLoading(true)
    try {
      await onSubmit?.({ email, password, captchaToken })
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar sesión. Intenta de nuevo.')
      captchaRef.current?.reset() 
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-dvh bg-page font-sans text-fg md:grid-cols-2">
      {/* ───────── Columna del formulario ───────── */}
      <div className="relative flex flex-col overflow-hidden px-6 py-8 sm:px-12 lg:px-20">
        {/* Detalles de fondo */}
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-soft blur-3xl" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--sgc-line)_1.2px,transparent_1.2px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_65%)]"
        />

        {/* Logo */}
        <header className="relative flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 -rotate-3 place-items-center rounded-2xl bg-brand font-display text-xl font-extrabold tracking-tight text-brand-fg shadow-lg shadow-brand/20">
                SGC
            </div>
            <span className="min-w-0 max-w-xs font-display text-lg font-bold leading-tight sm:text-xl">
                Sistema de Gestión de Convocatorias y Artículos
            </span>
        </header>

        {/* Formulario */}
        <section className="relative my-auto w-full max-w-md self-center py-10 motion-safe:animate-rise">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Iniciar Sesión</h1>
          <span className="mt-3 block h-1.5 w-14 rounded-full bg-highlight" />
          <p className="mt-3 text-muted">Acceda a su panel de gestión académica y científica</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
                Correo electrónico
              </label>
              <div className="relative">
                <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-highlight">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </Icon>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className={`${fieldClass} pr-4`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
                Contraseña
              </label>
              <div className="relative">
                <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-highlight">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </Icon>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${fieldClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-soft hover:text-fg"
                >
                  <Icon className="h-5 w-5">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </Icon>
                </button>
              </div>
            </div>

            <Captcha ref={captchaRef} onChange={setCaptchaToken} disabled={loading} />

            <a href="#" className="inline-block text-sm font-semibold underline underline-offset-4 hover:text-highlight">
              ¿Olvidó su contraseña?
            </a>

            {error && (
              <p role="alert" className="rounded-xl border-2 border-highlight bg-soft px-4 py-3 text-sm font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="group relative mx-auto block w-full overflow-hidden rounded-full bg-brand px-10 py-3.5 font-semibold text-brand-fg shadow-lg shadow-brand/25 transition hover:-translate-y-0.5 hover:bg-brand-hover hover:text-brand-hover-fg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:w-3/4"
            >
              <span
                aria-hidden="true"
                className="absolute -left-1/3 inset-y-0 w-1/3 -skew-x-12 bg-white/25 transition-transform duration-700 group-hover:translate-x-[420%]"
              />
              <span className="relative">{loading ? 'Ingresando…' : 'Ingresar'}</span>
            </button>
          </form>
        </section>

        {/* Pie */}
        <footer className="relative mx-auto w-full max-w-md border-t border-line pt-5 text-center text-sm text-muted">
          ¿Va a postular un artículo?{' '}
          <a href="#" className="font-semibold text-fg underline-offset-4 hover:underline">
            Regístrese como Autor aquí.
          </a>
        </footer>
      </div>

      {/* ───────── Panel de la foto (Derecho) ───────── */}
      <aside className="relative hidden p-4 md:block">
        <div className="relative h-full min-h-[32rem] overflow-hidden rounded-[2rem] bg-brand">
          {/* Imagen al 100% de opacidad y sin escala de grises */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-100" 
            style={{ backgroundImage: `url(${HERO_IMAGE})` }} 
          />
          
          {/* Degradado fino en la base inferior */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Contenedor de Frases e Indicadores de Estado */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col p-8 lg:p-12 text-brand-fg">
            <h2 className="font-display text-3xl font-extrabold tracking-tight leading-tight lg:text-4xl text-white">
              Plataforma de Arbitraje y Evaluación por Pares
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/90 font-medium">
              Gestione convocatorias, envíe artículos científicos y consulte dictámenes del comité editorial de forma unificada.
            </p>

            {/* Badges traslúcidos estilizados */}
            <div className="mt-6 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-4 py-1.5 text-xs font-bold tracking-wide text-white backdrop-blur-md border border-white/20">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Postulación de Artículos Activa
              </span>
              <span className="inline-flex items-center rounded-full bg-black/40 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-md border border-white/10">
                Fase de Arbitraje Técnico
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
