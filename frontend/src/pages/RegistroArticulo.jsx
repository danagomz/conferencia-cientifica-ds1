import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAutenticacion } from '../autenticacion/useAutenticacion'
import { obtenerContextoArticulos, registrarArticulo } from '../autenticacion/solicitudes'
import { Marca } from '../components/Marca'

const claseCampo =
  'mt-2 min-h-12 w-full border border-line bg-panel px-4 text-fg outline-none transition focus:border-highlight focus:ring-2 focus:ring-highlight/20'

function nuevoAutor(id, datos = {}) {
  return {
    id,
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
  const [convocatoriaId, establecerConvocatoriaId] = useState('')
  const [lineaTematica, establecerLineaTematica] = useState('')
  const [titulo, establecerTitulo] = useState('')
  const [resumen, establecerResumen] = useState('')
  const [palabrasClave, establecerPalabrasClave] = useState('')
  const [autores, establecerAutores] = useState([nuevoAutor(0, { responsable: true })])
  const [cargando, establecerCargando] = useState(true)
  const [enviando, establecerEnviando] = useState(false)
  const [error, establecerError] = useState('')
  const [articuloCreado, establecerArticuloCreado] = useState(null)
  const [siguienteId, establecerSiguienteId] = useState(1)

  useEffect(() => {
    let vigente = true
    obtenerContextoArticulos(sesion.tokenAcceso)
      .then((datos) => {
        if (!vigente) return
        establecerContexto(datos)
        const convocatoriaInicial = datos.convocatorias.find(
          (convocatoria) => convocatoria.postulaciones_abiertas,
        )
        if (convocatoriaInicial) {
          establecerConvocatoriaId(String(convocatoriaInicial.id))
          establecerLineaTematica(String(convocatoriaInicial.lineas_tematicas[0]?.id ?? ''))
        }
        establecerAutores([
          nuevoAutor(0, { ...datos.autor_actual, responsable: true }),
        ])
      })
      .catch((errorCarga) => {
        if (vigente) establecerError(errorCarga.message)
      })
      .finally(() => {
        if (vigente) establecerCargando(false)
      })

    return () => {
      vigente = false
    }
  }, [sesion.tokenAcceso])

  const convocatoriasAbiertas = contexto?.convocatorias.filter(
    (convocatoria) => convocatoria.postulaciones_abiertas,
  ) ?? []
  const convocatoriaSeleccionada = convocatoriasAbiertas.find(
    (convocatoria) => String(convocatoria.id) === convocatoriaId,
  )
  const lineasDisponibles = convocatoriaSeleccionada?.lineas_tematicas ?? []

  function cambiarConvocatoria(valor) {
    establecerConvocatoriaId(valor)
    const convocatoria = convocatoriasAbiertas.find(
      (opcion) => String(opcion.id) === valor,
    )
    establecerLineaTematica(String(convocatoria?.lineas_tematicas[0]?.id ?? ''))
  }

  function actualizarAutor(id, campo, valor) {
    establecerAutores((actuales) =>
      actuales.map((autor) => (autor.id === id ? { ...autor, [campo]: valor } : autor)),
    )
  }

  function marcarResponsable(id) {
    establecerAutores((actuales) =>
      actuales.map((autor) => ({ ...autor, responsable: autor.id === id })),
    )
  }

  function agregarAutor() {
    establecerAutores((actuales) => [...actuales, nuevoAutor(siguienteId)])
    establecerSiguienteId((actual) => actual + 1)
  }

  function quitarAutor(id) {
    establecerAutores((actuales) => {
      if (actuales.length === 1) return actuales
      const restantes = actuales.filter((autor) => autor.id !== id)
      if (!restantes.some((autor) => autor.responsable)) {
        restantes[0] = { ...restantes[0], responsable: true }
      }
      return restantes
    })
  }

  async function enviarFormulario(evento) {
    evento.preventDefault()
    establecerError('')
    establecerEnviando(true)
    try {
      const creado = await registrarArticulo({
        token: sesion.tokenAcceso,
        titulo,
        resumen,
        palabrasClave,
        convocatoriaId,
        lineaTematica,
        autores,
      })
      establecerArticuloCreado({
        ...creado,
        convocatoria: convocatoriaSeleccionada.nombre,
        linea_tematica: {
          nombre: lineasDisponibles.find((linea) => String(linea.id) === lineaTematica)?.nombre ?? '',
        },
        fecha_limite_postulaciones: convocatoriaSeleccionada.fecha_limite_postulaciones,
      })
    } catch (errorRegistro) {
      establecerError(errorRegistro.message)
    } finally {
      establecerEnviando(false)
    }
  }

  return (
    <div className="min-h-dvh bg-page font-sans text-fg">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Marca compacta />
          <nav aria-label="Navegación de autor" className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted sm:inline">{sesion.usuario.nombre}</span>
            <Link
              to="/autor"
              className="border border-line px-4 py-2 font-semibold transition hover:bg-soft"
            >
              Volver al panel
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          to="/autor"
          className="text-sm font-semibold text-highlight underline underline-offset-4 hover:text-brand"
        >
          ← Panel de autor
        </Link>

        {articuloCreado ? (
          <section aria-labelledby="registro-exitoso" className="mt-8 border border-line bg-panel p-6 sm:p-10">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
              Propuesta recibida
            </span>
            <h1 id="registro-exitoso" className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
              Artículo registrado
            </h1>
            <p role="status" className="mt-3 text-muted">
              Tu propuesta quedó asociada a tu cuenta y fue enviada correctamente.
            </p>
            <dl className="mt-7 grid gap-4 border-y border-line py-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Título</dt>
                <dd className="mt-1 font-semibold">{articuloCreado.titulo}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Convocatoria</dt>
                <dd className="mt-1 font-semibold">{articuloCreado.convocatoria}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Línea temática</dt>
                <dd className="mt-1 font-semibold">{articuloCreado.linea_tematica.nombre}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Fecha límite</dt>
                <dd className="mt-1 font-semibold">{fechaLegible(articuloCreado.fecha_limite_postulaciones)}</dd>
              </div>
            </dl>
            <Link
              to="/autor"
              className="mt-7 inline-flex min-h-12 items-center justify-center bg-brand px-6 font-semibold text-brand-fg transition hover:bg-brand-hover"
            >
              Volver al panel de autor
            </Link>
          </section>
        ) : (
          <>
            <div className="mt-7 border-b border-line pb-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
                Convocatorias científicas
              </p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
                Registrar un artículo
              </h1>
              <p className="mt-3 max-w-2xl leading-relaxed text-muted">
                Completa la información de la propuesta, selecciona su línea temática y registra a todos sus autores.
              </p>
            </div>

            {cargando ? (
              <p role="status" className="mt-8 border border-line bg-panel p-5 text-muted">
                Cargando convocatorias disponibles…
              </p>
            ) : error && !contexto ? (
              <p role="alert" className="mt-8 border border-highlight bg-soft p-5">{error}</p>
            ) : convocatoriasAbiertas.length === 0 ? (
              <section className="mt-8 border-l-4 border-highlight bg-soft p-5 sm:p-7">
                <h2 className="font-display text-xl font-bold">
                  {contexto?.convocatorias.length
                    ? 'No hay postulaciones abiertas'
                    : 'No hay convocatorias configuradas'}
                </h2>
                <p className="mt-2 leading-relaxed text-muted">
                  {contexto?.convocatorias.length
                    ? `El plazo de la convocatoria vigente terminó el ${fechaLegible(contexto.convocatorias[0].fecha_limite_postulaciones)}.`
                    : 'Un administrador debe crear o activar una convocatoria y agregar al menos una línea temática desde Django Admin (/admin/). Luego vuelve a cargar esta página.'}
                </p>
              </section>
            ) : lineasDisponibles.length === 0 ? (
              <section className="mt-8 border-l-4 border-highlight bg-soft p-5 sm:p-7">
                <h2 className="font-display text-xl font-bold">No hay líneas temáticas disponibles</h2>
                <p className="mt-2 text-muted">
                  La convocatoria está abierta, pero aún no tiene líneas temáticas habilitadas.
                </p>
              </section>
            ) : (
              <form onSubmit={enviarFormulario} className="mt-8 space-y-8">
                <section aria-labelledby="datos-articulo">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-2xl font-bold text-highlight">01</span>
                    <h2 id="datos-articulo" className="font-display text-xl font-bold">
                      Datos de la propuesta
                    </h2>
                  </div>
                  <div className="mt-5 grid gap-5 border border-line bg-panel p-5 sm:p-7">
                    <div>
                      <label htmlFor="titulo-articulo" className="text-sm font-semibold">
                        Nombre del artículo <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="titulo-articulo"
                        type="text"
                        required
                        maxLength={250}
                        value={titulo}
                        onChange={(evento) => establecerTitulo(evento.target.value)}
                        placeholder="Escribe el título de tu propuesta"
                        className={claseCampo}
                      />
                    </div>
                    <div>
                      <label htmlFor="resumen-articulo" className="text-sm font-semibold">
                        Resumen <span aria-hidden="true">*</span>
                      </label>
                      <textarea
                        id="resumen-articulo"
                        required
                        rows={5}
                        value={resumen}
                        onChange={(evento) => establecerResumen(evento.target.value)}
                        placeholder="Describe brevemente el objetivo y aporte de la propuesta"
                        className={`${claseCampo} py-3`}
                      />
                    </div>
                    <div>
                      <label htmlFor="palabras-clave" className="text-sm font-semibold">
                        Palabras clave <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="palabras-clave"
                        type="text"
                        required
                        value={palabrasClave}
                        onChange={(evento) => establecerPalabrasClave(evento.target.value)}
                        placeholder="Separadas por comas"
                        className={claseCampo}
                      />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="convocatoria" className="text-sm font-semibold">
                          Convocatoria <span aria-hidden="true">*</span>
                        </label>
                        <select
                          id="convocatoria"
                          required
                          value={convocatoriaId}
                          onChange={(evento) => cambiarConvocatoria(evento.target.value)}
                          className={`${claseCampo} rounded-none`}
                        >
                          {convocatoriasAbiertas.map((convocatoria) => (
                            <option key={convocatoria.id} value={convocatoria.id}>
                              {convocatoria.nombre}
                            </option>
                          ))}
                        </select>
                        {convocatoriaSeleccionada && (
                          <p className="mt-2 text-xs text-muted">
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
                          required
                          value={lineaTematica}
                          onChange={(evento) => establecerLineaTematica(evento.target.value)}
                          className={`${claseCampo} rounded-none`}
                        >
                          {lineasDisponibles.map((linea) => (
                            <option key={linea.id} value={linea.id}>{linea.nombre}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                <section aria-labelledby="datos-autores">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-2xl font-bold text-highlight">02</span>
                      <div>
                        <h2 id="datos-autores" className="font-display text-xl font-bold">
                          Autores del artículo
                        </h2>
                        <p className="mt-1 text-sm text-muted">
                          Agrega a todos los autores e identifica quién gestionará las versiones.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={agregarAutor}
                      className="min-h-10 border border-highlight px-4 text-sm font-semibold text-highlight transition hover:bg-soft"
                    >
                      + Agregar autor
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    {autores.map((autor, indice) => (
                      <fieldset key={autor.id} className="border border-line bg-panel p-5 sm:p-7">
                        <legend className="px-2 font-semibold">
                          Autor {String(indice + 1).padStart(2, '0')}
                        </legend>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <label htmlFor={`autor-nombres-${autor.id}`} className="text-sm font-semibold">
                              Nombres <span aria-hidden="true">*</span>
                            </label>
                            <input
                              id={`autor-nombres-${autor.id}`}
                              type="text"
                              required
                              maxLength={150}
                              autoComplete="given-name"
                              readOnly={indice === 0}
                              value={autor.nombres}
                              onChange={(evento) => actualizarAutor(autor.id, 'nombres', evento.target.value)}
                              placeholder="Nombres"
                              className={claseCampo}
                            />
                          </div>
                          <div>
                            <label htmlFor={`autor-apellidos-${autor.id}`} className="text-sm font-semibold">
                              Apellidos <span aria-hidden="true">*</span>
                            </label>
                            <input
                              id={`autor-apellidos-${autor.id}`}
                              type="text"
                              required
                              maxLength={150}
                              autoComplete="family-name"
                              readOnly={indice === 0}
                              value={autor.apellidos}
                              onChange={(evento) => actualizarAutor(autor.id, 'apellidos', evento.target.value)}
                              placeholder="Apellidos"
                              className={claseCampo}
                            />
                          </div>
                          <div>
                            <label htmlFor={`autor-email-${autor.id}`} className="text-sm font-semibold">
                              Correo electrónico <span aria-hidden="true">*</span>
                            </label>
                            <input
                              id={`autor-email-${autor.id}`}
                              type="email"
                              required
                              maxLength={254}
                              autoComplete="email"
                              readOnly={indice === 0}
                              value={autor.email}
                              onChange={(evento) => actualizarAutor(autor.id, 'email', evento.target.value)}
                              placeholder="autor@universidad.edu"
                              className={claseCampo}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label htmlFor={`autor-afiliacion-${autor.id}`} className="text-sm font-semibold">
                              Afiliación universitaria <span aria-hidden="true">*</span>
                            </label>
                            <input
                              id={`autor-afiliacion-${autor.id}`}
                              type="text"
                              required
                              maxLength={200}
                              autoComplete="organization"
                              readOnly={indice === 0}
                              value={autor.institucion}
                              onChange={(evento) => actualizarAutor(autor.id, 'institucion', evento.target.value)}
                              placeholder="Universidad o institución"
                              className={claseCampo}
                            />
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
                          <label className="flex cursor-pointer items-start gap-3 text-sm">
                            <input
                              type="radio"
                              name="autor-responsable"
                              checked={autor.responsable}
                              onChange={() => marcarResponsable(autor.id)}
                              className="mt-0.5 h-4 w-4 accent-[#02111B]"
                            />
                            <span>
                              <span className="block font-semibold">Responsable de versiones</span>
                              <span className="mt-1 block text-muted">
                                Cargará y gestionará las versiones del artículo.
                              </span>
                            </span>
                          </label>
                          {autores.length > 1 && (
                            <button
                              type="button"
                              onClick={() => quitarAutor(autor.id)}
                              className="text-sm font-semibold text-highlight underline underline-offset-4 hover:text-brand"
                              aria-label={`Quitar autor ${indice + 1}`}
                            >
                              Quitar autor
                            </button>
                          )}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    Los coautores pueden participar aunque no tengan una cuenta en la plataforma.
                  </p>
                </section>

                {error && (
                  <p role="alert" className="border border-highlight bg-soft px-4 py-3 text-sm">
                    {error}
                  </p>
                )}
                <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
                  <Link
                    to="/autor"
                    className="inline-flex min-h-12 items-center justify-center border border-line px-6 font-semibold transition hover:bg-soft"
                  >
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    disabled={enviando || !lineaTematica}
                    className="min-h-12 bg-brand px-7 font-semibold text-brand-fg transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {enviando ? 'Registrando artículo…' : 'Registrar propuesta'}
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
