import { useState } from 'react'
import { Link } from 'react-router-dom'
import { crearUsuario } from '../autenticacion/solicitudes'
import { useAutenticacion } from '../autenticacion/useAutenticacion'
import { Marca } from '../components/Marca'

const FORMULARIO_INICIAL = {
  nombre: '',
  apellido: '',
  correo: '',
  institucion: '',
  contrasena: '',
  confirmarContrasena: '',
}

const ROLES = [
  { codigo: 'ADMIN', nombre: 'Administrador del sistema' },
  { codigo: 'COMITE', nombre: 'Miembro del comité científico' },
  { codigo: 'AUTOR', nombre: 'Autor' },
]

const CLASE_CAMPO =
  'input input-bordered mt-2 min-h-12 w-full rounded-none border-[#BDC2BF] bg-[#FCFCFC] px-4 text-[#02111B] outline-none transition placeholder:text-[#777B78] focus:border-[#5D737E] focus:ring-2 focus:ring-[#5D737E]/20'
const CLASE_ERROR = 'mt-1 block text-sm font-medium text-red-800'

function mostrarMensajes(mensajes) {
  return Array.isArray(mensajes) ? mensajes.join(' ') : mensajes
}

export function CrearUsuario() {
  const { sesion } = useAutenticacion()
  const [formulario, establecerFormulario] = useState(FORMULARIO_INICIAL)
  const [rolesSeleccionados, establecerRolesSeleccionados] = useState([])
  const [erroresCampo, establecerErroresCampo] = useState({})
  const [mensajeError, establecerMensajeError] = useState('')
  const [mensajeExito, establecerMensajeExito] = useState('')
  const [cargando, establecerCargando] = useState(false)
  const [mostrarContrasena, establecerMostrarContrasena] = useState(false)

  const rolesPermitidos = sesion.rolActivo === 'ADMIN'
    ? ROLES
    : ROLES.filter((rol) => rol.codigo !== 'ADMIN')

  function actualizarCampo(evento) {
    const { name, value } = evento.target
    establecerFormulario((actual) => ({ ...actual, [name]: value }))
    establecerErroresCampo((actuales) => ({ ...actuales, [name]: [] }))
    establecerMensajeError('')
    establecerMensajeExito('')
  }

  function alternarRol(codigo) {
    establecerRolesSeleccionados((actuales) => (
      actuales.includes(codigo)
        ? actuales.filter((rol) => rol !== codigo)
        : [...actuales, codigo]
    ))
    establecerErroresCampo((actuales) => ({ ...actuales, roles: [] }))
    establecerMensajeError('')
    establecerMensajeExito('')
  }

  function validarFormulario() {
    const errores = {}
    if (!formulario.nombre.trim()) errores.nombre = ['Ingresa el nombre.']
    if (!formulario.apellido.trim()) errores.apellido = ['Ingresa el apellido.']
    if (!formulario.correo.trim()) {
      errores.correo = ['Ingresa el correo electrónico.']
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulario.correo.trim())) {
      errores.correo = ['Ingresa un correo electrónico válido.']
    }
    if (!formulario.institucion.trim()) errores.institucion = ['Ingresa la institución o afiliación.']
    if (formulario.contrasena.length < 8) {
      errores.contrasena = ['La contraseña debe tener al menos 8 caracteres.']
    } else if (/^\d+$/.test(formulario.contrasena)) {
      errores.contrasena = ['La contraseña no puede estar formada solo por números.']
    }
    if (!formulario.confirmarContrasena) {
      errores.confirmarContrasena = ['Confirma la contraseña.']
    } else if (formulario.contrasena !== formulario.confirmarContrasena) {
      errores.confirmarContrasena = ['Las contraseñas no coinciden.']
    }
    if (rolesSeleccionados.length === 0) {
      errores.roles = ['Selecciona al menos un rol para el usuario.']
    }
    return errores
  }

  async function enviarFormulario(evento) {
    evento.preventDefault()
    establecerMensajeError('')
    establecerMensajeExito('')
    const errores = validarFormulario()
    establecerErroresCampo(errores)
    if (Object.keys(errores).length > 0) {
      establecerMensajeError('Revisa los campos indicados antes de crear el usuario.')
      return
    }

    establecerCargando(true)
    try {
      const usuario = await crearUsuario({
        token: sesion.tokenAcceso,
        ...formulario,
        roles: rolesSeleccionados,
      })
      const nombresRoles = ROLES
        .filter((rol) => usuario.roles?.includes(rol.codigo))
        .map((rol) => rol.nombre)
      establecerMensajeExito(
        `La cuenta de ${usuario.first_name} ${usuario.last_name} (${usuario.email}) se creó correctamente con el rol${nombresRoles.length === 1 ? '' : 'es'}: ${nombresRoles.join(', ')}.`,
      )
      establecerFormulario(FORMULARIO_INICIAL)
      establecerRolesSeleccionados([])
      establecerErroresCampo({})
      establecerMostrarContrasena(false)
    } catch (errorSolicitud) {
      establecerMensajeError(errorSolicitud.message || 'No se pudo crear el usuario. Inténtalo nuevamente.')
      establecerErroresCampo(errorSolicitud.erroresCampo ?? {})
    } finally {
      establecerCargando(false)
    }
  }

  const rutaPanel = sesion.rolActivo === 'ADMIN' ? '/admin' : '/comite'

  return (
    <div className="min-h-dvh bg-[#FCFCFC] text-[#02111B]">
      <header className="border-b border-[#BDC2BF] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to={rutaPanel} aria-label="Volver al panel">
            <Marca compacta />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-[#3F4045] sm:inline">{sesion.usuario.nombre}</span>
            <Link
              to={rutaPanel}
              className="border border-[#5D737E] px-4 py-2 font-semibold transition hover:bg-[#E3E7D3]"
            >
              Volver al panel
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100dvh-73px)] max-w-6xl lg:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.5fr)]">
        <aside className="relative overflow-hidden bg-[#02111B] px-6 py-9 text-[#FCFCFC] sm:px-10 lg:px-11 lg:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-14 h-64 w-64 rounded-full border border-[#5D737E]/40" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 top-28 h-40 w-40 rounded-full border border-[#BDC2BF]/30" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#BDC2BF]">Administración de cuentas</p>
            <h1 className="mt-5 max-w-sm font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              Crear usuario
            </h1>
            <p className="mt-4 max-w-md leading-7 text-[#BDC2BF]">
              Registra una cuenta institucional y asigna los roles que correspondan a sus responsabilidades en la conferencia.
            </p>
            <div className="mt-8 border-l-2 border-[#E6E49F] bg-[#30292F] p-4 text-sm leading-6">
              Esta herramienta es exclusiva para Administración y Comité científico. Los roles asignables se controlan también desde el servidor.
            </div>
            <div className="mt-8 border-t border-white/15 pt-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#989C94]">Roles disponibles</p>
              <ul className="mt-4 space-y-3">
                {rolesPermitidos.map((rol) => (
                  <li key={rol.codigo} className="flex items-start gap-3 text-sm text-[#FCFCFC]">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#E6E49F]" />
                    {rol.nombre}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        <section className="px-5 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-3xl">
            <Link
              to={rutaPanel}
              className="text-sm font-semibold text-[#5D737E] underline underline-offset-4"
            >
              ← Panel de {sesion.rolActivo === 'ADMIN' ? 'administración' : 'comité'}
            </Link>

            <div className="mt-6 border-b border-[#BDC2BF] pb-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5D737E]">Alta administrativa</p>
              <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Datos de la nueva cuenta</h2>
              <p className="mt-2 text-sm leading-6 text-[#3F4045]">
                El correo electrónico también será el nombre de usuario para iniciar sesión.
              </p>
            </div>

            {mensajeExito && (
              <div role="status" aria-live="polite" className="mt-6 flex items-start justify-between gap-4 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                <p>{mensajeExito}</p>
                <button type="button" onClick={() => establecerMensajeExito('')} aria-label="Cerrar mensaje de éxito" className="shrink-0 text-xl leading-none">×</button>
              </div>
            )}
            {mensajeError && (
              <div role="alert" aria-live="assertive" className="mt-6 flex items-start justify-between gap-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950">
                <div>
                  <p className="font-semibold">{mensajeError}</p>
                  {Object.entries(erroresCampo).some(([campo]) => campo !== 'confirmarContrasena') && (
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {Object.entries(erroresCampo)
                        .filter(([campo]) => campo !== 'confirmarContrasena')
                        .flatMap(([campo, mensajes]) => (Array.isArray(mensajes) ? mensajes : [mensajes]).map((mensaje) => `${campo}: ${mensaje}`))
                        .map((mensaje) => <li key={mensaje}>{mensaje}</li>)}
                    </ul>
                  )}
                </div>
                <button type="button" onClick={() => establecerMensajeError('')} aria-label="Cerrar mensaje de error" className="shrink-0 text-xl leading-none">×</button>
              </div>
            )}

            <form noValidate onSubmit={enviarFormulario} className="mt-7 space-y-7">
              <section aria-labelledby="datos-personales">
                <h3 id="datos-personales" className="font-display text-lg font-bold">Información personal</h3>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-semibold" htmlFor="nombre-usuario">
                    Nombre <span className="text-[#5D737E]">*</span>
                    <input
                      id="nombre-usuario"
                      name="nombre"
                      type="text"
                      autoComplete="given-name"
                      maxLength={150}
                      value={formulario.nombre}
                      onChange={actualizarCampo}
                      aria-invalid={Boolean(erroresCampo.nombre)}
                      className={CLASE_CAMPO}
                    />
                    {erroresCampo.nombre && <span className={CLASE_ERROR}>{mostrarMensajes(erroresCampo.nombre)}</span>}
                  </label>
                  <label className="block text-sm font-semibold" htmlFor="apellido-usuario">
                    Apellido <span className="text-[#5D737E]">*</span>
                    <input
                      id="apellido-usuario"
                      name="apellido"
                      type="text"
                      autoComplete="family-name"
                      maxLength={150}
                      value={formulario.apellido}
                      onChange={actualizarCampo}
                      aria-invalid={Boolean(erroresCampo.apellido)}
                      className={CLASE_CAMPO}
                    />
                    {erroresCampo.apellido && <span className={CLASE_ERROR}>{mostrarMensajes(erroresCampo.apellido)}</span>}
                  </label>
                  <label className="block text-sm font-semibold sm:col-span-2" htmlFor="correo-usuario">
                    Correo electrónico / nombre de usuario <span className="text-[#5D737E]">*</span>
                    <input
                      id="correo-usuario"
                      name="correo"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      value={formulario.correo}
                      onChange={actualizarCampo}
                      aria-invalid={Boolean(erroresCampo.correo)}
                      className={CLASE_CAMPO}
                      placeholder="nombre@institucion.edu"
                    />
                    {erroresCampo.correo && <span className={CLASE_ERROR}>{mostrarMensajes(erroresCampo.correo)}</span>}
                  </label>
                  <label className="block text-sm font-semibold sm:col-span-2" htmlFor="institucion-usuario">
                    Institución o afiliación <span className="text-[#5D737E]">*</span>
                    <input
                      id="institucion-usuario"
                      name="institucion"
                      type="text"
                      autoComplete="organization"
                      maxLength={150}
                      value={formulario.institucion}
                      onChange={actualizarCampo}
                      aria-invalid={Boolean(erroresCampo.institucion)}
                      className={CLASE_CAMPO}
                      placeholder="Universidad o centro de investigación"
                    />
                    {erroresCampo.institucion && <span className={CLASE_ERROR}>{mostrarMensajes(erroresCampo.institucion)}</span>}
                  </label>
                </div>
              </section>

              <section aria-labelledby="roles-usuario" className="border-y border-[#BDC2BF] py-6">
                <h3 id="roles-usuario" className="font-display text-lg font-bold">
                  Roles asignados <span className="text-[#5D737E]">*</span>
                </h3>
                <p className="mt-1 text-sm text-[#3F4045]">Puedes asignar uno o varios roles permitidos.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {rolesPermitidos.map((rol) => (
                    <label key={rol.codigo} className={`flex min-h-14 cursor-pointer items-start gap-3 border p-4 transition ${rolesSeleccionados.includes(rol.codigo) ? 'border-[#5D737E] bg-[#E3E7D3]' : 'border-[#BDC2BF] bg-white hover:bg-[#FCFCFC]'}`}>
                      <input
                        type="checkbox"
                        checked={rolesSeleccionados.includes(rol.codigo)}
                        onChange={() => alternarRol(rol.codigo)}
                        className="checkbox checkbox-primary mt-0.5 rounded-none"
                      />
                      <span className="text-sm font-semibold">{rol.nombre}</span>
                    </label>
                  ))}
                </div>
                {erroresCampo.roles && <p className={CLASE_ERROR}>{mostrarMensajes(erroresCampo.roles)}</p>}
              </section>

              <section aria-labelledby="contrasena-usuario">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 id="contrasena-usuario" className="font-display text-lg font-bold">Contraseña de acceso</h3>
                    <p className="mt-1 text-sm text-[#3F4045]">Usa al menos 8 caracteres; evita contraseñas comunes o solo numéricas.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => establecerMostrarContrasena((actual) => !actual)}
                    className="text-sm font-semibold text-[#5D737E] underline underline-offset-4"
                  >
                    {mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  </button>
                </div>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-semibold" htmlFor="contrasena-usuario-input">
                    Contraseña <span className="text-[#5D737E]">*</span>
                    <input
                      id="contrasena-usuario-input"
                      name="contrasena"
                      type={mostrarContrasena ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formulario.contrasena}
                      onChange={actualizarCampo}
                      aria-invalid={Boolean(erroresCampo.contrasena)}
                      className={CLASE_CAMPO}
                    />
                    {erroresCampo.contrasena && <span className={CLASE_ERROR}>{mostrarMensajes(erroresCampo.contrasena)}</span>}
                  </label>
                  <label className="block text-sm font-semibold" htmlFor="confirmar-contrasena-usuario">
                    Confirmar contraseña <span className="text-[#5D737E]">*</span>
                    <input
                      id="confirmar-contrasena-usuario"
                      name="confirmarContrasena"
                      type={mostrarContrasena ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formulario.confirmarContrasena}
                      onChange={actualizarCampo}
                      aria-invalid={Boolean(erroresCampo.confirmarContrasena)}
                      className={CLASE_CAMPO}
                    />
                    {erroresCampo.confirmarContrasena && <span className={CLASE_ERROR}>{mostrarMensajes(erroresCampo.confirmarContrasena)}</span>}
                  </label>
                </div>
              </section>

              <div className="flex flex-col-reverse gap-3 border-t border-[#BDC2BF] pt-6 sm:flex-row sm:justify-end">
                <Link to={rutaPanel} className="inline-flex min-h-12 items-center justify-center border border-[#5D737E] px-6 font-semibold transition hover:bg-[#E3E7D3]">
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={cargando}
                  className="min-h-12 border border-[#02111B] bg-[#02111B] px-7 font-semibold text-white transition hover:bg-[#5D737E] disabled:cursor-wait disabled:opacity-60"
                >
                  {cargando ? 'Creando usuario…' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
