import { useState } from 'react'
import { Link } from 'react-router-dom'
import { registrarAutor } from '../autenticacion/solicitudes'
import { Marca } from '../components/Marca'

const formularioInicial = {
  nombre: '',
  apellido: '',
  correo: '',
  institucion: '',
  contrasena: '',
}

const claseCampo =
  'mt-2 min-h-12 w-full border border-[#BDC2BF] bg-[#FCFCFC] px-4 text-[#02111B] outline-none transition focus:border-[#5D737E] focus:ring-2 focus:ring-[#5D737E]/20'

export function RegistroAutor() {
  const [formulario, establecerFormulario] = useState(formularioInicial)
  const [confirmarContrasena, establecerConfirmacionContrasena] = useState('')
  const [error, establecerError] = useState('')
  const [erroresCampo, establecerErroresCampo] = useState({})
  const [mostrarContrasena, establecerMostrarContrasena] = useState(false)
  const [cargando, establecerCargando] = useState(false)
  const [registroExitoso, establecerRegistroExitoso] = useState(false)

  function actualizarCampo(evento) {
    const { name: nombreCampo, value: valor } = evento.target
    if (nombreCampo === 'confirmarContrasena') {
      establecerConfirmacionContrasena(valor)
    } else {
      establecerFormulario((actual) => ({
        ...actual,
        [nombreCampo]: valor,
      }))
    }
    establecerError('')
    establecerErroresCampo((actuales) => ({
      ...actuales,
      [nombreCampo]: '',
      ...(nombreCampo === 'contrasena' ? { confirmarContrasena: '' } : {}),
    }))
  }

  async function enviarFormulario(evento) {
    evento.preventDefault()
    establecerError('')
    establecerErroresCampo({})

    const errores = {}
    if (!formulario.nombre.trim()) errores.nombre = 'Ingresa tu nombre.'
    if (!formulario.apellido.trim()) errores.apellido = 'Ingresa tu apellido.'
    if (!formulario.correo.trim()) errores.correo = 'Ingresa tu correo electrónico.'
    else if (!evento.currentTarget.elements.correo.checkValidity()) {
      errores.correo = 'Ingresa un correo electrónico válido.'
    }
    if (!formulario.institucion.trim()) errores.institucion = 'Ingresa tu institución.'
    if (!formulario.contrasena) errores.contrasena = 'Ingresa una contraseña.'
    if (!confirmarContrasena) errores.confirmarContrasena = 'Confirma tu contraseña.'
    else if (formulario.contrasena !== confirmarContrasena) {
      errores.confirmarContrasena = 'Las contraseñas no coinciden.'
    }

    if (Object.keys(errores).length > 0) {
      establecerErroresCampo(errores)
      establecerError('Revisa los campos indicados antes de continuar.')
      return
    }

    establecerCargando(true)
    try {
      await registrarAutor(formulario)
      establecerRegistroExitoso(true)
    } catch (errorSolicitud) {
      establecerError(errorSolicitud.message || 'No se pudo crear la cuenta. Intenta de nuevo.')
      establecerErroresCampo(errorSolicitud.erroresCampo ?? {})
    } finally {
      establecerCargando(false)
    }
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

            {registroExitoso ? (
              <div role="status" className="mt-8 border-l-4 border-[#5D737E] bg-[#E3E7D3] px-5 py-5">
                <h3 className="font-display text-xl font-bold">¡Tu cuenta ha sido creada correctamente!</h3>
                <p className="mt-2 text-sm leading-6 text-[#3F4045]">
                  Ya puedes iniciar sesión como autor con el correo que registraste.
                </p>
                <Link
                  to="/login"
                  className="mt-4 inline-block bg-[#02111B] px-6 py-3 font-semibold text-[#FCFCFC] hover:bg-[#5D737E]"
                >
                  Ir a iniciar sesión
                </Link>
              </div>
            ) : <form onSubmit={enviarFormulario} className="mt-7" noValidate>
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold">
                  Nombre <span className="text-[#5D737E]">*</span>
                  <input
                    className={`${claseCampo} ${erroresCampo.nombre ? 'border-[#30292F]' : ''}`}
                    type="text"
                    name="nombre"
                    autoComplete="given-name"
                    placeholder="Ej. María Fernanda"
                    value={formulario.nombre}
                    onChange={actualizarCampo}
                    required
                    maxLength={150}
                    aria-invalid={Boolean(erroresCampo.nombre)}
                    aria-describedby={erroresCampo.nombre ? 'nombre-error' : undefined}
                  />
                  {erroresCampo.nombre && <span id="nombre-error" className="mt-1 block text-xs text-[#30292F]">{erroresCampo.nombre}</span>}
                </label>

                <label className="block text-sm font-semibold">
                  Apellido <span className="text-[#5D737E]">*</span>
                  <input
                    className={`${claseCampo} ${erroresCampo.apellido ? 'border-[#30292F]' : ''}`}
                    type="text"
                    name="apellido"
                    autoComplete="family-name"
                    placeholder="Ej. López"
                    value={formulario.apellido}
                    onChange={actualizarCampo}
                    required
                    maxLength={150}
                    aria-invalid={Boolean(erroresCampo.apellido)}
                    aria-describedby={erroresCampo.apellido ? 'apellido-error' : undefined}
                  />
                  {erroresCampo.apellido && <span id="apellido-error" className="mt-1 block text-xs text-[#30292F]">{erroresCampo.apellido}</span>}
                </label>

                <label className="block text-sm font-semibold sm:col-span-2">
                  Correo electrónico <span className="text-[#5D737E]">*</span>
                  <input
                    className={`${claseCampo} ${erroresCampo.correo ? 'border-[#30292F]' : ''}`}
                    type="email"
                    name="correo"
                    autoComplete="email"
                    placeholder="nombre@universidad.edu"
                    value={formulario.correo}
                    onChange={actualizarCampo}
                    required
                    maxLength={254}
                    aria-invalid={Boolean(erroresCampo.correo)}
                    aria-describedby={erroresCampo.correo ? 'correo-error' : 'correo-ayuda'}
                  />
                  {erroresCampo.correo ? (
                    <span id="correo-error" className="mt-1 block text-xs font-normal text-[#30292F]">{erroresCampo.correo}</span>
                  ) : <span id="correo-ayuda" className="mt-1 block text-xs font-normal text-[#3F4045]">
                    El servidor comprobará si el correo ya está registrado.
                  </span>}
                </label>

                <label className="block text-sm font-semibold">
                  Institución o afiliación <span className="text-[#5D737E]">*</span>
                  <input
                    className={`${claseCampo} ${erroresCampo.institucion ? 'border-[#30292F]' : ''}`}
                    type="text"
                    name="institucion"
                    autoComplete="organization"
                    placeholder="Universidad o centro de investigación"
                    value={formulario.institucion}
                    onChange={actualizarCampo}
                    required
                    maxLength={150}
                    aria-invalid={Boolean(erroresCampo.institucion)}
                  />
                  {erroresCampo.institucion && <span className="mt-1 block text-xs font-normal text-[#30292F]">{erroresCampo.institucion}</span>}
                </label>

                <label className="block text-sm font-semibold">
                  Contraseña <span className="text-[#5D737E]">*</span>
                  <input
                    className={`${claseCampo} ${erroresCampo.contrasena ? 'border-[#30292F]' : ''}`}
                    type={mostrarContrasena ? 'text' : 'password'}
                    name="contrasena"
                    autoComplete="new-password"
                    placeholder="Ingresa una contraseña"
                    value={formulario.contrasena}
                    onChange={actualizarCampo}
                    required
                    aria-invalid={Boolean(erroresCampo.contrasena)}
                  />
                  {erroresCampo.contrasena && <span className="mt-1 block text-xs text-[#30292F]">{erroresCampo.contrasena}</span>}
                </label>

                <label className="block text-sm font-semibold">
                  Confirmar contraseña <span className="text-[#5D737E]">*</span>
                  <input
                    className={`${claseCampo} ${erroresCampo.confirmarContrasena ? 'border-[#30292F]' : ''}`}
                    type={mostrarContrasena ? 'text' : 'password'}
                    name="confirmarContrasena"
                    autoComplete="new-password"
                    placeholder="Repite tu contraseña"
                    value={confirmarContrasena}
                    onChange={actualizarCampo}
                    required
                    aria-invalid={Boolean(erroresCampo.confirmarContrasena)}
                    aria-describedby={erroresCampo.confirmarContrasena ? 'confirmar-contrasena-error' : undefined}
                  />
                  {erroresCampo.confirmarContrasena && (
                    <span id="confirmar-contrasena-error" className="mt-1 block text-xs text-[#30292F]">
                      {erroresCampo.confirmarContrasena}
                    </span>
                  )}
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[#3F4045]">El servidor validará la contraseña.</span>
                <button
                  type="button"
                  onClick={() => establecerMostrarContrasena((visible) => !visible)}
                  className="min-h-10 px-2 text-sm font-semibold text-[#5D737E] underline underline-offset-4 hover:text-[#02111B]"
                >
                  {mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                </button>
              </div>

              {error && (
                <p role="alert" className="mt-5 border-l-4 border-[#5D737E] bg-[#E3E7D3] px-4 py-3 text-sm leading-6 text-[#25291C]">
                  {error}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={cargando}
                  className="min-h-14 bg-[#02111B] px-8 text-base font-semibold text-[#FCFCFC] transition hover:bg-[#5D737E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5D737E] disabled:cursor-wait disabled:opacity-60"
                >
                  {cargando ? 'Creando cuenta…' : 'Crear cuenta de autor'}
                </button>
                <p className="text-sm text-[#3F4045]">
                  ¿Ya tienes una cuenta?{' '}
                  <Link to="/login" className="font-semibold text-[#5D737E] underline underline-offset-4">
                    Inicia sesión
                  </Link>
                </p>
              </div>
            </form>}

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
