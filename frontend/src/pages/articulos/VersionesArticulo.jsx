import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Marca } from "../../components/Marca";
import { infoEstado } from "../../articulos/estados";
import {
  cargarVersionArticulo,
  obtenerHistorialVersiones,
  obtenerPlazoPostulacion,
} from "../../articulos/solicitudes";
import { useAutenticacion } from "../../autenticacion/useAutenticacion";
import { ROLES_DISPONIBLES } from "../../autenticacion/roles";

const TIPOS_VERSION = {
  ORIGINAL: "Original",
  CORREGIDA: "Corregida",
};

function formatearFechaHora(valor) {
  if (!valor) return "Sin fecha registrada";
  const fecha = new Date(valor.length === 10 ? `${valor}T00:00:00` : valor);
  return fecha.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearFechaLimite(valor) {
  if (!valor) return "";
  return new Date(`${valor}T00:00:00`).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatearTamano(bytes) {
  if (!Number.isFinite(bytes)) return "Tamaño no disponible";
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function esArchivoPdf(archivo) {
  return (
    archivo.type === "application/pdf" ||
    archivo.name.toLowerCase().endsWith(".pdf")
  );
}

// Solo el autor responsable puede cargar versiones (lo exige el servidor).
// Si el detalle no trae correos para comparar, se deja decidir al servidor.
function esAutorResponsable(articulo, correoSesion) {
  if (!correoSesion || !Array.isArray(articulo?.autores)) return true;
  const responsable = articulo.autores.find((autor) => autor.es_responsable);
  if (!responsable?.email) return true;
  return responsable.email.toLowerCase() === correoSesion.toLowerCase();
}

function IconoPdf() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-8 w-8 shrink-0 text-brand"
    >
      <path
        d="M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Mensaje de resultado de la carga (CA-097 éxito · CA-098 error).
// Al aparecer se desplaza a la vista y recibe el foco para que el autor
// siempre lo note. Solo existe una notificación a la vez.
function Notificacion({ tipo, mensaje, alCerrar }) {
  const referencia = useRef(null);
  const esError = tipo === "error";

  useEffect(() => {
    const elemento = referencia.current;
    if (!elemento) return;
    const reducirMovimiento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    elemento.scrollIntoView({
      behavior: reducirMovimiento ? "auto" : "smooth",
      block: "center",
    });
    elemento.focus({ preventScroll: true });
  }, []);

  return (
    <div
      ref={referencia}
      tabIndex={-1}
      role={esError ? "alert" : "status"}
      aria-live={esError ? "assertive" : "polite"}
      aria-atomic="true"
      className={`mt-4 flex items-start gap-3 border border-l-4 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-highlight ${
        esError
          ? "border-red-200 border-l-red-700 bg-red-50 text-red-900"
          : "border-emerald-200 border-l-emerald-600 bg-emerald-50 text-emerald-900"
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 h-5 w-5 shrink-0"
      >
        {esError ? (
          <path d="M12 8v5m0 3.5v.01M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
        ) : (
          <path d="M5 12.5 10 17.5 19 7.5" />
        )}
      </svg>

      <div className="min-w-0 flex-1">
        <p className="font-bold">
          {esError ? "No se pudo cargar la versión" : "Versión cargada"}
        </p>
        <p className="mt-0.5 font-medium">{mensaje}</p>
      </div>

      <button
        type="button"
        onClick={alCerrar}
        aria-label="Cerrar mensaje"
        className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-lg leading-none transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
      >
        ×
      </button>
    </div>
  );
}

function AvisoPlazo({ plazo, cargaBloqueada }) {
  if (!plazo) return null;

  if (!plazo.abierto) {
    return (
      <div
        role="status"
        className="mt-6 border border-l-4 border-pending-line bg-pending px-4 py-3 text-sm text-pending-fg"
      >
        <p className="font-bold">El plazo de postulación está cerrado</p>
        <p className="mt-1">
          {plazo.fechaLimite
            ? `La fecha límite fue el ${formatearFechaLimite(plazo.fechaLimite)}. `
            : ""}
          {cargaBloqueada
            ? "Ya no es posible cargar la primera versión del artículo."
            : "Las versiones corregidas se validan en el servidor al enviarlas."}
        </p>
      </div>
    );
  }

  return (
    <p className="mt-6 text-xs text-muted">
      Plazo de postulación abierto
      {plazo.fechaLimite
        ? ` hasta el ${formatearFechaLimite(plazo.fechaLimite)}`
        : ""}
      .
    </p>
  );
}

function FormularioCarga({
  archivo,
  cargando,
  deshabilitado,
  motivoDeshabilitado,
  entradaArchivo,
  alSeleccionar,
  alQuitar,
  alEnviar,
}) {
  return (
    <form onSubmit={alEnviar} noValidate className="mt-4">
      <label
        htmlFor="archivo-version"
        className="mb-2 block text-xs font-bold uppercase tracking-wider text-fg"
      >
        Archivo PDF de la nueva versión
      </label>

      <input
        ref={entradaArchivo}
        id="archivo-version"
        type="file"
        accept="application/pdf,.pdf"
        disabled={deshabilitado || cargando}
        onChange={alSeleccionar}
        aria-describedby="ayuda-archivo-version"
        className="file-input file-input-bordered min-h-12 w-full rounded-none border-2 border-highlight bg-panel text-sm text-fg focus:border-brand focus:outline-none focus:ring-4 focus:ring-highlight/25 disabled:cursor-not-allowed disabled:border-line disabled:bg-soft disabled:opacity-60"
      />

      <p id="ayuda-archivo-version" className="mt-2 text-xs text-muted">
        {motivoDeshabilitado ||
          "Solo se admiten archivos en formato PDF. Las versiones anteriores se conservan."}
      </p>

      {archivo && (
        <div className="mt-4 flex items-center gap-3 border border-line bg-soft/40 px-4 py-3">
          <IconoPdf />
          <div className="min-w-0 flex-1">
            <p
              title={archivo.name}
              className="truncate text-sm font-semibold text-fg"
            >
              {archivo.name}
            </p>
            <p className="text-xs text-muted">
              {formatearTamano(archivo.size)} · listo para cargar
            </p>
          </div>
          <button
            type="button"
            onClick={alQuitar}
            disabled={cargando}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            Quitar
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={deshabilitado || cargando}
        className="btn mt-5 min-h-12 rounded-none border-2 border-brand bg-brand px-6 text-sm font-bold text-brand-fg shadow-sm transition hover:border-brand-hover hover:bg-brand-hover hover:text-brand-hover-fg disabled:cursor-not-allowed disabled:border-line disabled:bg-soft disabled:text-muted disabled:opacity-70"
      >
        {cargando && (
          <span
            aria-hidden="true"
            className="loading loading-spinner loading-sm"
          />
        )}
        {cargando ? "Cargando versión…" : "Cargar nueva versión"}
      </button>
    </form>
  );
}

function HistorialEsqueleto() {
  return (
    <div role="status" className="divide-y divide-line">
      <span className="sr-only">Cargando historial de versiones…</span>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} aria-hidden="true" className="space-y-2 px-6 py-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-soft" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-soft" />
        </div>
      ))}
    </div>
  );
}

function HistorialVacio() {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 px-6 py-14 text-center"
    >
      <p className="text-sm font-semibold text-fg">
        Este artículo todavía no tiene versiones cargadas
      </p>
      <p className="max-w-xs text-xs text-muted">
        Cuando cargues un PDF, aparecerá aquí con su número de versión.
      </p>
    </div>
  );
}

function ListaHistorial({ versiones }) {
  // El historial completo se conserva: se ordena de la más reciente a la más antigua.
  const ordenadas = [...versiones].sort(
    (a, b) => b.numero_version - a.numero_version,
  );
  const numeroActual = ordenadas[0]?.numero_version;

  return (
    <ol className="divide-y divide-line">
      {ordenadas.map((version) => {
        const esActual = version.numero_version === numeroActual;

        return (
          <li
            key={version.id ?? version.numero_version}
            className={`grid gap-3 px-6 py-4 sm:grid-cols-[1fr_auto] ${esActual ? "bg-soft/40" : ""}`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-fg">
                  Versión {version.numero_version}
                </p>

                <span className="inline-flex items-center rounded-sm border border-line bg-panel px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                  {TIPOS_VERSION[version.tipo_version] ?? version.tipo_version}
                </span>

                {esActual && (
                  <span className="inline-flex items-center border border-brand bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-fg">
                    Versión actual
                  </span>
                )}
              </div>

              <p
                title={version.nombre_archivo}
                className="mt-1 text-sm text-muted sm:truncate"
              >
                {version.nombre_archivo}
              </p>

              {version.observaciones && (
                <p className="mt-2 whitespace-pre-line border-l-2 border-highlight pl-3 text-xs text-muted">
                  <span className="font-semibold text-fg">Comentarios: </span>
                  {version.observaciones}
                </p>
              )}
            </div>

            <div className="text-xs tabular-nums text-muted sm:text-right">
              <p>{formatearFechaHora(version.fecha_carga)}</p>
              <p className="mt-1">{formatearTamano(version.tamano_bytes)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function VersionesArticulo() {
  const { id } = useParams();
  const { sesion } = useAutenticacion();
  const token = sesion?.tokenAcceso;
  const correoSesion = sesion?.usuario?.correo;

  const rutaInicioRol = sesion?.rolActivo
    ? ROLES_DISPONIBLES[sesion.rolActivo]?.rutaInicio
    : null;

  const entradaArchivo = useRef(null);
  const hayArticuloRef = useRef(false);
  const contadorNotificaciones = useRef(0);

  const [articulo, setArticulo] = useState(null);
  const [plazo, setPlazo] = useState(null);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorDatos, setErrorDatos] = useState("");
  const [intento, setIntento] = useState(0);

  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  // Una sola notificación a la vez: { id, tipo: "exito" | "error", mensaje }.
  const [notificacion, setNotificacion] = useState(null);

  useEffect(() => {
    let activo = true;

    obtenerHistorialVersiones(token, id)
      .then(async (datos) => {
        // Si el plazo no se puede consultar, la carga sigue y decide el servidor.
        const plazoConferencia = await obtenerPlazoPostulacion(
          token,
          datos.id_conferencia,
        ).catch(() => null);

        if (!activo) return;
        hayArticuloRef.current = true;
        setArticulo(datos);
        setPlazo(plazoConferencia);
        setErrorDatos("");
      })
      .catch((error) => {
        if (!activo) return;
        const mensaje =
          error instanceof Error
            ? error.message
            : "No se pudo cargar el artículo. Intenta de nuevo.";

        if (hayArticuloRef.current) {
          // Refresco tras una carga: se conserva la vista y se avisa del fallo.
          notificar(
            "error",
            `La versión se cargó, pero no se pudo actualizar el historial. ${mensaje}`,
          );
        } else {
          setErrorDatos(mensaje);
        }
      })
      .finally(() => {
        if (activo) setCargandoDatos(false);
      });

    return () => {
      activo = false;
    };
  }, [id, token, intento]);

  function reintentar() {
    setErrorDatos("");
    setCargandoDatos(true);
    setIntento((n) => n + 1);
  }

  function notificar(tipo, mensaje) {
    contadorNotificaciones.current += 1;
    setNotificacion({ id: contadorNotificaciones.current, tipo, mensaje });
  }

  function cerrarNotificacion() {
    setNotificacion(null);
  }

  function limpiarArchivo() {
    setArchivo(null);
    if (entradaArchivo.current) entradaArchivo.current.value = "";
  }

  function rechazarArchivo(evento, mensaje) {
    setArchivo(null);
    evento.target.value = "";
    notificar("error", mensaje);
  }

  function seleccionarArchivo(evento) {
    const elegido = evento.target.files?.[0] ?? null;
    // Al elegir otro archivo se descarta cualquier mensaje anterior.
    setNotificacion(null);

    if (!elegido) {
      setArchivo(null);
      return;
    }

    if (!esArchivoPdf(elegido)) {
      rechazarArchivo(
        evento,
        `El archivo "${elegido.name}" no es un PDF. Seleccione un archivo con extensión .pdf.`,
      );
      return;
    }

    if (elegido.size === 0) {
      rechazarArchivo(
        evento,
        `El archivo "${elegido.name}" está vacío. Seleccione un PDF con contenido.`,
      );
      return;
    }

    setArchivo(elegido);
  }

  async function enviarVersion(evento) {
    evento.preventDefault();
    if (enviando) return;

    // Cada intento parte sin alertas previas.
    setNotificacion(null);

    if (!archivo) {
      notificar(
        "error",
        "No ha seleccionado ningún archivo. Elija el PDF de la nueva versión antes de cargarla.",
      );
      return;
    }

    setEnviando(true);

    try {
      const respuesta = await cargarVersionArticulo(token, id, archivo);
      const numero = respuesta?.numero_version;
      const nombre = respuesta?.nombre_archivo || archivo.name;

      notificar(
        "exito",
        numero
          ? `La versión ${numero} del artículo se cargó correctamente (archivo: ${nombre}). Es ahora la versión actual.`
          : `La nueva versión del artículo se cargó correctamente (archivo: ${nombre}).`,
      );
      limpiarArchivo();
      // Refresca el historial sin reemplazar la pantalla por el esqueleto.
      setIntento((n) => n + 1);
    } catch (error) {
      notificar(
        "error",
        error instanceof Error
          ? error.message
          : "No fue posible cargar la versión. Intente de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  const versiones = articulo?.versiones ?? [];
  const estado = articulo ? infoEstado(articulo.estado) : null;

  const esResponsable = esAutorResponsable(articulo, correoSesion);
  // El servidor solo valida el plazo en la primera versión (SDGC-202); la
  // interfaz bloquea exactamente en ese caso y deja el resto al servidor.
  const plazoCerrado = plazo?.abierto === false;
  const cargaBloqueadaPorPlazo = plazoCerrado && versiones.length === 0;

  let motivoDeshabilitado = "";
  if (!esResponsable) {
    motivoDeshabilitado =
      "Solo el autor responsable puede cargar versiones del artículo.";
  } else if (cargaBloqueadaPorPlazo) {
    motivoDeshabilitado = "El plazo de postulación está cerrado.";
  }
  const formularioDeshabilitado = Boolean(motivoDeshabilitado);

  return (
    <div className="relative min-h-screen bg-page font-sans text-fg antialiased selection:bg-brand selection:text-brand-fg">
      <div className="fixed inset-x-0 top-0 z-50 h-1 bg-gradient-to-r from-brand via-highlight to-brand" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--color-soft)_0%,transparent_60%)] opacity-60" />

      <header className="sticky top-1 z-40 border-b border-line bg-panel/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Marca compacta />
          <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            <span className="font-medium text-fg">Versiones</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <nav
          aria-label="Ruta de navegación"
          className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted"
        >
          {rutaInicioRol ? (
            <Link
              to={rutaInicioRol}
              className="transition-colors hover:text-fg"
            >
              Mi espacio
            </Link>
          ) : (
            <span>Mi espacio</span>
          )}
          <span aria-hidden="true">›</span>
          <Link
            to="/autor/articulos"
            className="transition-colors hover:text-fg"
          >
            Artículos
          </Link>
          <span aria-hidden="true">›</span>
          <span className="font-medium text-fg">Versiones</span>
        </nav>

        <section className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            Autor
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand">
            Versiones del artículo
          </h1>
          <div className="mt-3 h-1 w-12 rounded-full bg-brand" />
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Carga una nueva versión en PDF y consulta el historial completo de
            versiones conservadas.
          </p>
        </section>

        {cargandoDatos ? (
          <section className="overflow-hidden bg-panel shadow-md">
            <div className="h-1 w-full bg-gradient-to-r from-brand via-highlight to-brand" />
            <HistorialEsqueleto />
          </section>
        ) : errorDatos ? (
          <section
            role="alert"
            className="flex flex-col items-center gap-3 bg-panel px-6 py-12 text-center shadow-md"
          >
            <p className="text-sm font-medium text-fg">{errorDatos}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={reintentar}
                className="rounded-md border border-line px-4 py-2 text-xs font-semibold transition-colors hover:bg-soft"
              >
                Reintentar
              </button>
              <Link
                to="/autor/articulos"
                className="rounded-md border border-line px-4 py-2 text-xs font-semibold transition-colors hover:bg-soft"
              >
                Volver a mis artículos
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* Datos del artículo */}
            <section className="overflow-hidden bg-panel shadow-md">
              <div className="h-1 w-full bg-gradient-to-r from-brand via-highlight to-brand" />
              <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">
                    {articulo.conferencia || "Conferencia científica"}
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-fg">
                    {articulo.titulo}
                  </h2>
                  {articulo.linea && (
                    <span className="mt-2 inline-flex items-center rounded-sm border border-line bg-soft/40 px-2 py-1 text-[10px] font-medium text-fg">
                      {articulo.linea}
                    </span>
                  )}
                </div>

                {estado && (
                  <span
                    className={`inline-flex w-fit shrink-0 items-center border-y border-r border-l-6 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${estado.clases}`}
                  >
                    {estado.etiqueta}
                  </span>
                )}
              </div>
            </section>

            {/* Carga de nueva versión */}
            <section
              aria-labelledby="titulo-carga-version"
              className="mt-6 overflow-hidden bg-panel shadow-md"
            >
              <div className="h-1 w-full bg-gradient-to-r from-brand via-highlight to-brand" />
              <div className="px-6 py-6">
                <h2
                  id="titulo-carga-version"
                  className="text-lg font-bold text-fg"
                >
                  Cargar nueva versión
                </h2>

                <AvisoPlazo
                  plazo={plazo}
                  cargaBloqueada={cargaBloqueadaPorPlazo}
                />

                <FormularioCarga
                  archivo={archivo}
                  cargando={enviando}
                  deshabilitado={formularioDeshabilitado}
                  motivoDeshabilitado={motivoDeshabilitado}
                  entradaArchivo={entradaArchivo}
                  alSeleccionar={seleccionarArchivo}
                  alQuitar={limpiarArchivo}
                  alEnviar={enviarVersion}
                />

                {notificacion && (
                  <Notificacion
                    key={notificacion.id}
                    tipo={notificacion.tipo}
                    mensaje={notificacion.mensaje}
                    alCerrar={cerrarNotificacion}
                  />
                )}
              </div>
            </section>

            {/* Historial */}
            <section
              aria-labelledby="titulo-historial"
              className="mt-6 overflow-hidden bg-panel shadow-md"
            >
              <div className="h-1 w-full bg-gradient-to-r from-brand via-highlight to-brand" />
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <h2
                  id="titulo-historial"
                  className="text-lg font-bold text-fg"
                >
                  Historial de versiones
                </h2>
                <span className="text-xs text-muted" aria-live="polite">
                  {versiones.length === 1
                    ? "1 versión"
                    : `${versiones.length} versiones`}
                </span>
              </div>

              {versiones.length === 0 ? (
                <HistorialVacio />
              ) : (
                <ListaHistorial versiones={versiones} />
              )}
            </section>
          </>
        )}

        <div className="mt-8">
          <Link
            to="/autor/articulos"
            className="inline-flex min-h-9 items-center rounded-md border border-line bg-panel px-4 py-2 text-xs font-semibold text-fg transition-colors hover:bg-soft"
          >
            ← Volver a mis artículos
          </Link>
        </div>
      </main>
    </div>
  );
}
