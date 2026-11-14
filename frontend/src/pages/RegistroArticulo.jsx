import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useAutenticacion } from '../autenticacion/useAutenticacion'
import { obtenerContextoArticulos, registrarArticulo } from '../autenticacion/solicitudes'
import { Marca } from '../components/Marca'

const claseCampo =
  'input input-bordered mt-2 min-h-12 w-full rounded-none border-slate-300 bg-slate-100 px-4 text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-slate-600 focus:bg-white focus:ring-2 focus:ring-slate-500/20'
const claseErrorCampo = 'mt-2 text-sm font-medium text-red-700'

const CLAVE_AUTOR_REGISTRADOR = 'autor-registrador'

function nuevoAutor(clave, datos = {}) {
  return {
    clave,
    nombres: datos.nombres ?? '',
    apellidos: datos.apellidos ?? '',
    email: datos.email ?? '',
    institucion: datos.institucion ?? '',
    responsable: datos.responsable ?? false,
  }
}

function fechaLegible(fecha) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function RegistroArticulo() {
  const { sesion } = useAutenticacion()
  const [contexto, establecerContexto] = useState(null)
  const [cargando, establecerCargando] = useState(true)
  const [estadoEnvio, establecerEstadoEnvio] = useState('inactivo')
  const [mensajeExito, establecerMensajeExito] = useState('')
  const [mensajeError, establecerMensajeError] = useState('')
  const [erroresCampos, establecerErroresCampos] = useState({})
  const [articuloCreado, establecerArticuloCreado] = useState(null)
  const [siguienteId, establecerSiguienteId] = useState(1)
  const {
    control,
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: {
      convocatoriaId: '',
      lineaTematica: '',
      titulo: '',
      resumen: '',
      palabrasClave: '',
      responsableClave: CLAVE_AUTOR_REGISTRADOR,
      autores: [nuevoAutor(CLAVE_AUTOR_REGISTRADOR, { responsable: true })],
    },
  })
  const { fields: autores, append, remove } = useFieldArray({
    control,
    name: 'autores',
  })
  const valoresFormulario = useWatch({ control })
  const autoresActuales = valoresFormulario.autores ?? []
  const responsableClave = valoresFormulario.responsableClave

  useEffect(() => {
    let vigente = true
    obtenerContextoArticulos(sesion.tokenAcceso)
      .then((datos) => {
        if (!vigente) return
        establecerContexto(datos)
        const convocatoriaInicial = datos.convocatorias.find(
          (convocatoria) => convocatoria.postulaciones_abiertas,
        )
        const autorRegistrador = nuevoAutor(CLAVE_AUTOR_REGISTRADOR, {
          ...datos.autor_actual,
          responsable: true,
        })
        reset({
          convocatoriaId: String(convocatoriaInicial?.id ?? ''),
          lineaTematica: String(convocatoriaInicial?.lineas_tematicas[0]?.id ?? ''),
          titulo: '',
          resumen: '',
          palabrasClave: '',
          responsableClave: CLAVE_AUTOR_REGISTRADOR,
          autores: [autorRegistrador],
        })
      })
      .catch((errorCarga) => {
        if (vigente) establecerMensajeError(errorCarga.message)
      })
      .finally(() => {
        if (vigente) establecerCargando(false)
      })

    return () => {
      vigente = false
    }
  }, [reset, sesion.tokenAcceso])

  const convocatoriasAbiertas = contexto?.convocatorias.filter(
    (convocatoria) => convocatoria.postulaciones_abiertas,
  ) ?? []
  const convocatoriaSeleccionada = convocatoriasAbiertas.find(
    (convocatoria) => String(convocatoria.id) === valoresFormulario.convocatoriaId,
  )
  const lineasDisponibles = convocatoriaSeleccionada?.lineas_tematicas ?? []
  const datosAutorActualCompletos = Boolean(
    contexto?.autor_actual?.nombres?.trim()
      && contexto?.autor_actual?.apellidos?.trim()
      && contexto?.autor_actual?.email?.trim()
      && contexto?.autor_actual?.institucion?.trim(),
  )

  function cambiarConvocatoria(valor) {
    setValue('convocatoriaId', valor, { shouldDirty: true })
    const convocatoria = convocatoriasAbiertas.find(
      (opcion) => String(opcion.id) === valor,
    )
    setValue('lineaTematica', String(convocatoria?.lineas_tematicas[0]?.id ?? ''), {
      shouldDirty: true,
    })
    clearErrors('lineaTematica')
  }

  function agregarAutor() {
    append(nuevoAutor(`coautor-${siguienteId}`))
    establecerSiguienteId((actual) => actual + 1)
  }

  function quitarAutor(indice) {
    if (indice === 0) return
    const autor = autoresActuales[indice]
    if (autor?.clave === responsableClave) {
      setValue('responsableClave', autoresActuales[0].clave, {
        shouldValidate: true,
        shouldDirty: true,
      })
    }
    remove(indice)
  }

  function enviarFormularioInvalido(erroresFormulario) {
    const campos = {}
    function recopilar(errores, ruta = '') {
      if (!errores || typeof errores !== 'object') return
      if (typeof errores.message === 'string') {
        campos[ruta] = errores.message
        return
      }
      for (const [clave, valor] of Object.entries(errores)) {
        if (['ref', 'type', 'types'].includes(clave)) continue
        recopilar(valor, ruta ? `${ruta}.${clave}` : clave)
      }
    }

    recopilar(erroresFormulario)
    establecerErroresCampos(campos)
    establecerMensajeError('Revisa los campos señalados antes de enviar la propuesta.')
    establecerMensajeExito('')
    establecerEstadoEnvio('error')
  }

  async function enviarFormulario(datos) {
    establecerMensajeError('')
    establecerMensajeExito('')
    establecerErroresCampos({})
    clearErrors()
    establecerEstadoEnvio('enviando')
    try {
      const creado = await registrarArticulo({
        token: sesion.tokenAcceso,
        ...datos,
      })
      const tituloRegistrado = creado.titulo ?? datos.titulo.trim()
      establecerArticuloCreado({
        ...creado,
        titulo: tituloRegistrado,
        convocatoria: convocatoriaSeleccionada.nombre,
        linea_tematica: {
          nombre: lineasDisponibles.find(
            (linea) => String(linea.id) === datos.lineaTematica,
          )?.nombre ?? '',
        },
        fecha_limite_postulaciones: convocatoriaSeleccionada.fecha_limite_postulaciones,
      })
      establecerMensajeExito(
        creado.mensaje || `El artículo "${tituloRegistrado}" se registró correctamente y fue enviado.`,
      )
      establecerEstadoEnvio('exitoso')
    } catch (errorRegistro) {
      const campos = errorRegistro?.erroresCampos ?? {}
      establecerErroresCampos(campos)
      Object.entries(campos).forEach(([campo, mensaje]) => {
        if (campo !== 'autores') {
          setError(campo, { type: 'servidor', message: mensaje })
        }
      })
      establecerMensajeError(
        errorRegistro?.message || 'Ocurrió un error inesperado al registrar el artículo. Inténtalo nuevamente.',
      )
      establecerEstadoEnvio('error')
    }
  }

  return (
    <div className="relative min-h-dvh bg-[url('/fondo-crear-articulo.jpg')] bg-cover bg-center bg-fixed font-sans text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/90 via-slate-50/85 to-slate-100/80"
      />
      <header className="relative border-b border-white/70 bg-white/85 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Marca compacta />
          <nav aria-label="Navegación de autor" className="flex items-center gap-4 text-sm">
            <span className="hidden font-medium text-slate-600 sm:inline">{sesion.usuario.nombre}</span>
            <Link
              to="/autor"
              className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
            >
              Volver al panel
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          to="/autor"
          className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
        >
          <span aria-hidden="true">←</span> Panel de autor
        </Link>

        {articuloCreado ? (
          <section aria-labelledby="registro-exitoso" className="mt-8 rounded-3xl border border-white/80 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-10">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Propuesta recibida
            </span>
            <h1 id="registro-exitoso" className="mt-3 font-display text-3xl font-extrabold text-slate-950 sm:text-4xl">
              Artículo registrado
            </h1>
            <p role="status" aria-live="polite" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
              {mensajeExito}
            </p>
            <dl className="mt-7 grid gap-4 border-y border-slate-200 py-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Título</dt>
                <dd className="mt-1 font-semibold">{articuloCreado.titulo}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Convocatoria</dt>
                <dd className="mt-1 font-semibold">{articuloCreado.convocatoria}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Línea temática</dt>
                <dd className="mt-1 font-semibold">{articuloCreado.linea_tematica.nombre}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha límite</dt>
                <dd className="mt-1 font-semibold">{fechaLegible(articuloCreado.fecha_limite_postulaciones)}</dd>
              </div>
            </dl>
            <Link
              to="/autor"
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-6 font-semibold text-white shadow-lg transition hover:bg-slate-700"
            >
              Volver al panel de autor
            </Link>
          </section>
        ) : (
          <>
            <div className="relative mt-7 overflow-hidden rounded-none bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-2xl sm:px-10 sm:py-11">
              <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10 sm:right-8 sm:top-1/2 sm:-translate-y-1/2">
                <div className="absolute inset-5 rounded-full border border-white/10" />
                <div className="absolute inset-10 rounded-full border border-white/10" />
              </div>
              <div className="relative max-w-3xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-slate-200">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                  Convocatorias científicas
                </p>
                <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
                  Registrar un artículo
                </h1>
                <p className="mt-3 max-w-2xl leading-relaxed text-slate-300">
                  Completa la información de la propuesta, selecciona su línea temática y registra a todos sus autores.
                </p>
              </div>
            </div>

            {cargando ? (
              <p role="status" className="mt-8 rounded-2xl border border-white/80 bg-white/95 p-5 text-slate-600 shadow-xl">
                Cargando convocatorias disponibles…
              </p>
            ) : mensajeError && !contexto ? (
              <p role="alert" className="alert alert-error mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900 shadow-xl">
                {mensajeError}
              </p>
            ) : convocatoriasAbiertas.length === 0 ? (
              <section className="mt-8 rounded-2xl border border-white/80 border-l-4 border-l-slate-700 bg-white/95 p-5 shadow-xl sm:p-7">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  {contexto?.convocatorias.length
                    ? 'No hay postulaciones abiertas'
                    : 'No hay convocatorias configuradas'}
                </h2>
                <p className="mt-2 leading-relaxed text-slate-600">
                  {contexto?.convocatorias.length
                    ? `El plazo de la convocatoria vigente terminó el ${fechaLegible(contexto.convocatorias[0].fecha_limite_postulaciones)}.`
                    : 'El comité o un administrador debe crear una conferencia, configurar su plazo de postulación y agregar líneas temáticas. Luego vuelve a cargar esta página.'}
                </p>
              </section>
            ) : lineasDisponibles.length === 0 ? (
              <section className="mt-8 rounded-2xl border border-white/80 border-l-4 border-l-slate-700 bg-white/95 p-5 shadow-xl sm:p-7">
                <h2 className="font-display text-xl font-bold text-slate-900">No hay líneas temáticas disponibles</h2>
                <p className="mt-2 text-slate-600">
                  La convocatoria está abierta, pero aún no tiene líneas temáticas habilitadas.
                </p>
              </section>
            ) : (
              <form noValidate onSubmit={handleSubmit(enviarFormulario, enviarFormularioInvalido)} className="mt-7 space-y-6">
                <section aria-labelledby="datos-articulo" className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-xl backdrop-blur-sm sm:p-8">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 4.75A2.75 2.75 0 0 1 7.75 2H20v17H7.75A2.75 2.75 0 0 0 5 21.75m0-17v17m0-17h11M8.5 7h8m-8 3.5h8" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">01 · Información académica</p>
                      <h2 id="datos-articulo" className="mt-1 font-display text-xl font-bold text-slate-950 sm:text-2xl">
                        Datos de la propuesta
                      </h2>
                    </div>
                  </div>
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor="titulo-articulo" className="text-sm font-semibold">
                        Nombre del artículo <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="titulo-articulo"
                        type="text"
                        maxLength={255}
                        aria-invalid={Boolean(errors.titulo)}
                        {...register('titulo', {
                          required: 'El título del artículo es obligatorio.',
                          validate: (valor) => valor.trim() !== '' || 'El título no puede contener solo espacios.',
                          maxLength: { value: 255, message: 'El título no puede superar los 255 caracteres.' },
                        })}
                        placeholder="Escribe el título de tu propuesta"
                        className={claseCampo}
                      />
                      {errors.titulo && <p className={claseErrorCampo}>{errors.titulo.message}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="resumen-articulo" className="text-sm font-semibold">
                        Resumen <span aria-hidden="true">*</span>
                      </label>
                      <textarea
                        id="resumen-articulo"
                        rows={5}
                        aria-invalid={Boolean(errors.resumen)}
                        {...register('resumen', {
                          required: 'El resumen del artículo es obligatorio.',
                          validate: (valor) => valor.trim() !== '' || 'El resumen no puede contener solo espacios.',
                        })}
                        placeholder="Describe brevemente el objetivo y aporte de la propuesta"
                        className={`textarea textarea-bordered mt-2 min-h-36 w-full rounded-none border-slate-300 bg-slate-100 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-slate-600 focus:bg-white focus:ring-2 focus:ring-slate-500/20 ${errors.resumen ? 'textarea-error' : ''}`}
                      />
                      {errors.resumen && <p className={claseErrorCampo}>{errors.resumen.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="palabras-clave" className="text-sm font-semibold">
                        Palabras clave <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="palabras-clave"
                        type="text"
                        aria-invalid={Boolean(errors.palabrasClave)}
                        {...register('palabrasClave', {
                          required: 'Ingresa al menos una palabra clave.',
                          validate: (valor) => valor.trim() !== '' || 'Ingresa al menos una palabra clave.',
                        })}
                        placeholder="Separadas por comas"
                        className={claseCampo}
                      />
                      {errors.palabrasClave && (
                        <p className={claseErrorCampo}>{errors.palabrasClave.message}</p>
                      )}
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="convocatoria" className="text-sm font-semibold">
                          Convocatoria <span aria-hidden="true">*</span>
                        </label>
                        <select
                          id="convocatoria"
                          aria-invalid={Boolean(errors.convocatoriaId)}
                          {...register('convocatoriaId', {
                            required: 'Selecciona una convocatoria con postulaciones abiertas.',
                          })}
                          onChange={(evento) => cambiarConvocatoria(evento.target.value)}
                          className="select select-bordered mt-2 min-h-12 w-full rounded-none border-slate-300 bg-slate-100 text-slate-900 focus:border-slate-600 focus:bg-white"
                        >
                          {convocatoriasAbiertas.map((convocatoria) => (
                            <option key={convocatoria.id} value={convocatoria.id}>
                              {convocatoria.nombre}
                            </option>
                          ))}
                        </select>
                          {errors.convocatoriaId && (
                            <p className={claseErrorCampo}>{errors.convocatoriaId.message}</p>
                          )}
                        {convocatoriaSeleccionada && (
                          <p className="mt-2 text-xs text-slate-500">
                            Fecha límite: {fechaLegible(convocatoriaSeleccionada.fecha_limite_postulaciones)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="linea-tematica" className="text-sm font-semibold">
                          Línea temática <span aria-hidden="true">*</span>
                        </label>
                        <select
                          id="linea-tematica"
                          aria-invalid={Boolean(errors.lineaTematica)}
                          {...register('lineaTematica', {
                            required: 'Selecciona una línea temática habilitada.',
                          })}
                          className="select select-bordered mt-2 min-h-12 w-full rounded-none border-slate-300 bg-slate-100 text-slate-900 focus:border-slate-600 focus:bg-white"
                        >
                          {lineasDisponibles.map((linea) => (
                            <option key={linea.id} value={linea.id}>{linea.nombre}</option>
                          ))}
                        </select>
                        {errors.lineaTematica && (
                          <p className={claseErrorCampo}>{errors.lineaTematica.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section aria-labelledby="datos-autores" className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-xl backdrop-blur-sm sm:p-8">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-slate-800">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M14 3.13a4 4 0 0 1 0 7.75M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">02 · Equipo de investigación</p>
                        <h2 id="datos-autores" className="mt-1 font-display text-xl font-bold text-slate-950 sm:text-2xl">
                          Autores del artículo
                        </h2>
                        <p className="mt-1 max-w-xl text-sm text-slate-600">
                          Agrega a todos los autores e identifica quién gestionará las versiones.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={agregarAutor}
                      className="btn min-h-11 rounded-xl border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-500 hover:bg-slate-50"
                    >
                      + Agregar autor
                    </button>
                  </div>

                  {!datosAutorActualCompletos && (
                    <p role="alert" className="alert alert-warning mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                      Completa tu nombre, apellido y afiliación universitaria en tu perfil antes de registrar el artículo.
                    </p>
                  )}

                  <div className="mt-6 space-y-4">
                    {autores.map((autor, indice) => (
                      <fieldset key={autor.id} className="card rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm sm:p-7">
                        <legend className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-bold text-slate-700">
                          Autor {String(indice + 1).padStart(2, '0')}
                        </legend>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <label htmlFor={`autor-nombres-${autor.clave}`} className="text-sm font-semibold">
                              Nombres <span aria-hidden="true">*</span>
                            </label>
                            <input
                              id={`autor-nombres-${autor.clave}`}
                              type="text"
                              maxLength={150}
                              autoComplete="given-name"
                              readOnly={indice === 0}
                              aria-invalid={Boolean(errors.autores?.[indice]?.nombres)}
                              {...register(`autores.${indice}.nombres`, {
                                required: 'Los nombres son obligatorios.',
                                validate: (valor) => valor.trim() !== '' || 'Los nombres no pueden contener solo espacios.',
                              })}
                              placeholder="Nombres"
                              className={claseCampo}
                            />
                            {errors.autores?.[indice]?.nombres && (
                              <p className={claseErrorCampo}>{errors.autores[indice].nombres.message}</p>
                            )}
                          </div>
                          <div>
                            <label htmlFor={`autor-apellidos-${autor.clave}`} className="text-sm font-semibold">
                              Apellidos <span aria-hidden="true">*</span>
                            </label>
                            <input
                              id={`autor-apellidos-${autor.clave}`}
                              type="text"
                              maxLength={150}
                              autoComplete="family-name"
                              readOnly={indice === 0}
                              aria-invalid={Boolean(errors.autores?.[indice]?.apellidos)}
                              {...register(`autores.${indice}.apellidos`, {
                                required: 'Los apellidos son obligatorios.',
                                validate: (valor) => valor.trim() !== '' || 'Los apellidos no pueden contener solo espacios.',
                              })}
                              placeholder="Apellidos"
                              className={claseCampo}
                            />
                            {errors.autores?.[indice]?.apellidos && (
                              <p className={claseErrorCampo}>{errors.autores[indice].apellidos.message}</p>
                            )}
                          </div>
                          <div>
                            <label htmlFor={`autor-email-${autor.clave}`} className="text-sm font-semibold">
                              Correo electrónico <span aria-hidden="true">*</span>
                            </label>
                            <input
                              id={`autor-email-${autor.clave}`}
                              type="email"
                              maxLength={254}
                              autoComplete="email"
                              readOnly={indice === 0}
                              aria-invalid={Boolean(errors.autores?.[indice]?.email)}
                              {...register(`autores.${indice}.email`, {
                                required: 'El correo electrónico es obligatorio.',
                                pattern: {
                                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                  message: 'Ingresa un correo electrónico válido.',
                                },
                                validate: (valor) => (
                                  autoresActuales.every(
                                    (otroAutor, otroIndice) => (
                                      otroIndice === indice
                                      || otroAutor.email.trim().toLowerCase() !== valor.trim().toLowerCase()
                                    ),
                                  ) || 'Cada autor debe tener un correo electrónico diferente.'
                                ),
                              })}
                              placeholder="autor@universidad.edu"
                              className={claseCampo}
                            />
                            {errors.autores?.[indice]?.email && (
                              <p className={claseErrorCampo}>{errors.autores[indice].email.message}</p>
                            )}
                          </div>
                          <div>
                            <label htmlFor={`autor-afiliacion-${autor.clave}`} className="text-sm font-semibold">
                              Afiliación universitaria <span aria-hidden="true">*</span>
                            </label>
                            <input
                              id={`autor-afiliacion-${autor.clave}`}
                              type="text"
                              maxLength={200}
                              autoComplete="organization"
                              readOnly={indice === 0}
                              aria-invalid={Boolean(errors.autores?.[indice]?.institucion)}
                              {...register(`autores.${indice}.institucion`, {
                                required: 'La afiliación universitaria es obligatoria.',
                                validate: (valor) => valor.trim() !== '' || 'La afiliación no puede contener solo espacios.',
                              })}
                              placeholder="Universidad o institución"
                              className={claseCampo}
                            />
                            {errors.autores?.[indice]?.institucion && (
                              <p className={claseErrorCampo}>
                                {errors.autores[indice].institucion.message}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
                          <label className="flex cursor-pointer items-start gap-3 text-sm">
                            <input
                              type="radio"
                              value={autor.clave}
                              checked={responsableClave === autor.clave}
                              {...register('responsableClave', {
                                required: 'Selecciona un autor responsable de las versiones.',
                                validate: (clave) => (
                                  autoresActuales.some((autorActual) => autorActual.clave === clave)
                                  || 'Selecciona un autor responsable de las versiones.'
                                ),
                              })}
                              onChange={() => setValue('responsableClave', autor.clave, {
                                shouldValidate: true,
                                shouldDirty: true,
                              })}
                              className="radio radio-primary mt-0.5"
                            />
                            <span>
                              <span className="block font-semibold text-slate-900">Responsable de versiones</span>
                              <span className="mt-1 block text-slate-600">
                                Cargará y gestionará las versiones del artículo.
                              </span>
                            </span>
                          </label>
                          {indice > 0 && (
                            <button
                              type="button"
                              onClick={() => quitarAutor(indice)}
                              className="btn btn-ghost btn-sm rounded-lg text-sm font-semibold text-red-700 hover:bg-red-50"
                              aria-label={`Quitar autor ${indice + 1}`}
                            >
                              Quitar autor
                            </button>
                          )}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                  {errors.responsableClave && (
                    <p role="alert" className={claseErrorCampo}>
                      {errors.responsableClave.message}
                    </p>
                  )}
                  <p className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-slate-700">
                    Los coautores pueden participar aunque no tengan una cuenta en la plataforma.
                  </p>
                </section>

                {mensajeError && (
                  <div role="alert" aria-live="assertive" className="alert alert-error items-start rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
                    <div className="w-full">
                      <p className="font-bold">{mensajeError}</p>
                      {Object.keys(erroresCampos).length > 0 && (
                        <ul className="mt-2 list-inside list-disc space-y-1">
                          {[...new Set(Object.values(erroresCampos))].map((mensaje) => (
                            <li key={mensaje}>{mensaje}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex flex-col-reverse gap-3 border-t border-white/80 pt-6 sm:flex-row sm:justify-end">
                  <Link
                    to="/autor"
                    className="inline-flex min-h-12 items-center justify-center rounded-none border border-slate-300 bg-white/90 px-6 font-semibold text-slate-700 transition hover:bg-white"
                  >
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    disabled={estadoEnvio === 'enviando' || !valoresFormulario.lineaTematica || !datosAutorActualCompletos}
                    className="btn min-h-12 rounded-none border-slate-900 bg-slate-900 px-7 font-semibold text-white shadow-lg transition hover:border-slate-700 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {estadoEnvio === 'enviando' ? 'Registrando artículo…' : 'Registrar propuesta'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  )
}
