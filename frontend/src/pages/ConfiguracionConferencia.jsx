import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAutenticacion } from '../autenticacion/useAutenticacion'
import {
  guardarLineaTematica,
  guardarPlazoConferencia,
  obtenerConferenciasConfigurables,
  obtenerConfiguracionConferencia,
} from '../autenticacion/solicitudes'
import { Marca } from '../components/Marca'

const ETAPAS = [
  { tipo: 'POSTULACION', nombre: 'Postulación de artículos' },
  { tipo: 'EVALUACION', nombre: 'Evaluación por el comité científico' },
  { tipo: 'VERSIONES_CORREGIDAS', nombre: 'Entrega de versiones corregidas' },
  { tipo: 'PRESENTACION', nombre: 'Presentación en la conferencia' },
  { tipo: 'DOCUMENTOS_FINALES', nombre: 'Documentos finales para publicación' },
]

const PLAZO_VACIO = {
  id_plazo: null,
  tipo_plazo: '',
  fecha_inicio: '',
  fecha_fin: '',
  descripcion: '',
}

const campo =
  'input input-bordered mt-2 min-h-12 w-full rounded-none border-line bg-panel px-4 text-fg outline-none transition focus:border-highlight focus:ring-2 focus:ring-highlight/20'
const etiqueta = 'text-sm font-semibold text-fg'
const mensajeCampo = 'mt-2 text-sm font-medium text-red-700'

function aFechaLocal(valor) {
  if (!valor) return ''
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return ''
  const desfase = fecha.getTimezoneOffset() * 60000
  return new Date(fecha.getTime() - desfase).toISOString().slice(0, 16)
}

function aFechaApi(valor) {
  return new Date(valor).toISOString()
}

function mensajesDeError(error) {
  const datos = error?.erroresCampos
  if (!datos || typeof datos !== 'object') return []
  const mensajes = []
  function recorrer(valor) {
    if (typeof valor === 'string') mensajes.push(valor)
    else if (Array.isArray(valor)) valor.forEach(recorrer)
    else if (valor && typeof valor === 'object') Object.values(valor).forEach(recorrer)
  }
  recorrer(datos)
  return [...new Set(mensajes)]
}

function validarPlazos(plazos) {
  for (const etapa of ETAPAS) {
    const plazo = plazos.find((fila) => fila.tipo_plazo === etapa.tipo)
    if (!plazo?.fecha_inicio || !plazo?.fecha_fin) {
      return `Completa las fechas de inicio y fin para «${etapa.nombre}».`
    }
    if (new Date(plazo.fecha_fin) <= new Date(plazo.fecha_inicio)) {
      return `La fecha de fin de «${etapa.nombre}» debe ser posterior a su fecha de inicio.`
    }
  }

  for (let indice = 1; indice < ETAPAS.length; indice += 1) {
    const anterior = plazos.find((fila) => fila.tipo_plazo === ETAPAS[indice - 1].tipo)
    const actual = plazos.find((fila) => fila.tipo_plazo === ETAPAS[indice].tipo)
    if (new Date(actual.fecha_inicio) <= new Date(anterior.fecha_fin)) {
      return `«${ETAPAS[indice].nombre}» debe iniciar después de que termine «${ETAPAS[indice - 1].nombre}».`
    }
  }
  return ''
}

function plazosIniciales(plazos) {
  return ETAPAS.map((etapa) => {
    const existente = plazos.find((plazo) => plazo.tipo_plazo === etapa.tipo)
    return existente
      ? {
          ...existente,
          fecha_inicio: aFechaLocal(existente.fecha_inicio),
          fecha_fin: aFechaLocal(existente.fecha_fin),
        }
      : { ...PLAZO_VACIO, tipo_plazo: etapa.tipo }
  })
}

export function ConfiguracionConferencia() {
  const { sesion } = useAutenticacion()
  const [conferencias, establecerConferencias] = useState([])
  const [idSeleccionado, establecerIdSeleccionado] = useState('')
  const [plazos, establecerPlazos] = useState(plazosIniciales([]))
  const [lineas, establecerLineas] = useState([])
  const [borradorLinea, establecerBorradorLinea] = useState({ nombre: '', descripcion: '' })
  const [lineaEnEdicion, establecerLineaEnEdicion] = useState(null)
  const [cargandoConferencias, establecerCargandoConferencias] = useState(true)
  const [idConfiguracionCargada, establecerIdConfiguracionCargada] = useState('')
  const [guardandoPlazos, establecerGuardandoPlazos] = useState(false)
  const [guardandoLinea, establecerGuardandoLinea] = useState(false)
  const [error, establecerError] = useState('')
  const [erroresBackend, establecerErroresBackend] = useState([])
  const [exito, establecerExito] = useState('')
  const [errorCronologia, establecerErrorCronologia] = useState('')
  const [errorLinea, establecerErrorLinea] = useState('')

  const conferenciaSeleccionada = useMemo(
    () => conferencias.find((conferencia) => String(conferencia.id_conferencia) === idSeleccionado),
    [conferencias, idSeleccionado],
  )
  const cargandoConfiguracion = Boolean(idSeleccionado)
    && idConfiguracionCargada !== idSeleccionado

  useEffect(() => {
    let vigente = true
    obtenerConferenciasConfigurables(sesion.tokenAcceso)
      .then((datos) => {
        if (!vigente) return
        establecerConferencias(datos)
        establecerIdSeleccionado(String(datos[0]?.id_conferencia ?? ''))
      })
      .catch((errorCarga) => {
        if (vigente) establecerError(errorCarga.message)
      })
      .finally(() => {
        if (vigente) establecerCargandoConferencias(false)
      })
    return () => {
      vigente = false
    }
  }, [sesion.tokenAcceso])

  useEffect(() => {
    if (!idSeleccionado) return undefined
    let vigente = true
    obtenerConfiguracionConferencia(idSeleccionado, sesion.tokenAcceso)
      .then((datos) => {
        if (!vigente) return
        establecerPlazos(plazosIniciales(datos.plazos))
        establecerLineas(datos.lineas)
      })
      .catch((errorCarga) => {
        if (vigente) establecerError(errorCarga.message)
      })
      .finally(() => {
        if (vigente) establecerIdConfiguracionCargada(idSeleccionado)
      })
    return () => {
      vigente = false
    }
  }, [idSeleccionado, sesion.tokenAcceso])

  function actualizarPlazo(indice, campoPlazo, valor) {
    establecerPlazos((actuales) => actuales.map((plazo, indicePlazo) => (
      indicePlazo === indice ? { ...plazo, [campoPlazo]: valor } : plazo
    )))
    establecerErrorCronologia('')
    establecerError('')
    establecerExito('')
  }

  function cambiarConferencia(id) {
    establecerPlazos(plazosIniciales([]))
    establecerLineas([])
    establecerIdConfiguracionCargada('')
    establecerError('')
    establecerExito('')
    establecerIdSeleccionado(id)
  }

  async function guardarPlazos(evento) {
    evento.preventDefault()
    const errorValidacion = validarPlazos(plazos)
    if (errorValidacion) {
      establecerErrorCronologia(errorValidacion)
      establecerError('')
      establecerExito('')
      return
    }

    establecerGuardandoPlazos(true)
    establecerError('')
    establecerErroresBackend([])
    establecerErrorCronologia('')
    establecerExito('')
    try {
      const actualizados = [...plazos]
      for (let indice = 0; indice < ETAPAS.length; indice += 1) {
        const plazo = actualizados[indice]
        const guardado = await guardarPlazoConferencia(idSeleccionado, {
          ...(plazo.id_plazo ? { id_plazo: plazo.id_plazo } : {}),
          tipo_plazo: plazo.tipo_plazo,
          fecha_inicio: aFechaApi(plazo.fecha_inicio),
          fecha_fin: aFechaApi(plazo.fecha_fin),
          descripcion: plazo.descripcion.trim(),
        }, sesion.tokenAcceso)
        actualizados[indice] = {
          ...guardado,
          fecha_inicio: aFechaLocal(guardado.fecha_inicio),
          fecha_fin: aFechaLocal(guardado.fecha_fin),
        }
        establecerPlazos([...actualizados])
      }
      establecerExito('Los cinco plazos de la conferencia se guardaron correctamente.')
    } catch (errorGuardado) {
      establecerError(errorGuardado.message)
      establecerErroresBackend(mensajesDeError(errorGuardado))
    } finally {
      establecerGuardandoPlazos(false)
    }
  }

  function iniciarEdicion(linea) {
    establecerLineaEnEdicion(linea.id_linea)
    establecerBorradorLinea({ nombre: linea.nombre, descripcion: linea.descripcion ?? '' })
    establecerErrorLinea('')
    establecerExito('')
  }

  function cancelarEdicion() {
    establecerLineaEnEdicion(null)
    establecerBorradorLinea({ nombre: '', descripcion: '' })
    establecerErrorLinea('')
  }

  async function guardarLinea(evento) {
    evento.preventDefault()
    if (!borradorLinea.nombre.trim()) {
      establecerErrorLinea('El nombre de la línea temática es obligatorio.')
      return
    }
    establecerGuardandoLinea(true)
    establecerErrorLinea('')
    establecerError('')
    establecerErroresBackend([])
    establecerExito('')
    try {
      const linea = await guardarLineaTematica(idSeleccionado, {
        ...(lineaEnEdicion ? { id_linea: lineaEnEdicion } : {}),
        nombre: borradorLinea.nombre.trim(),
        descripcion: borradorLinea.descripcion.trim(),
        habilitada: true,
      }, sesion.tokenAcceso)
      establecerLineas((actuales) => (
        lineaEnEdicion
          ? actuales.map((actual) => actual.id_linea === linea.id_linea ? linea : actual)
          : [...actuales, linea].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      ))
      cancelarEdicion()
      establecerExito(`La línea temática «${linea.nombre}» se guardó correctamente.`)
    } catch (errorGuardado) {
      establecerErrorLinea(errorGuardado.message)
      establecerErroresBackend(mensajesDeError(errorGuardado))
    } finally {
      establecerGuardandoLinea(false)
    }
  }

  async function cambiarEstadoLinea(linea) {
    establecerGuardandoLinea(true)
    establecerError('')
    establecerExito('')
    try {
      const actualizada = await guardarLineaTematica(idSeleccionado, {
        id_linea: linea.id_linea,
        habilitada: !linea.habilitada,
      }, sesion.tokenAcceso)
      establecerLineas((actuales) => actuales.map((actual) => (
        actual.id_linea === actualizada.id_linea ? actualizada : actual
      )))
      establecerExito(`La línea temática «${linea.nombre}» se ${actualizada.habilitada ? 'habilitó' : 'desactivó'} correctamente.`)
    } catch (errorGuardado) {
      establecerError(errorGuardado.message)
      establecerErroresBackend(mensajesDeError(errorGuardado))
    } finally {
      establecerGuardandoLinea(false)
    }
  }

  return (
    <div className="min-h-dvh bg-page font-sans text-fg">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Marca compacta />
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted sm:inline">{sesion.usuario.nombre}</span>
            <Link to={sesion.rolActivo === 'ADMIN' ? '/admin' : '/comite'} className="border border-line px-4 py-2 font-semibold transition hover:bg-soft">
              Volver al panel
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">Administración académica</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
          Configuración de conferencia
        </h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          Administra los periodos del proceso científico y las líneas temáticas de cada conferencia activa.
        </p>

        {error && (
          <div role="alert" className="alert alert-error mt-6 rounded-none border border-red-200 bg-red-50 text-red-900">
            <div>
              <p className="font-bold">{error}</p>
              {erroresBackend.length > 0 && (
                <ul className="mt-2 list-inside list-disc">
                  {erroresBackend.map((mensaje, indice) => <li key={`${indice}-${mensaje}`}>{mensaje}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}
        {exito && (
          <p role="status" aria-live="polite" className="alert alert-success mt-6 rounded-none border border-emerald-200 bg-emerald-50 text-emerald-900">
            {exito}
          </p>
        )}

        {cargandoConferencias ? (
          <p role="status" className="mt-8 border border-line bg-panel p-5 text-muted">Cargando conferencias activas…</p>
        ) : conferencias.length === 0 ? (
          <section className="mt-8 border border-line bg-panel p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold">No hay conferencias activas</h2>
            <p className="mt-2 text-muted">Activa una conferencia para poder configurar sus plazos y líneas temáticas.</p>
          </section>
        ) : (
          <>
            <section className="mt-8 border border-line bg-panel p-5 sm:p-7">
              <label htmlFor="conferencia-configuracion" className={etiqueta}>Conferencia activa</label>
              <select
                id="conferencia-configuracion"
                value={idSeleccionado}
                onChange={(evento) => cambiarConferencia(evento.target.value)}
                className="select select-bordered mt-2 min-h-12 w-full rounded-none border-line bg-page sm:max-w-2xl"
              >
                {conferencias.map((conferencia) => (
                  <option key={conferencia.id_conferencia} value={conferencia.id_conferencia}>
                    {conferencia.nombre} · {conferencia.edicion}
                  </option>
                ))}
              </select>
              {conferenciaSeleccionada && (
                <p className="mt-2 text-sm text-muted">
                  La configuración se aplica únicamente a {conferenciaSeleccionada.nombre} · {conferenciaSeleccionada.edicion}.
                </p>
              )}
            </section>

            {cargandoConfiguracion ? (
              <p role="status" className="mt-6 border border-line bg-panel p-5 text-muted">Cargando plazos y líneas temáticas…</p>
            ) : (
              <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
                <section className="border border-line bg-panel p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-highlight">Cinco etapas</p>
                      <h2 className="mt-1 font-display text-2xl font-bold">Fechas límite</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted">Las etapas deben seguir el orden cronológico indicado.</p>
                    </div>
                  </div>

                  <form onSubmit={guardarPlazos} className="mt-6 space-y-4">
                    {ETAPAS.map((etapa, indice) => {
                      const plazo = plazos[indice]
                      return (
                        <fieldset key={etapa.tipo} className="border border-line bg-page p-4 sm:p-5">
                          <legend className="px-2 text-sm font-bold">{String(indice + 1).padStart(2, '0')} · {etapa.nombre}</legend>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label htmlFor={`${etapa.tipo}-inicio`} className={etiqueta}>Inicio</label>
                              <input
                                id={`${etapa.tipo}-inicio`}
                                type="datetime-local"
                                value={plazo.fecha_inicio}
                                onChange={(evento) => actualizarPlazo(indice, 'fecha_inicio', evento.target.value)}
                                className={campo}
                              />
                            </div>
                            <div>
                              <label htmlFor={`${etapa.tipo}-fin`} className={etiqueta}>Fin</label>
                              <input
                                id={`${etapa.tipo}-fin`}
                                type="datetime-local"
                                value={plazo.fecha_fin}
                                onChange={(evento) => actualizarPlazo(indice, 'fecha_fin', evento.target.value)}
                                className={campo}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label htmlFor={`${etapa.tipo}-descripcion`} className={etiqueta}>Descripción <span className="font-normal text-muted">(opcional)</span></label>
                              <textarea
                                id={`${etapa.tipo}-descripcion`}
                                rows={2}
                                value={plazo.descripcion}
                                onChange={(evento) => actualizarPlazo(indice, 'descripcion', evento.target.value)}
                                placeholder="Indicaciones para esta etapa"
                                className="textarea textarea-bordered mt-2 w-full rounded-none border-line bg-panel text-fg"
                              />
                            </div>
                          </div>
                        </fieldset>
                      )
                    })}

                    {errorCronologia && (
                      <p role="alert" className="border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
                        {errorCronologia}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={guardandoPlazos}
                      className="btn min-h-12 w-full rounded-none border-brand bg-brand px-6 font-semibold text-brand-fg hover:border-brand-hover hover:bg-brand-hover disabled:opacity-60 sm:w-auto"
                    >
                      {guardandoPlazos ? 'Guardando plazos…' : 'Guardar fechas límite'}
                    </button>
                  </form>
                </section>

                <section className="border border-line bg-panel p-5 sm:p-7">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-highlight">Por conferencia</p>
                  <h2 className="mt-1 font-display text-2xl font-bold">Líneas temáticas</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Agrega los temas de esta conferencia. Puedes editar o desactivar las líneas cuando sea necesario.
                  </p>

                  <form onSubmit={guardarLinea} className="mt-5 space-y-4 border-y border-line py-5">
                    <div>
                      <label htmlFor="nombre-linea" className={etiqueta}>Nombre de la línea</label>
                      <input
                        id="nombre-linea"
                        type="text"
                        maxLength={150}
                        value={borradorLinea.nombre}
                        onChange={(evento) => establecerBorradorLinea((actual) => ({ ...actual, nombre: evento.target.value }))}
                        placeholder="Ej. Inteligencia artificial"
                        className={campo}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="descripcion-linea" className={etiqueta}>Descripción <span className="font-normal text-muted">(opcional)</span></label>
                      <textarea
                        id="descripcion-linea"
                        rows={3}
                        value={borradorLinea.descripcion}
                        onChange={(evento) => establecerBorradorLinea((actual) => ({ ...actual, descripcion: evento.target.value }))}
                        placeholder="Describe brevemente el alcance de esta línea"
                        className="textarea textarea-bordered mt-2 w-full rounded-none border-line bg-page text-fg"
                      />
                    </div>
                    {errorLinea && <p role="alert" className={mensajeCampo}>{errorLinea}</p>}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="submit"
                        disabled={guardandoLinea}
                        className="btn min-h-11 flex-1 rounded-none border-brand bg-brand font-semibold text-brand-fg hover:border-brand-hover hover:bg-brand-hover disabled:opacity-60"
                      >
                        {guardandoLinea ? 'Guardando…' : lineaEnEdicion ? 'Guardar cambios' : 'Agregar línea temática'}
                      </button>
                      {lineaEnEdicion && (
                        <button type="button" onClick={cancelarEdicion} className="btn min-h-11 rounded-none border-line bg-transparent text-fg">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="mt-5 space-y-3">
                    {lineas.length === 0 ? (
                      <p className="border border-dashed border-line p-4 text-sm text-muted">Esta conferencia aún no tiene líneas temáticas.</p>
                    ) : lineas.map((linea) => (
                      <article key={linea.id_linea} className={`border p-4 ${linea.habilitada ? 'border-line bg-page' : 'border-line/60 bg-soft/50'}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold">{linea.nombre}</h3>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{linea.descripcion || 'Sin descripción.'}</p>
                            <span className={`mt-3 inline-flex px-2 py-1 text-xs font-bold ${linea.habilitada ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                              {linea.habilitada ? 'Habilitada' : 'Desactivada'}
                            </span>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button type="button" onClick={() => iniciarEdicion(linea)} disabled={guardandoLinea} className="btn btn-sm rounded-none border-line bg-panel text-fg">
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => cambiarEstadoLinea(linea)}
                              disabled={guardandoLinea}
                              className="btn btn-sm rounded-none border-line bg-panel text-fg"
                            >
                              {linea.habilitada ? 'Desactivar' : 'Habilitar'}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
