import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Marca } from "../../components/Marca";
import { infoEstado } from "../../articulos/estados";
import { listarArticulos } from "../../articulos/solicitudes";
import { useAutenticacion } from "../../autenticacion/useAutenticacion";
import { ROLES_DISPONIBLES } from "../../autenticacion/roles";

const COLUMNAS = "sm:grid-cols-[1fr_160px_190px_110px_120px]";

function formatearFecha(valor) {
  const fecha = new Date(valor.length === 10 ? `${valor}T00:00:00` : valor);
  return fecha.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function FilasEsqueleto() {
  return (
    <div role="status" className="divide-y divide-line bg-panel">
      <span className="sr-only">Cargando artículos…</span>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`grid grid-cols-1 gap-3 px-6 py-4 sm:items-center sm:gap-4 ${COLUMNAS}`}
        >
          <div className="h-4 w-4/5 animate-pulse rounded bg-soft" />
          <div className="h-4 w-24 animate-pulse rounded bg-soft" />
          <div className="h-5 w-36 animate-pulse rounded bg-soft" />
          <div className="h-4 w-20 animate-pulse rounded bg-soft" />
          <div className="h-5 w-20 animate-pulse rounded bg-soft" />
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

function EstadoSinCoincidencias({ alLimpiar }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 bg-panel px-6 py-16 text-center"
    >
      <p className="text-sm font-semibold text-fg">
        No se encontraron artículos con esos filtros
      </p>
      <p className="max-w-xs text-xs text-muted">
        Cambia los criterios o límpialos para volver al listado.
      </p>
      <button
        type="button"
        onClick={alLimpiar}
        className="mt-2 border-b border-highlight pb-1 text-sm font-semibold text-highlight hover:text-brand"
      >
        Limpiar filtros
      </button>
    </div>
  );
}

function ListadoArticulos() {
  const { sesion } = useAutenticacion();
  const rutaInicioRol = sesion?.rolActivo
    ? ROLES_DISPONIBLES[sesion.rolActivo]?.rutaInicio
    : null;
  const [articulos, setArticulos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [lineaSeleccionada, setLineaSeleccionada] = useState("");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("");

  useEffect(() => {
    let activo = true;

    listarArticulos(sesion?.tokenAcceso)
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
  }, [intento, sesion?.tokenAcceso]);

  function reintentar() {
    setError("");
    setCargando(true);
    setIntento((n) => n + 1);
  }

  const lineasDisponibles = [
    ...new Set(articulos.map((articulo) => articulo.linea)),
  ].sort((a, b) => a.localeCompare(b, "es"));

  const estadosDisponibles = [
    ...new Set(articulos.map((articulo) => articulo.estado)),
  ];

  const articulosFiltrados = articulos.filter(
    (articulo) =>
      (!lineaSeleccionada || articulo.linea === lineaSeleccionada) &&
      (!estadoSeleccionado || articulo.estado === estadoSeleccionado),
  );

  const total = articulos.length;
  const totalFiltrado = articulosFiltrados.length;
  const hayFiltrosActivos = Boolean(lineaSeleccionada || estadoSeleccionado);

  function limpiarFiltros() {
    setLineaSeleccionada("");
    setEstadoSeleccionado("");
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
              Gestión
            </Link>
          ) : (
            <span>Gestión</span>
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
            Comité o Administrador
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand">
            Artículos postulados
          </h1>
          <div className="mt-3 h-1 w-12 rounded-full bg-brand" />
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Consulta las propuestas recibidas y el estado de cada artículo.
          </p>
        </section>

        {/* Contenedor lista */}
        <section className="overflow-hidden bg-panel shadow-md">
          <div className="h-1 w-full bg-gradient-to-r from-brand via-highlight to-brand" />

          {/* Filtros listado */}
          <div className="grid gap-4 border-b border-line bg-soft/20 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:px-6">
            <div>
              <label
                htmlFor="filtro-linea"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted"
              >
                Línea temática
              </label>
              <select
                id="filtro-linea"
                value={lineaSeleccionada}
                onChange={(evento) => setLineaSeleccionada(evento.target.value)}
                className="select min-h-11 w-full rounded-none border-line bg-panel text-sm text-fg focus:border-highlight focus:outline-none focus:ring-2 focus:ring-highlight/30"
              >
                <option value="">Todas las líneas</option>
                {lineasDisponibles.map((linea) => (
                  <option key={linea} value={linea}>
                    {linea}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filtro-estado"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted"
              >
                Estado
              </label>
              <select
                id="filtro-estado"
                value={estadoSeleccionado}
                onChange={(evento) =>
                  setEstadoSeleccionado(evento.target.value)
                }
                className="select min-h-11 w-full rounded-none border-line bg-panel text-sm text-fg focus:border-highlight focus:outline-none focus:ring-2 focus:ring-highlight/30"
              >
                <option value="">Todos los estados</option>
                {estadosDisponibles.map((estado) => (
                  <option key={estado} value={estado}>
                    {infoEstado(estado).etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={limpiarFiltros}
              disabled={!hayFiltrosActivos}
              className="min-h-11 border border-line px-4 text-sm font-semibold text-highlight transition hover:border-highlight hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpiar filtros
            </button>
          </div>

          {/* Títulos columnas */}
          <div
            className={`hidden gap-4 border-b border-line bg-panel px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-muted sm:grid ${COLUMNAS}`}
          >
            <span>Título</span>
            <span>Autor</span>
            <span>Línea Temática</span>
            <span>Fecha</span>
            <span>Estado</span>
          </div>

          {/* Cuerpo: carga, error, vacío o filas */}
          {cargando ? (
            <FilasEsqueleto />
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
          ) : total === 0 ? (
            <EstadoVacio />
          ) : totalFiltrado === 0 ? (
            <EstadoSinCoincidencias alLimpiar={limpiarFiltros} />
          ) : (
            <div className="divide-y divide-line bg-panel">
              {articulosFiltrados.map((art) => {
                const estado = infoEstado(art.estado);
                const nombres = art.autores.map((a) => a.nombre);
                const autores =
                  nombres.length > 1
                    ? `${nombres[0]} +${nombres.length - 1}`
                    : (nombres[0] ?? "");
                return (
                  <div
                    key={art.id}
                    className={`grid grid-cols-1 gap-3 px-6 py-4 transition-colors hover:bg-soft/50 sm:items-center sm:gap-4 ${COLUMNAS}`}
                  >
                    <span
                      title={art.titulo}
                      className="text-sm font-semibold text-fg sm:truncate"
                    >
                      {art.titulo}
                    </span>

                    <span className="text-sm text-muted">
                      <span className="font-semibold text-fg sm:hidden">
                        Autor:{" "}
                      </span>
                      {autores}
                    </span>

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
                        className={`inline-flex items-center border-y border-r border-l-6 border-line/100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${estado.clases}`}
                      >
                        {estado.etiqueta}
                      </span>
                    </div>
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
                  : `Mostrando ${totalFiltrado} de ${total} artículos`}
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ListadoArticulos;
