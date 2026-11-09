import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Marca } from '../components/Marca'

const initialForm = {
  nombre: '',
  email: '',
  institucion: '',
  pais: '',
  password: '',
  confirmarPassword: '',
  aceptaTerminos: false,
}

const inputClass =
  'mt-2 min-h-12 w-full border border-[#BDC2BF] bg-[#FCFCFC] px-4 text-[#02111B] outline-none transition focus:border-[#5D737E] focus:ring-2 focus:ring-[#5D737E]/20'

const countries = [
  'Argentina',
  'Brasil',
  'Chile',
  'Colombia',
  'Costa Rica',
  'Ecuador',
  'España',
  'Estados Unidos',
  'México',
  'Perú',
  'Uruguay',
  'Otro',
]

export function RegistroAutor() {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [passwordError, setPasswordError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function updateField(event) {
    const { name, value, checked, type } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setError('')
    setFieldErrors((current) => ({ ...current, [name]: '' }))
    setPasswordError('')
  }

  function submitForm(event) {
    event.preventDefault()
    setError('')

    const errors = {}
    if (!form.nombre.trim()) errors.nombre = 'Ingresa tu nombre completo.'
    if (!form.email.trim()) errors.email = 'Ingresa tu correo electrónico.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Ingresa un correo electrónico válido.'
    }
    if (!form.institucion.trim()) errors.institucion = 'Ingresa tu institución.'
    if (!form.pais) errors.pais = 'Selecciona tu país.'
    if (!form.password) errors.password = 'Ingresa una contraseña.'
    if (!form.confirmarPassword) errors.confirmarPassword = 'Confirma tu contraseña.'
    if (!form.aceptaTerminos) errors.aceptaTerminos = 'Debes aceptar los términos para continuar.'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    if (form.password.length < 8) {
      setPasswordError('Usa al menos 8 caracteres.')
      return
    }

    if (form.password !== form.confirmarPassword) {
      setPasswordError('Las contraseñas no coinciden.')
      return
    }

    setPasswordError('')
    setError(
      'El formulario está validado, pero el registro público aún no está habilitado. Tus datos no se enviaron.',
    )
  }

  return (
    <div className="min-h-dvh bg-[#FCFCFC] text-[#02111B]">
      <header className="border-b border-[#BDC2BF]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-12">
          <Link to="/login" aria-label="Sistema de Gestión de Convocatorias y Artículos, inicio">
            <Marca compacta />
          </Link>

          <nav aria-label="Navegación principal" className="flex items-center gap-6 text-sm">
            <span className="hidden text-[#3F4045] sm:inline">Conferencias</span>
            <span className="hidden border-b-2 border-[#5D737E] pb-1 font-semibold sm:inline">
              Registro de autor
            </span>
            <Link
              to="/login"
              className="border border-[#5D737E] px-4 py-2 font-semibold text-[#02111B] transition hover:bg-[#E3E7D3]"
            >
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] lg:min-h-[calc(100dvh-81px)] lg:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.8fr)]">
        <aside className="relative overflow-hidden bg-[#02111B] px-6 py-10 text-[#FCFCFC] sm:px-10 lg:px-12 lg:py-14">
          <div
            aria-hidden="true"
            className="absolute -right-20 top-28 h-64 w-64 rounded-full border border-[#5D737E]/50"
          />
          <div
            aria-hidden="true"
            className="absolute -right-10 top-40 h-44 w-44 rounded-full border border-[#989C94]/40"
          />

          <div className="relative flex h-full flex-col">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E6E49F]">
              Participación académica
            </p>
            <h1 className="mt-8 max-w-xl font-display text-4xl font-bold leading-tight sm:text-5xl">
              Regístrate
              <br />
              como autor
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#BDC2BF]">
              Crea tu cuenta para participar en nuestras conferencias y postular tus artículos científicos.
            </p>

            <div className="mt-8 inline-flex w-fit items-center gap-2 border border-[#5D737E] px-3 py-2 text-sm text-[#FCFCFC]">
              <span className="h-2 w-2 bg-[#E6E49F]" />
              Registro para nuevos participantes
            </div>

            <div className="mt-12 border-t border-[#3F4045] pt-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#989C94]">
                Un proceso sencillo
              </p>
              <ol className="mt-5 space-y-5">
                <li className="flex gap-4">
                  <span className="font-display text-2xl text-[#E6E49F]">01</span>
                  <div>
                    <p className="font-semibold">Crea tu perfil</p>
                    <p className="mt-1 text-sm leading-6 text-[#BDC2BF]">
                      Identifica tu afiliación académica y tus datos de contacto.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="font-display text-2xl text-[#E6E49F]">02</span>
                  <div>
                    <p className="font-semibold">Postula tu investigación</p>
                    <p className="mt-1 text-sm leading-6 text-[#BDC2BF]">
                      Prepara y envía tus artículos para las convocatorias vigentes.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="font-display text-2xl text-[#E6E49F]">03</span>
                  <div>
                    <p className="font-semibold">Sigue cada etapa</p>
                    <p className="mt-1 text-sm leading-6 text-[#BDC2BF]">
                      Consulta el estado y las comunicaciones de tu postulación.
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="mt-10 flex items-start gap-3 border-l-2 border-[#E6E49F] bg-[#30292F] p-4 lg:mt-auto lg:translate-y-8">
              <span aria-hidden="true" className="mt-0.5 text-[#E6E49F]">✦</span>
              <p className="text-sm leading-6 text-[#FCFCFC]">
                Tu cuenta se crea automáticamente con el rol de{' '}
                <strong className="text-[#E6E49F]">Autor</strong>. No hay selección de permisos.
              </p>
            </div>
          </div>
        </aside>

        <section className="px-5 py-10 sm:px-10 lg:px-14 lg:py-14">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#BDC2BF] pb-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#5D737E]">
                  Nuevo perfil
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                  Información del autor
                </h2>
              </div>
              <p className="text-sm text-[#3F4045]">
                <span className="text-[#25291C]">*</span> Campos obligatorios
              </p>
            </div>

            <form onSubmit={submitForm} className="mt-7" noValidate>
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold sm:col-span-2">
                  Nombre completo <span className="text-[#5D737E]">*</span>
                  <input
                    className={`${inputClass} ${fieldErrors.nombre ? 'border-[#30292F]' : ''}`}
                    type="text"
                    name="nombre"
                    autoComplete="name"
                    placeholder="Ej. María Fernanda López"
                    value={form.nombre}
                    onChange={updateField}
                    required
                    aria-invalid={Boolean(fieldErrors.nombre)}
                    aria-describedby={fieldErrors.nombre ? 'nombre-error' : undefined}
                  />
                  {fieldErrors.nombre && <span id="nombre-error" className="mt-1 block text-xs text-[#30292F]">{fieldErrors.nombre}</span>}
                </label>

                <label className="block text-sm font-semibold sm:col-span-2">
                  Correo electrónico <span className="text-[#5D737E]">*</span>
                  <input
                    className={`${inputClass} ${fieldErrors.email ? 'border-[#30292F]' : ''}`}
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="nombre@universidad.edu"
                    value={form.email}
                    onChange={updateField}
                    required
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'email-error' : 'email-help'}
                  />
                  {fieldErrors.email ? (
                    <span id="email-error" className="mt-1 block text-xs font-normal text-[#30292F]">{fieldErrors.email}</span>
                  ) : <span id="email-help" className="mt-1 block text-xs font-normal text-[#3F4045]">
                    El servidor comprobará si el correo ya está registrado.
                  </span>}
                </label>

                <label className="block text-sm font-semibold">
                  Institución o afiliación <span className="text-[#5D737E]">*</span>
                  <input
                    className={`${inputClass} ${fieldErrors.institucion ? 'border-[#30292F]' : ''}`}
                    type="text"
                    name="institucion"
                    autoComplete="organization"
                    placeholder="Universidad o centro de investigación"
                    value={form.institucion}
                    onChange={updateField}
                    required
                    aria-invalid={Boolean(fieldErrors.institucion)}
                  />
                  {fieldErrors.institucion && <span className="mt-1 block text-xs font-normal text-[#30292F]">{fieldErrors.institucion}</span>}
                </label>

                <label className="block text-sm font-semibold">
                  País <span className="text-[#5D737E]">*</span>
                  <select
                    className={`${inputClass} appearance-none ${fieldErrors.pais ? 'border-[#30292F]' : ''}`}
                    name="pais"
                    autoComplete="country-name"
                    value={form.pais}
                    onChange={updateField}
                    required
                    aria-invalid={Boolean(fieldErrors.pais)}
                  >
                    <option value="" disabled>Selecciona un país</option>
                    {countries.map((country) => <option key={country}>{country}</option>)}
                  </select>
                  {fieldErrors.pais && <span className="mt-1 block text-xs font-normal text-[#30292F]">{fieldErrors.pais}</span>}
                </label>

                <label className="block text-sm font-semibold">
                  Contraseña <span className="text-[#5D737E]">*</span>
                  <input
                    className={`${inputClass} ${fieldErrors.password || passwordError ? 'border-[#30292F]' : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    value={form.password}
                    onChange={updateField}
                    minLength={8}
                    required
                    aria-invalid={Boolean(fieldErrors.password || passwordError)}
                  />
                </label>

                <label className="block text-sm font-semibold">
                  Confirmar contraseña <span className="text-[#5D737E]">*</span>
                  <input
                    className={`${inputClass} ${fieldErrors.confirmarPassword || passwordError ? 'border-[#30292F]' : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    name="confirmarPassword"
                    autoComplete="new-password"
                    placeholder="Repite tu contraseña"
                    value={form.confirmarPassword}
                    onChange={updateField}
                    required
                    aria-invalid={Boolean(fieldErrors.confirmarPassword || passwordError)}
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                {passwordError || fieldErrors.password || fieldErrors.confirmarPassword ? (
                  <p role="alert" className="text-sm text-[#30292F]">
                    {passwordError || fieldErrors.password || fieldErrors.confirmarPassword}
                  </p>
                ) : (
                  <span className="text-xs text-[#3F4045]">Usa una contraseña difícil de adivinar.</span>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="min-h-10 px-2 text-sm font-semibold text-[#5D737E] underline underline-offset-4 hover:text-[#02111B]"
                >
                  {showPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                </button>
              </div>

              <label className={`mt-6 flex items-start gap-3 border-t border-[#BDC2BF] pt-5 text-sm leading-6 ${fieldErrors.aceptaTerminos ? 'text-[#30292F]' : 'text-[#3F4045]'}`}>
                <input
                  className="mt-1 h-4 w-4 accent-[#5D737E]"
                  type="checkbox"
                  name="aceptaTerminos"
                  checked={form.aceptaTerminos}
                  onChange={updateField}
                  required
                />
                <span>
                  Acepto los <strong className="font-semibold text-[#02111B]">términos y condiciones</strong> y
                  la política de tratamiento de datos.
                </span>
              </label>
              {fieldErrors.aceptaTerminos && (
                <p className="mt-1 text-xs text-[#30292F]">{fieldErrors.aceptaTerminos}</p>
              )}

              {error && (
                <p role="alert" className="mt-5 border-l-4 border-[#5D737E] bg-[#E3E7D3] px-4 py-3 text-sm leading-6 text-[#25291C]">
                  {error}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  className="min-h-14 bg-[#02111B] px-8 text-base font-semibold text-[#FCFCFC] transition hover:bg-[#5D737E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5D737E]"
                >
                  Crear cuenta de autor
                </button>
                <p className="text-sm text-[#3F4045]">
                  ¿Ya tienes una cuenta?{' '}
                  <Link to="/login" className="font-semibold text-[#5D737E] underline underline-offset-4">
                    Inicia sesión
                  </Link>
                </p>
              </div>
            </form>

            <div className="mt-9 flex items-start gap-3 border-t border-[#BDC2BF] pt-5 text-sm leading-6 text-[#3F4045]">
              <span aria-hidden="true" className="text-lg text-[#5D737E]">◈</span>
              <p>
                Protegemos tus datos y los utilizamos únicamente para gestionar tu participación académica.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
