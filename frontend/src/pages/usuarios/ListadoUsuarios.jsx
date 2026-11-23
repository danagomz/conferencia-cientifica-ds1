import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Marca } from "../../components/Marca";
import { obtenerUsuarios } from "../../autenticacion/solicitudes";
import { useAutenticacion } from "../../autenticacion/useAutenticacion";
import { ROLES_DISPONIBLES } from "../../autenticacion/roles";
import { useDebounce } from "../../hooks/useDebounce";

const ROLES_FILTRO = [
  { valor: "ADMIN", etiqueta: "Administrador" },
  { valor: "COMITE", etiqueta: "Comité científico" },
  { valor: "AUTOR", etiqueta: "Autor" },
];

function EstadoVacio() {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 bg-panel px-6 py-16 text-center"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-10 w-10 text-fg"
      >
        <path
          d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM16 4.5a3.5 3.5 0 0 1 0 6.8M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <p className="text-sm font-semibold text-fg">
        No hay usuarios registrados
      </p>

      <p className="max-w-sm text-xs text-muted">
        Los usuarios registrados aparecerán aquí cuando se conecte la consulta
        con el servidor.
      </p>
    </div>
  );
}

function EstadoSinResultados() {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 bg-panel px-6 py-16 text-center"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-10 w-10 text-muted"
      >
        <circle
          cx="11"
          cy="11"
          r="6.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="m16 16 4 4M8.5 11h5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      <p className="text-sm font-semibold text-fg">
        No se encontraron usuarios
      </p>

      <p className="max-w-sm text-xs text-muted">
        No hay usuarios que coincidan con los filtros seleccionados.
      </p>
    </div>
  );
}

function FilasEsqueleto() {
  return (
    <div role="status" className="divide-y divide-line bg-panel">
      <span className="sr-only">Cargando usuarios…</span>

      {Array.from({ length: 5 }, (_, indice) => (
        <div
          key={indice}
          aria-hidden="true"
          className="grid gap-3 px-6 py-5 sm:grid-cols-[1.2fr_1.2fr_1fr_1fr] sm:items-center sm:gap-5"
        >
          <div className="h-10 w-10 animate-pulse rounded-full bg-soft" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-soft" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-soft" />
          <div className="h-4 w-2/5 animate-pulse rounded bg-soft" />
        </div>
      ))}
    </div>
  );
}

function ControlesFiltrosUsuarios({
  nombre,
  rol,
  alCambiarNombre,
  alCambiarRol,
  alLimpiar,
  hayFiltrosActivos,
}) {
  return (
    <div className="border-b border-line bg-soft/20 px-4 py-4 sm:px-6">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-fg">Filtrar usuarios</h3>
        <p className="mt-1 text-xs text-muted">
          Combina los criterios para encontrar una cuenta específica.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.8fr)_auto] lg:items-end">
        <label className="form-control w-full">
          <span className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">
            Nombre
          </span>
          <input
            type="search"
            value={nombre}
            onChange={(evento) => alCambiarNombre(evento.target.value)}
            placeholder="Buscar por nombre"
            aria-label="Filtrar usuarios por nombre"
            className="input input-bordered min-h-12 w-full rounded-none border-2 border-highlight bg-panel px-4 text-sm font-medium text-fg shadow-sm outline-none placeholder:text-muted/80 focus:border-brand focus:outline-none focus:ring-4 focus:ring-highlight/25"
          />
        </label>

        <label className="form-control w-full">
          <span className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">
            Rol
          </span>
          <select
            value={rol}
            onChange={(evento) => alCambiarRol(evento.target.value)}
            aria-label="Filtrar usuarios por rol"
            className="select select-bordered min-h-12 w-full rounded-none border-2 border-highlight bg-panel px-4 text-sm font-medium text-fg shadow-sm outline-none focus:border-brand focus:outline-none focus:ring-4 focus:ring-highlight/25"
          >
            <option value="">Todos los roles</option>

            {ROLES_FILTRO.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={alLimpiar}
          disabled={!hayFiltrosActivos}
          className="btn btn-outline min-h-12 rounded-none border-2 border-highlight bg-panel px-5 text-sm font-bold text-brand shadow-sm transition hover:border-brand hover:bg-brand hover:text-brand-fg disabled:cursor-not-allowed disabled:border-line disabled:bg-soft disabled:text-muted disabled:opacity-60"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}

function inicialUsuario(usuario) {
  const nombre = usuario.first_name?.trim() || usuario.email?.trim() || "?";
  return nombre.charAt(0).toUpperCase();
}

function FilaUsuario({ usuario }) {
  const roles = Array.isArray(usuario.roles) ? usuario.roles : [];

  const nombreCompleto = [usuario.first_name, usuario.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid gap-3 border-b border-line px-6 py-5 last:border-b-0 sm:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto] sm:items-center sm:gap-5">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-label={`Inicial de ${nombreCompleto || usuario.email}`}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-fg"
        >
          {inicialUsuario(usuario)}
        </span>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">
            {nombreCompleto || "Nombre no registrado"}
          </p>

          <p className="mt-1 text-xs text-muted">Usuario registrado</p>
        </div>
      </div>

      <p className="truncate text-sm text-muted">{usuario.email}</p>

      <p className="truncate text-sm text-muted">
        {usuario.institucion || "Sin institución registrada"}
      </p>

      <div className="flex flex-wrap gap-2">
        {roles.length > 0 ? (
          roles.map((rol) => (
            <span
              key={rol}
              className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-muted"
            >
              {rol}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted">Sin roles</span>
        )}
      </div>

      <div className="flex items-center">
        <Link
          to={`/gestion/usuarios/${usuario.id}/editar`}
          state={{ origen: "listado-usuarios" }}
          aria-label={`Editar usuario ${nombreCompleto || usuario.email}`}
          className="inline-flex min-h-10 items-center justify-center border rounded-full border-brand px-3 text-sm font-lightbold text-brand transition hover:bg-brand hover:text-brand-fg"
        >
          Editar
        </Link>
      </div>
    </div>
  );
}

export function ListadoUsuarios() {
  const { sesion } = useAutenticacion();
  const [usuarios, establecerUsuarios] = useState([]);
  const [cargando, establecerCargando] = useState(true);
  const [error, establecerError] = useState("");
  const [intento, establecerIntento] = useState(0);
  const [nombreFiltro, establecerNombreFiltro] = useState("");
  const [rolFiltro, establecerRolFiltro] = useState("");
  const nombreFiltroAplicado = useDebounce(nombreFiltro, 400);

  useEffect(() => {
    let activo = true;

    obtenerUsuarios(sesion?.tokenAcceso, sesion?.rolActivo, {
      nombre: nombreFiltroAplicado,
      rol: rolFiltro,
    })
      .then((datos) => {
        if (activo) establecerUsuarios(datos);
      })
      .catch((errorSolicitud) => {
        if (activo) {
          establecerError(
            errorSolicitud instanceof Error
              ? errorSolicitud.message
              : "No se pudo cargar el listado de usuarios.",
          );
        }
      })
      .finally(() => {
        if (activo) establecerCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [
    sesion?.tokenAcceso,
    sesion?.rolActivo,
    nombreFiltroAplicado,
    rolFiltro,
    intento,
  ]);

  function reintentar() {
    establecerCargando(true);
    establecerError("");
    establecerIntento((actual) => actual + 1);
  }

  function limpiarFiltros() {
    establecerCargando(true);
    establecerError("");
    establecerNombreFiltro("");
    establecerRolFiltro("");
  }

  const hayFiltrosActivos = Boolean(nombreFiltro.trim() || rolFiltro);

  const rutaInicioRol = sesion?.rolActivo
    ? ROLES_DISPONIBLES[sesion.rolActivo]?.rutaInicio
    : null;

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
            <span className="font-medium text-fg">Usuarios</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
          {/* Icono de carpeta */}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            className="h-3.5 w-3.5 shrink-0 text-muted"
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
              className="group inline-flex items-center rounded-md px-2 py-1 -mx-2 text-muted transition-all duration-200 hover:bg-surface-hover hover:text-fg hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Gestión
              {/* Flecha*/}
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                className="ml-1 h-3 w-3 opacity-0 -translate-x-1 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
              >
                <path
                  d="M10 3L5 8l5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          ) : (
            <span>Gestión</span>
          )}

          {/* icono de carpeta*/}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            className="h-3 w-3 shrink-0 text-line"
          >
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Ubicación actual */}
          <span className="font-semibold text-fg">Usuarios</span>
        </nav>

        <section className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              Administración y comité científico
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand">
              Usuarios registrados
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Consulta la información de las cuentas registradas en el sistema.
            </p>
          </div>

          <Link
            to="/gestion/usuarios/nuevo"
            className="rounded-full inline-flex min-h-11 items-center justify-center bg-brand px-5 text-sm font-semibold text-brand-fg transition-colors hover:bg-brand-hover"
          >
            Crear usuario
          </Link>
        </section>

        <section
          aria-labelledby="titulo-listado-usuarios"
          className="overflow-hidden border border-line bg-panel shadow-sm"
        >
          <div className="border-b border-line px-6 py-4">
            <h2
              id="titulo-listado-usuarios"
              className="font-display text-lg font-bold text-fg"
            >
              Listado de usuarios
            </h2>
          </div>

          <ControlesFiltrosUsuarios
            nombre={nombreFiltro}
            rol={rolFiltro}
            alCambiarNombre={establecerNombreFiltro}
            alCambiarRol={establecerRolFiltro}
            alLimpiar={limpiarFiltros}
            hayFiltrosActivos={hayFiltrosActivos}
          />

          <div
            aria-hidden="true"
            className="hidden grid-cols-[1.2fr_1.2fr_1fr_1fr_auto] gap-5 border-b border-line bg-soft px-6 py-3 text-xs font-bold uppercase tracking-wide text-muted sm:grid"
          >
            <span>Nombre</span>
            <span>Correo electrónico</span>
            <span>Institución</span>
            <span>Roles</span>
            <span>Acciones</span>
          </div>

          {cargando ? (
            <FilasEsqueleto />
          ) : error ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 bg-panel px-6 py-16 text-center"
            >
              <p className="text-sm font-semibold text-fg">{error}</p>

              <button
                type="button"
                onClick={reintentar}
                className="border-b border-highlight pb-1 text-sm font-semibold text-highlight hover:text-brand"
              >
                Intentar nuevamente
              </button>
            </div>
          ) : usuarios.length === 0 ? (
            hayFiltrosActivos ? (
              <EstadoSinResultados />
            ) : (
              <EstadoVacio />
            )
          ) : (
            <div>
              {usuarios.map((usuario) => (
                <FilaUsuario key={usuario.id} usuario={usuario} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
