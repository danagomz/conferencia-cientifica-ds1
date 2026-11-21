import { useEffect, useState } from "react";
import { useAutenticacion } from "../autenticacion/useAutenticacion";
import { ROLES_DISPONIBLES, RUTA_ELEGIR_ROL } from "../autenticacion/roles";
import { Link, useNavigate } from "react-router-dom";
import { Marca } from "../components/Marca";

// Pantalla de inicio de cada rol.
export function InicioRol({ rol }) {
  const navegar = useNavigate();
  const { sesion, cerrarSesion } = useAutenticacion();
  const informacion = ROLES_DISPONIBLES[rol];
  const variosRoles = sesion.roles.length > 1;

  const [barraAbierta, establecerBarraAbierta] = useState(true);

  useEffect(() => {
    function cerrarConEscape(evento) {
      if (evento.key === "Escape") {
        establecerBarraAbierta(false);
      }
    }

    document.addEventListener("keydown", cerrarConEscape);

    return () => {
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, []);

  const opcionesAutor = [
    {
      texto: "Registrar un artículo",
      ruta: "/autor/articulos/nuevo",
    },
    {
      texto: "Mis artículos",
      ruta: "/autor/articulos",
    },
  ];

  const opcionesAdministracion = [
    {
      texto: "Consultar artículos",
      ruta: "/gestion/articulos",
    },
    {
      texto: "Consultar usuarios",
      ruta: "/gestion/usuarios",
    },
    {
      texto: "Crear usuario",
      ruta: "/gestion/usuarios/nuevo",
    },
    {
      texto: "Configurar fechas y líneas temáticas",
      ruta: "/configuracion-conferencia",
    },
  ];

  const opciones = rol === "AUTOR" ? opcionesAutor : opcionesAdministracion;

  const tarjetasDashboard =
    rol === "AUTOR"
      ? ["Mis artículos", "Artículos en revisión", "Próximas fechas"]
      : [
          "Artículos postulados",
          "Usuarios registrados",
          "Revisiones pendientes",
        ];

  return (
    <div className="flex min-h-dvh overflow-x-hidden bg-page font-sans text-fg">
      {barraAbierta && (
        <button
          type="button"
          aria-label="Cerrar barra lateral"
          onClick={() => establecerBarraAbierta(false)}
          className="fixed inset-0 z-40 bg-[#02111B]/30 lg:hidden"
        />
      )}

      {barraAbierta && (
        <aside className="fixed inset-y-0 left-0 z-50 w-[82vw] max-w-72 border-r border-line bg-panel shadow-xl lg:sticky lg:top-0 lg:h-dvh lg:w-72 lg:max-w-none lg:shadow-none">
          <div className="flex h-full flex-col">
            <div className="flex min-h-20 items-center justify-between border-b border-line px-5">
              <Marca compacta />

              <button
                type="button"
                onClick={() => establecerBarraAbierta(false)}
                aria-label="Cerrar barra lateral"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-soft hover:text-fg lg:hidden"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                >
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <nav
              aria-label="Navegación principal"
              className="flex-1 space-y-2 overflow-y-auto px-3 py-5"
            >
              {opciones.map((opcion) => (
                <Link
                  key={opcion.ruta}
                  to={opcion.ruta}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      establecerBarraAbierta(false);
                    }
                  }}
                  className="flex min-h-12 items-center rounded-lg px-4 text-sm font-semibold text-fg transition-colors hover:bg-[#E6E49F]/35 hover:text-brand"
                >
                  {opcion.texto}
                </Link>
              ))}
            </nav>
          </div>
        </aside>
      )}

      <div className="min-w-0 flex-1">
        <header className="border-b border-line bg-panel">
          <div className="flex min-h-20 items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => establecerBarraAbierta((abierta) => !abierta)}
                aria-label={
                  barraAbierta ? "Cerrar barra lateral" : "Abrir barra lateral"
                }
                aria-expanded={barraAbierta}
                className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-fg transition-colors hover:bg-[#E6E49F]/35 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight/40"
              >
                {barraAbierta ? (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5 transition-transform group-hover:scale-105"
                  >
                    <path
                      d="M5 5l14 14M19 5 5 19"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                  >
                    <path
                      d="M4 6h16M4 12h16M4 18h16"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">
                  {sesion.usuario.nombre}
                </p>

                <p className="text-xs text-muted">{informacion.nombre}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-4 text-sm">
              {variosRoles && (
                <button
                  type="button"
                  onClick={() => navegar(RUTA_ELEGIR_ROL)}
                  className="hidden font-semibold underline underline-offset-4 hover:text-highlight sm:inline"
                >
                  Cambiar de rol
                </button>
              )}

              <button
                type="button"
                onClick={cerrarSesion}
                className="rounded-lg border border-line px-3 py-2 font-semibold transition hover:border-highlight hover:bg-[#E6E49F]/35"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:px-12 lg:py-12">
          <section>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              {informacion.nombre}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand">
              Panel de {informacion.nombre.toLowerCase()}
            </h1>

            <span className="mt-3 block h-1.5 w-14 rounded-full bg-highlight" />

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              {informacion.descripcion}
            </p>
          </section>

          <section aria-labelledby="titulo-resumen" className="mt-10">
            <h2 id="titulo-resumen" className="text-xl font-bold text-fg">
              Resumen
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {tarjetasDashboard.map((titulo) => (
                <article
                  key={titulo}
                  aria-label={titulo}
                  className="min-h-36 border border-line bg-panel p-5 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">
                    {titulo}
                  </p>

                  <div className="mt-6 h-8 w-16 animate-pulse rounded bg-soft" />

                  <p className="mt-5 text-xs text-muted">Indicador pendiente</p>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
