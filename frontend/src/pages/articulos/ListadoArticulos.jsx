import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Marca } from "../../components/Marca";
import { infoEstado } from "../../articulos/estados";
import {
  listarArticulos,
  obtenerCriteriosFiltrado,
  listarArticulosPropios,
} from "../../articulos/solicitudes";
import { useAutenticacion } from "../../autenticacion/useAutenticacion";
import { ROLES_DISPONIBLES } from "../../autenticacion/roles";
import { DetalleArticuloModal } from "./DetalleArticuloModal";

const MODOS = {
  todos: {
    seccion: "Gestión",
    etiqueta: "Comité o Administrador",
    titulo: "Artículos postulados",
    descripcion:
      "Consulta las propuestas recibidas y el estado de cada artículo.",
    conFiltros: true,
    conAutor: true,
  },
  propios: {
    seccion: "Mi espacio",
    etiqueta: "Autor",
    titulo: "Mis artículos",
    descripcion: "Consulta tus propuestas y en qué etapa va cada una.",
    conFiltros: false,
    conAutor: false,
  },
};

const COLUMNAS_CON_AUTOR = "sm:grid-cols-[1fr_160px_190px_110px_120px]";
const COLUMNAS_SIN_AUTOR = "sm:grid-cols-[1fr_170px_110px_150px_250px]";

function formatearFecha(valor) {
  const fecha = new Date(valor.length === 10 ? `${valor}T00:00:00` : valor);
  return fecha.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function FilasEsqueleto({ columnas, conAutor, conAcciones }) {
  return (
    <div role="status" className="divide-y divide-line bg-panel">
      <span className="sr-only">Cargando artículos…</span>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`grid grid-cols-1 gap-3 px-6 py-4 sm:items-center sm:gap-4 ${columnas}`}
        >
          <div className="h-4 w-4/5 animate-pulse rounded bg-soft" />
          {conAutor && (
            <div className="h-4 w-24 animate-pulse rounded bg-soft" />
          )}
          <div className="h-5 w-36 animate-pulse rounded bg-soft" />
          <div className="h-4 w-20 animate-pulse rounded bg-soft" />
          <div className="h-5 w-20 animate-pulse rounded bg-soft" />
          {conAcciones && (
            <div className="h-7 w-24 animate-pulse rounded bg-soft" />
          )}
        </div>
      ))}
    </div>
  );
}

function EstadoVacio() {
  return (
    <div className="flex flex-col items-center gap-2 bg-panel px-6 py-16 text-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-10 w-10 text-fg"
      >
        <path
          d="M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-sm font-semibold text-fg">
        No hay artículos registrados
      </p>
      <p className="max-w-xs text-xs text-muted">
        Las propuestas que se reciban aparecerán en este listado.
      </p>
    </div>
  );
}

function EstadoVacioAutor() {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 bg-panel px-6 py-16 text-center"
    >
      <p className="text-sm font-semibold text-fg">
        Todavía no tienes artículos registrados
      </p>
      <p className="max-w-xs text-xs text-muted">
        Cuando registres una propuesta, aparecerá aquí con su estado.
      </p>
      <Link
        to="/autor/articulos/nuevo"
        className="mt-3 inline-flex min-h-9 items-center rounded-md bg-brand px-4 py-2 text-xs font-semibold text-brand-fg transition-colors hover:bg-brand-hover"
      >
        Registrar un artículo
      </Link>
    </div>
  );
}

function EstadoSinCoincidencias() {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 bg-panel px-6 py-16 text-center"
    >
      <p className="text-sm font-semibold text-fg">
        No se encontraron artículos con esos filtros
      </p>

      <p className="max-w-xs text-xs text-muted">
        Cambia los criterios o utiliza el botón “Limpiar filtros”.
      </p>
    </div>
  );
}

function ListadoArticulos({ modo = "todos" }) {
  const config = MODOS[modo] ?? MODOS.todos;
  const columnas = config.conAutor ? COLUMNAS_CON_AUTOR : COLUMNAS_SIN_AUTOR;
  const { sesion } = useAutenticacion();

  const ubicacion = useLocation();
  const [parametros, establecerParametros] = useSearchParams();
  const idDetalle = parametros.get("detalle");

  const rutaInicioRol = sesion?.rolActivo
    ? ROLES_DISPONIBLES[sesion.rolActivo]?.rutaInicio
    : null;

  const [articulos, setArticulos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  const [lineaSeleccionada, setLineaSeleccionada] = useState("");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("");
  const [sinEvaluadores, setSinEvaluadores] = useState(false);
  const [criterios, setCriterios] = useState({ lineas: [], estados: [] });

  useEffect(() => {
    let activo = true;

    const solicitud =
      modo === "propios"
        ? listarArticulosPropios(sesion?.tokenAcceso)
        : listarArticulos(sesion?.tokenAcceso, {
            idLinea: lineaSeleccionada,
            estado: estadoSeleccionado,
            sinEvaluadores,
            modo,
          });

    solicitud

      .then((datos) => {
        if (activo) setArticulos(datos);
      })
      .catch((error) => {
        if (activo) {
          setError(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el listado. Intenta de nuevo.",
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [
    intento,
    sesion?.tokenAcceso,
    lineaSeleccionada,
    estadoSeleccionado,
    sinEvaluadores,
    modo,
  ]);

  useEffect(() => {
    if (!config.conFiltros) return undefined;

    let activo = true;

    obtenerCriteriosFiltrado(sesion?.tokenAcceso)
      .then((datos) => {
        if (activo) setCriterios(datos);
      })
      .catch(() => {
        // Si falla, el listado sigue funcionando y los filtros quedan en "todos".
      });

    return () => {
      activo = false;
    };
  }, [sesion?.tokenAcceso, modo, config.conFiltros]);

  function cerrarDetalle() {
    const nuevosParametros = new URLSearchParams(parametros);
    nuevosParametros.delete("detalle");
    establecerParametros(nuevosParametros);
  }

  function reintentar() {
    setError("");
    setCargando(true);
    setIntento((n) => n + 1);
  }

  const total = articulos.length;
  const hayFiltrosActivos =
    config.conFiltros &&
    Boolean(lineaSeleccionada || estadoSeleccionado || sinEvaluadores);

  function limpiarFiltros() {
    setCargando(true);
    setError("");
    setLineaSeleccionada("");
    setEstadoSeleccionado("");
    setSinEvaluadores(false);
  }

  return (
    <div className="relative min-h-screen bg-page font-sans text-fg antialiased selection:bg-brand selection:text-brand-fg">
      {/* Barra superior*/}
      <div className="fixed inset-x-0 top-0 z-50 h-1 bg-gradient-to-r from-brand via-highlight to-brand" />

      {/* Principal */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--color-soft)_0%,transparent_60%)] opacity-60" />

      <header className="sticky top-1 z-40 border-b border-line bg-panel/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Marca compacta />

          {/*sección */}
          <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            <span className="font-medium text-fg">Artículos</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted">
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            className="h-3.5 w-3.5"
          >
            <path
              d="M2 5.5A1.5 1.5 0 0 1 3.5 4h3l1.5 1.5h5A1.5 1.5 0 0 1 14.5 7v5.5A1.5 1.5 0 0 1 13 14H3.5A1.5 1.5 0 0 1 2 12.5v-7z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          {rutaInicioRol ? (
            <Link
              to={rutaInicioRol}
              className="transition-colors hover:text-fg"
            >
              {config.seccion}
            </Link>
          ) : (
            <span>{config.seccion}</span>
          )}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            className="h-3 w-3 text-line"
          >
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-medium text-fg">Artículos</span>
        </nav>
        {/* Encabezado */}
        <section className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            {config.etiqueta}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand">
            {config.titulo}
          </h1>
          <div className="mt-3 h-1 w-12 rounded-full bg-brand" />
          <p className="mt-3 max-w-2xl text-sm text-muted">
            {config.descripcion}
          </p>
        </section>
        {/* Contenedor lista */}
        <section className="overflow-hidden bg-panel shadow-md">
          <div className="h-1 w-full bg-gradient-to-r from-brand via-highlight to-brand" />

          {/* Filtros listado */}
          {config.conFiltros && (
            <div className="grid gap-4 border-b-2 border-line bg-soft/40 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:px-6">
              <div>
                <label
                  htmlFor="filtro-linea"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-fg"
                >
                  Línea temática
                </label>

                <select
                  id="filtro-linea"
                  value={lineaSeleccionada}
                  onChange={(evento) =>
                    setLineaSeleccionada(evento.target.value)
                  }
                  className="select select-bordered min-h-12 w-full rounded-none border-2 border-highlight bg-panel px-4 text-sm font-medium text-fg shadow-sm outline-none focus:border-brand focus:outline-none focus:ring-4 focus:ring-highlight/25"
                >
                  <option value="">Todas las líneas</option>

                  {criterios.lineas.map((linea) => (
                    <option key={linea.valor} value={linea.valor}>
                      {linea.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="filtro-estado"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-fg"
                >
                  Estado
                </label>

                <select
                  id="filtro-estado"
                  value={estadoSeleccionado}
                  onChange={(evento) =>
                    setEstadoSeleccionado(evento.target.value)
                  }
                  className="select select-bordered min-h-12 w-full rounded-none border-2 border-highlight bg-panel px-4 text-sm font-medium text-fg shadow-sm outline-none focus:border-brand focus:outline-none focus:ring-4 focus:ring-highlight/25"
                >
                  <option value="">Todos los estados</option>

                  {criterios.estados.map((estadoFiltro) => (
                    <option key={estadoFiltro.valor} value={estadoFiltro.valor}>
                      {infoEstado(estadoFiltro.valor).etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              {sesion?.rolActivo === "COMITE" && (
                <label className="flex min-h-12 cursor-pointer items-center gap-3 border-2 border-highlight bg-panel px-4 text-sm font-semibold text-fg">
                  <input
                    type="checkbox"
                    checked={sinEvaluadores}
                    onChange={(evento) =>
                      setSinEvaluadores(evento.target.checked)
                    }
                    className="checkbox checkbox-sm rounded-none border-highlight"
                  />
                  Sin evaluadores
                </label>
              )}

              <button
                type="button"
                onClick={limpiarFiltros}
                disabled={!hayFiltrosActivos}
                className="btn btn-outline min-h-12 rounded-none border-2 border-highlight bg-panel px-5 text-sm font-bold text-brand shadow-sm transition hover:border-brand hover:bg-brand hover:text-brand-fg disabled:cursor-not-allowed disabled:border-line disabled:bg-soft disabled:text-muted disabled:opacity-60"
              >
                Limpiar filtros
              </button>
            </div>
          )}

          {/* Títulos columnas */}
          <div
            className={`hidden gap-4 border-b border-line bg-panel px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-muted sm:grid ${columnas}`}
          >
            <span>Título</span>
            {config.conAutor && <span>Autor</span>}
            <span>Línea Temática</span>
            <span>Fecha</span>
            <span>Estado</span>
            {modo === "propios" && <span>Acciones</span>}
          </div>

          {/* Cuerpo: carga, error, vacío o filas */}
          {cargando ? (
            <FilasEsqueleto
              columnas={columnas}
              conAutor={config.conAutor}
              conAcciones={modo === "propios"}
            />
          ) : error ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 bg-panel px-6 py-12 text-center"
            >
              <p className="text-sm font-medium text-fg">{error}</p>

              <button
                type="button"
                onClick={reintentar}
                className="rounded-md border border-line px-4 py-2 text-xs font-semibold transition-colors hover:bg-soft"
              >
                Reintentar
              </button>
            </div>
          ) : total === 0 && !hayFiltrosActivos ? (
            modo === "propios" ? (
              <EstadoVacioAutor />
            ) : (
              <EstadoVacio />
            )
          ) : total === 0 ? (
            <EstadoSinCoincidencias />
          ) : (
            <div className="divide-y divide-line bg-panel">
              {articulos.map((art) => {
                const estado = infoEstado(art.estado);
                const nombres = art.autores.map((autor) => autor.nombre);
                const autores =
                  nombres.length > 1
                    ? `${nombres[0]} +${nombres.length - 1}`
                    : (nombres[0] ?? "");

                const correoActual = sesion?.usuario?.correo?.toLowerCase();

                const coautores = art.autores.filter(
                  (autor) => autor.email?.toLowerCase() !== correoActual,
                );

                return (
                  <div
                    key={art.id}
                    className={`group relative grid cursor-pointer grid-cols-1 gap-3 px-6 py-4 transition-colors hover:bg-soft/50 focus-within:bg-soft/50 sm:items-center sm:gap-4 ${columnas}`}
                  >
                    <div className="min-w-0">
                      {/* Enlace estirado: toda la fila abre el detalle (CA existente). */}
                      <Link
                        to={`${ubicacion.pathname}?detalle=${art.id}`}
                        aria-label={`Consultar detalle de ${art.titulo}`}
                        title={`Consultar detalle de ${art.titulo}`}
                        className="block min-w-0 text-sm font-semibold text-fg outline-none transition-colors after:absolute after:inset-0 group-hover:text-highlight focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-highlight sm:truncate"
                      >
                        {art.titulo}
                      </Link>

                      {sesion?.rolActivo === "COMITE" && (
                        <Link
                          to={`/gestion/evaluadores/asignar/${art.id}`}
                          onClick={(evento) => evento.stopPropagation()}
                          className="relative z-20 mt-2 inline-flex min-h-9 items-center rounded-md border border-highlight bg-panel px-3 text-xs font-bold text-brand transition-colors hover:border-brand hover:bg-brand hover:text-brand-fg"
                        >
                          Consultar miembros disponibles
                        </Link>
                      )}

                      {!config.conAutor && coautores.length > 0 && (
                        <p className="mt-1 text-xs text-muted sm:truncate">
                          Coautores:{" "}
                          {coautores.map((autor) => autor.nombre).join(", ")}
                        </p>
                      )}
                    </div>

                    {config.conAutor && (
                      <span className="text-sm text-muted">
                        <span className="font-semibold text-fg sm:hidden">
                          Autor:{" "}
                        </span>
                        {autores}
                      </span>
                    )}

                    <div>
                      <span className="inline-flex items-center rounded-sm border border-line bg-soft/40 px-2 py-1 text-[10px] font-medium text-fg">
                        {art.linea}
                      </span>
                    </div>

                    <span className="text-xs tabular-nums text-muted">
                      <span className="font-semibold text-fg sm:hidden">
                        Fecha:{" "}
                      </span>
                      {formatearFecha(art.fecha)}
                    </span>

                    <div>
                      <span
                        className={`inline-flex items-center border-y border-r border-l-6 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${estado.clases}`}
                      >
                        {estado.etiqueta}
                      </span>
                    </div>

                    {sesion?.rolActivo === "COMITE" &&
                      art.evaluadores_asignados !== undefined && (
                        <span
                          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold ${
                            art.evaluadores_asignados === 0
                              ? "border-highlight bg-[#E6E49F]/35 text-fg"
                              : "border-line bg-soft/40 text-muted"
                          }`}
                        >
                          {art.evaluadores_asignados}/3 evaluadores
                        </span>
                      )}

                    {modo === "propios" && (
                      <div className="relative z-10 flex flex-wrap gap-2">
                        <Link
                          to={`/autor/articulos/${art.id}/editar`}
                          aria-label={`Editar el artículo ${art.titulo}`}
                          className="inline-flex min-h-9 items-center whitespace-nowrap rounded-md border border-highlight bg-panel px-3 py-1.5 text-xs font-bold text-brand transition-colors hover:border-brand hover:bg-brand hover:text-brand-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
                        >
                          Editar
                        </Link>
                        <Link
                          to={`/autor/articulos/${art.id}/versiones`}
                          aria-label={`Gestionar versiones de ${art.titulo}`}
                          className="inline-flex min-h-9 items-center whitespace-nowrap rounded-md border border-highlight bg-panel px-3 py-1.5 text-xs font-bold text-brand transition-colors hover:border-brand hover:bg-brand hover:text-brand-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
                        >
                          Gestionar versiones
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* Pie del listado */}
          <div className="border-t border-line bg-soft/40 px-4 py-4 text-xs text-muted sm:px-6">
            <span aria-live="polite">
              {cargando
                ? "Cargando artículos…"
                : error
                  ? "No fue posible consultar los artículos."
                  : `Mostrando ${total} artículos`}
            </span>
          </div>
        </section>
        <DetalleArticuloModal
          key={idDetalle ?? "sin-detalle"}
          idArticulo={idDetalle}
          alCerrar={cerrarDetalle}
        />{" "}
      </main>
    </div>
  );
}

export default ListadoArticulos;
