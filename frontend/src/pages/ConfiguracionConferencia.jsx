import { useEffect, useMemo, useRef, useState } from 'react'
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
const CAMPOS_PLAZO = new Set(['tipo_plazo', 'fecha_inicio', 'fecha_fin', 'descripcion', 'non_field_errors', 'detail'])
const CAMPOS_LINEA = new Set(['nombre', 'descripcion', 'habilitada', 'non_field_errors', 'detail'])

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
  if (typeof datos === 'string') return [datos]
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
      return {
        etapa: etapa.tipo,
        mensaje: `Completa las fechas de inicio y fin para «${etapa.nombre}».`,
      }
    }
    const inicio = new Date(plazo.fecha_inicio)
    const fin = new Date(plazo.fecha_fin)
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      return {
        etapa: etapa.tipo,
        mensaje: `Revisa el formato de las fechas de «${etapa.nombre}»; el valor ingresado no es válido.`,
      }
    }
    if (fin <= inicio) {
      return {
        etapa: etapa.tipo,
        mensaje: `La fecha de fin de «${etapa.nombre}» debe ser posterior a su fecha de inicio.`,
      }
    }
  }

  for (let indice = 1; indice < ETAPAS.length; indice += 1) {
    const anterior = plazos.find((fila) => fila.tipo_plazo === ETAPAS[indice - 1].tipo)
    const actual = plazos.find((fila) => fila.tipo_plazo === ETAPAS[indice].tipo)
    if (new Date(actual.fecha_inicio) <= new Date(anterior.fecha_fin)) {
      return {
        etapa: actual.tipo_plazo,
        mensaje: `«${ETAPAS[indice].nombre}» debe iniciar después de que termine «${ETAPAS[indice - 1].nombre}».`,
      }
    }
  }
  return null
}

function agruparErroresPlazos(error, tipoEtapa) {
  const datos = error?.erroresCampos
  const errores = {}
  const erroresApi = datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {}
  const mensajes = mensajesDeError(error)
  const etapa = ETAPAS.find((item) => item.tipo === tipoEtapa)

  if (etapa) {
    const camposEtapa = {}
    for (const [campo, valor] of Object.entries(erroresApi)) {
      if (!CAMPOS_PLAZO.has(campo)) continue
      const destino = ['fecha_inicio', 'fecha_fin', 'descripcion'].includes(campo)
        ? campo
        : 'general'
      camposEtapa[destino] = [
        ...new Set([...(camposEtapa[destino] ?? []), ...mensajesDeValor(valor)]),
      ]
    }
    if (Object.keys(camposEtapa).length) errores[etapa.tipo] = camposEtapa
  }

  if (Object.keys(errores).length === 0 && mensajes.length) {
    errores[tipoEtapa || 'general'] = { general: mensajes }
  }
  return errores
}

function agruparErroresLineas(error) {
  const datos = error?.erroresCampos
  const errores = {}
  if (datos && typeof datos === 'object' && !Array.isArray(datos)) {
    for (const [campo, valor] of Object.entries(datos)) {
      if (CAMPOS_LINEA.has(campo)) errores[campo] = mensajesDeValor(valor)
    }
  }
  if (Object.keys(errores).length === 0) errores.general = mensajesDeError(error)
  return errores
}

function mensajesDeValor(valor) {
  if (typeof valor === 'string') return [valor]
  if (Array.isArray(valor)) return valor.flatMap(mensajesDeValor)
  if (valor && typeof valor === 'object') return Object.values(valor).flatMap(mensajesDeValor)
  return []
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
  const [mensajeError, establecerMensajeError] = useState('')
  const [mensajeExito, establecerMensajeExito] = useState('')
  const [erroresPlazos, establecerErroresPlazos] = useState({})
  const [erroresLineas, establecerErroresLineas] = useState({})
  const alertaRef = useRef(null)

  const conferenciaSeleccionada = useMemo(
    () => conferencias.find((conferencia) => String(conferencia.id_conferencia) === idSeleccionado),
    [conferencias, idSeleccionado],
  )
  const cargandoConfiguracion = Boolean(idSeleccionado)
    && idConfiguracionCargada !== idSeleccionado
  const cargando = cargandoConferencias || cargandoConfiguracion

  useEffect(() => {
    if (!mensajeError || !alertaRef.current) return
    alertaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    alertaRef.current.focus({ preventScroll: true })
  }, [mensajeError])

  useEffect(() => {
    let vigente = true
    obtenerConferenciasConfigurables(sesion.tokenAcceso)
      .then((datos) => {
        if (!vigente) return
        establecerConferencias(datos)
        establecerIdSeleccionado(String(datos[0]?.id_conferencia ?? ''))
      })
      .catch((errorCarga) => {
        if (vigente) establecerMensajeError(errorCarga.message)
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
        if (vigente) establecerMensajeError(errorCarga.message)
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
    establecerErroresPlazos({})
    establecerMensajeError('')
    establecerMensajeExito('')
  }

  function cambiarConferencia(id) {
    establecerPlazos(plazosIniciales([]))
    establecerLineas([])
    establecerIdConfiguracionCargada('')
    establecerMensajeError('')
    establecerMensajeExito('')
    establecerErroresPlazos({})
    establecerErroresLineas({})
    establecerIdSeleccionado(id)
  }

  async function guardarPlazos(evento) {
    evento.preventDefault()
    const errorValidacion = validarPlazos(plazos)
    if (errorValidacion) {
      establecerErroresPlazos({
        [errorValidacion.etapa]: { general: [errorValidacion.mensaje] },
      })
      establecerMensajeError(errorValidacion.mensaje)
      establecerMensajeExito('')
      return
    }

    establecerGuardandoPlazos(true)
    establecerMensajeError('')
    establecerMensajeExito('')
    establecerErroresPlazos({})
    establecerErroresLineas({})
    let tipoEtapaEnCurso = ''
    try {
      const actualizados = [...plazos]
      for (let indice = 0; indice < ETAPAS.length; indice += 1) {
        const plazo = actualizados[indice]
        tipoEtapaEnCurso = plazo.tipo_plazo
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
      establecerMensajeExito('Los cinco plazos de la conferencia se guardaron correctamente.')
    } catch (errorGuardado) {
      establecerMensajeError(errorGuardado.message)
      establecerErroresPlazos(agruparErroresPlazos(errorGuardado, tipoEtapaEnCurso))
    } finally {
      establecerGuardandoPlazos(false)
    }
  }

  function iniciarEdicion(linea) {
    establecerLineaEnEdicion(linea.id_linea)
    establecerBorradorLinea({ nombre: linea.nombre, descripcion: linea.descripcion ?? '' })
    establecerErroresLineas({})
    establecerMensajeError('')
    establecerMensajeExito('')
  }

  function cancelarEdicion() {
    establecerLineaEnEdicion(null)
    establecerBorradorLinea({ nombre: '', descripcion: '' })
    establecerErroresLineas({})
  }

  async function guardarLinea(evento) {
    evento.preventDefault()
    if (!borradorLinea.nombre.trim()) {
      const mensaje = 'El nombre de la línea temática es obligatorio.'
      establecerErroresLineas({ nombre: [mensaje] })
      establecerMensajeError(mensaje)
      establecerMensajeExito('')
      return
    }
    establecerGuardandoLinea(true)
    establecerErroresLineas({})
    establecerMensajeError('')
    establecerMensajeExito('')
    establecerErroresPlazos({})
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
      establecerMensajeExito(`La línea temática «${linea.nombre}» se guardó correctamente.`)
    } catch (errorGuardado) {
      establecerMensajeError(errorGuardado.message)
      establecerErroresLineas(agruparErroresLineas(errorGuardado))
    } finally {
      establecerGuardandoLinea(false)
    }
  }

  async function cambiarEstadoLinea(linea) {
    establecerGuardandoLinea(true)
    establecerMensajeError('')
    establecerMensajeExito('')
    establecerErroresLineas({})
    establecerErroresPlazos({})
    try {
      const actualizada = await guardarLineaTematica(idSeleccionado, {
        id_linea: linea.id_linea,
        habilitada: !linea.habilitada,
      }, sesion.tokenAcceso)
      establecerLineas((actuales) => actuales.map((actual) => (
        actual.id_linea === actualizada.id_linea ? actualizada : actual
      )))
      establecerMensajeExito(`La línea temática «${linea.nombre}» se ${actualizada.habilitada ? 'habilitó' : 'desactivó'} correctamente.`)
    } catch (errorGuardado) {
      establecerMensajeError(errorGuardado.message)
      establecerErroresLineas(agruparErroresLineas(errorGuardado))
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

        {mensajeError && (
          <div
            ref={alertaRef}
            tabIndex={-1}
            role="alert"
            aria-live="assertive"
            className="alert alert-error mt-6 items-start rounded-none border border-red-200 bg-red-50 text-red-900 focus:outline-2 focus:outline-red-700"
          >
            <div className="min-w-0 flex-1">
              <p className="font-bold">{mensajeError}</p>
            </div>
            <button
              type="button"
              onClick={() => establecerMensajeError('')}
              aria-label="Cerrar mensaje de error"
              className="btn btn-ghost btn-sm rounded-none text-xl text-red-900"
            >
              ×
            </button>
          </div>
        )}
        {mensajeExito && (
          <div role="status" aria-live="polite" className="alert alert-success mt-6 items-start rounded-none border border-emerald-200 bg-emerald-50 text-emerald-900">
            <p className="min-w-0 flex-1">{mensajeExito}</p>
            <button
              type="button"
              onClick={() => establecerMensajeExito('')}
              aria-label="Cerrar mensaje de éxito"
              className="btn btn-ghost btn-sm rounded-none text-xl text-emerald-900"
            >
              ×
            </button>
          </div>
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
                disabled={cargando || guardandoPlazos || guardandoLinea}
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
                                disabled={guardandoPlazos}
                                aria-invalid={Boolean(erroresPlazos[etapa.tipo]?.fecha_inicio?.length)}
                                className={campo}
                              />
                              {erroresPlazos[etapa.tipo]?.fecha_inicio?.map((mensaje) => (
                                <p key={mensaje} className={mensajeCampo}>{mensaje}</p>
                              ))}
                            </div>
                            <div>
                              <label htmlFor={`${etapa.tipo}-fin`} className={etiqueta}>Fin</label>
                              <input
                                id={`${etapa.tipo}-fin`}
                                type="datetime-local"
                                value={plazo.fecha_fin}
                                onChange={(evento) => actualizarPlazo(indice, 'fecha_fin', evento.target.value)}
                                disabled={guardandoPlazos}
                                aria-invalid={Boolean(erroresPlazos[etapa.tipo]?.fecha_fin?.length)}
                                className={campo}
                              />
                              {erroresPlazos[etapa.tipo]?.fecha_fin?.map((mensaje) => (
                                <p key={mensaje} className={mensajeCampo}>{mensaje}</p>
                              ))}
                            </div>
                            <div className="sm:col-span-2">
                              <label htmlFor={`${etapa.tipo}-descripcion`} className={etiqueta}>Descripción <span className="font-normal text-muted">(opcional)</span></label>
                              <textarea
                                id={`${etapa.tipo}-descripcion`}
                                rows={2}
                                value={plazo.descripcion}
                                onChange={(evento) => actualizarPlazo(indice, 'descripcion', evento.target.value)}
                                disabled={guardandoPlazos}
                                placeholder="Indicaciones para esta etapa"
                                className="textarea textarea-bordered mt-2 w-full rounded-none border-line bg-panel text-fg"
                              />
                              {erroresPlazos[etapa.tipo]?.descripcion?.map((mensaje) => (
                                <p key={mensaje} className={mensajeCampo}>{mensaje}</p>
                              ))}
                            </div>
                          </div>
                          {erroresPlazos[etapa.tipo]?.general?.length > 0 && (
                            <ul role="alert" className="mt-4 space-y-1 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-900">
                              {erroresPlazos[etapa.tipo].general.map((mensaje, indiceError) => (
                                <li key={`${indiceError}-${mensaje}`}>{mensaje}</li>
                              ))}
                            </ul>
                          )}
                        </fieldset>
                      )
                    })}

                    {erroresPlazos.general?.map((mensaje) => (
                      <p key={mensaje} role="alert" className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">
                        {mensaje}
                      </p>
                    ))}
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
                        onChange={(evento) => {
                          establecerBorradorLinea((actual) => ({ ...actual, nombre: evento.target.value }))
                          establecerErroresLineas((actuales) => ({ ...actuales, nombre: [] }))
                          establecerMensajeError('')
                        }}
                        onFocus={() => {
                          if (!lineaEnEdicion) {
                            establecerMensajeExito('')
                            establecerMensajeError('')
                            establecerErroresLineas({})
                          }
                        }}
                        placeholder="Ej. Inteligencia artificial"
                        aria-invalid={Boolean(erroresLineas.nombre?.length)}
                        className={campo}
                      />
                      {erroresLineas.nombre?.map((mensaje) => (
                        <p key={mensaje} className={mensajeCampo}>{mensaje}</p>
                      ))}
                    </div>
                    <div>
                      <label htmlFor="descripcion-linea" className={etiqueta}>Descripción <span className="font-normal text-muted">(opcional)</span></label>
                      <textarea
                        id="descripcion-linea"
                        rows={3}
                        value={borradorLinea.descripcion}
                        onChange={(evento) => {
                          establecerBorradorLinea((actual) => ({ ...actual, descripcion: evento.target.value }))
                          establecerErroresLineas((actuales) => ({ ...actuales, descripcion: [] }))
                          establecerMensajeError('')
                        }}
                        placeholder="Describe brevemente el alcance de esta línea"
                        aria-invalid={Boolean(erroresLineas.descripcion?.length)}
                        className="textarea textarea-bordered mt-2 w-full rounded-none border-line bg-page text-fg"
                      />
                      {erroresLineas.descripcion?.map((mensaje) => (
                        <p key={mensaje} className={mensajeCampo}>{mensaje}</p>
                      ))}
                    </div>
                    {erroresLineas.habilitada?.concat(erroresLineas.general ?? []).map((mensaje) => (
                      <p key={mensaje} className={mensajeCampo}>{mensaje}</p>
                    ))}
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
