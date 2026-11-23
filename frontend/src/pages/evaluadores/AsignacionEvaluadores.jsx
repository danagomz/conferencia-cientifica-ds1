import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Marca } from "../../components/Marca";
import { useAutenticacion } from "../../autenticacion/useAutenticacion";
import {
  obtenerCandidatosEvaluadores,
  obtenerEvaluadoresAsignados,
  asignarEvaluadores,
} from "../../articulos/solicitudes";
export function AsignacionEvaluadores() {
  const { idArticulo } = useParams();
  const { sesion } = useAutenticacion();

  const [articulo, establecerArticulo] = useState(null);
  const [evaluadores, establecerEvaluadores] = useState([]);
  const [evaluadoresRequeridos, establecerEvaluadoresRequeridos] = useState(3);
  const [cargando, establecerCargando] = useState(true);
  const [error, establecerError] = useState("");

  const [seleccionados, establecerSeleccionados] = useState([]);
  const [guardando, establecerGuardando] = useState(false);
  const [mensajeAsignacion, establecerMensajeAsignacion] = useState("");

  function cambiarEvaluador(evaluador) {
    establecerMensajeAsignacion("");

    const yaSeleccionado = seleccionados.includes(evaluador.id);

    if (yaSeleccionado) {
      establecerSeleccionados((actuales) =>
        actuales.filter((id) => id !== evaluador.id),
      );
      return;
    }

    if (seleccionados.length >= 3) {
      establecerMensajeAsignacion(
        "Un artículo debe tener exactamente tres evaluadores.",
      );
      return;
    }

    establecerSeleccionados((actuales) => [...actuales, evaluador.id]);
  }

  async function confirmarAsignacion() {
    if (seleccionados.length !== 3) {
      establecerMensajeAsignacion(
        "Debes seleccionar exactamente tres evaluadores.",
      );
      return;
    }

    establecerGuardando(true);
    establecerMensajeAsignacion("");

    try {
      await asignarEvaluadores(sesion.tokenAcceso, idArticulo, seleccionados);

      establecerMensajeAsignacion("Evaluadores asignados correctamente.");
    } catch (errorSolicitud) {
      establecerMensajeAsignacion(
        errorSolicitud instanceof Error
          ? errorSolicitud.message
          : "No fue posible asignar los evaluadores",
      );
    } finally {
      establecerGuardando(false);
    }
  }

  useEffect(() => {
    let activo = true;

    obtenerCandidatosEvaluadores(sesion?.tokenAcceso, idArticulo)
      .then((datos) => {
        if (!activo) return;

        establecerArticulo(datos.articulo);
        establecerEvaluadores(datos.evaluadores);
        establecerEvaluadoresRequeridos(datos.evaluadoresRequeridos);
      })
      .catch((errorSolicitud) => {
        if (!activo) return;

        establecerError(
          errorSolicitud instanceof Error
            ? errorSolicitud.message
            : "No fue posible consultar los candidatos",
        );
      })
      .finally(() => {
        if (activo) establecerCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [sesion?.tokenAcceso, idArticulo]);

  useEffect(() => {
    let activo = true;

    obtenerEvaluadoresAsignados(sesion?.tokenAcceso, idArticulo)
      .then((datos) => {
        if (!activo) return;

        establecerSeleccionados(
          datos.evaluadores.map((evaluador) => evaluador.id),
        );
      })
      .catch((errorSolicitud) => {
        if (!activo) return;

        establecerMensajeAsignacion(
          errorSolicitud instanceof Error
            ? errorSolicitud.message
            : "No fue posible consultar evaluadores asignados",
        );
      });

    return () => {
      activo = false;
    };
  }, [sesion?.tokenAcceso, idArticulo]);

  const evaluadoresFiltrados = evaluadores;

  return (
    <div className="min-h-dvh bg-page font-sans text-fg">
      <header className="sticky top-0 z-40 border-b border-line bg-panel/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Marca compacta />

          <span className="hidden text-xs font-medium text-muted sm:inline">
            Asignación de evaluadores
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <nav
          aria-label="Migas de pan"
          className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted"
        >
          <Link
            to="/gestion/articulos"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-fg"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              className="h-3.5 w-3.5"
            >
              <path
                d="M2 5.5A1.5 1.5 0 0 1 3.5 4h3l1.5 1.5h5A1.5 1.5 0 0 1 14.5 7v5.5A1.5 1.5 0 0 1 13 14H3.5A1.5 1.5 0 0 1 2 12.5v-7Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            Artículos
          </Link>

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

          <span aria-current="page" className="font-medium text-fg">
            Asignar evaluadores
          </span>
        </nav>

        <section className="mb-7">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            Comité científico
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand">
            Asignar evaluadores
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Selecciona tres evaluadores para el artículo según su línea temática
            y su carga actual.
          </p>
        </section>

        <section className="border border-line bg-panel shadow-sm">
          {articulo && (
            <div className="border-b border-line bg-soft/30 px-5 py-4 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Artículo seleccionado
              </p>

              <p className="mt-1 font-semibold text-fg">{articulo.titulo}</p>

              <p className="mt-1 text-xs text-muted">
                Línea temática: {articulo.linea_tematica}
              </p>

              <p className="mt-1 text-xs text-muted">
                Evaluadores requeridos: {evaluadoresRequeridos}
              </p>
            </div>
          )}

          {cargando ? (
            <div role="status" className="px-6 py-16 text-center">
              <div className="mx-auto h-8 w-64 animate-pulse rounded bg-soft" />
            </div>
          ) : error ? (
            <div role="alert" className="px-6 py-16 text-center">
              <p className="text-sm font-semibold text-fg">{error}</p>
            </div>
          ) : evaluadoresFiltrados.length === 0 ? (
            <div role="status" className="px-6 py-16 text-center">
              <p className="text-sm font-semibold text-fg">
                No se encontraron miembros del comité
              </p>

              <p className="mt-2 text-xs text-muted">
                Cambia el criterio de búsqueda.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {evaluadoresFiltrados.map((evaluador) => {
                const seleccionado = seleccionados.includes(evaluador.id);

                return (
                  <label
                    key={evaluador.id}
                    className={`grid cursor-pointer gap-3 px-5 py-5 transition-colors sm:grid-cols-[1fr_auto] sm:items-center ${
                      seleccionado
                        ? "bg-[#E6E49F]/30"
                        : evaluador.coincide_linea_tematica
                          ? "bg-brand/5 hover:bg-[#E6E49F]/20"
                          : "hover:bg-soft/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-fg">
                        {evaluador.nombre}
                      </p>

                      <p className="mt-1 text-sm text-muted">
                        {evaluador.correo}
                      </p>

                      <p className="mt-2 text-xs text-muted">
                        Institución: {evaluador.institucion || "No registrada"}
                      </p>

                      <p className="mt-1 text-xs text-muted">
                        Artículos asignados:{" "}
                        {evaluador.articulos_asignados ?? 0}
                      </p>
                      {evaluador.coincide_linea_tematica ? (
                        <span className="mt-3 inline-flex rounded-full border border-highlight bg-panel px-3 py-1 text-xs font-bold text-highlight">
                          Coincide con la línea temática
                        </span>
                      ) : (
                        <span className="mt-3 inline-flex rounded-full border border-line bg-soft/40 px-3 py-1 text-xs font-semibold text-muted">
                          Línea temática diferente
                        </span>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(evaluador.lineas_tematicas ?? []).length > 0 ? (
                          evaluador.lineas_tematicas.map((linea) => (
                            <span
                              key={linea}
                              className="rounded-full border border-line bg-soft/40 px-3 py-1 text-xs font-semibold text-fg"
                            >
                              {linea}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-line bg-soft/40 px-3 py-1 text-xs text-muted">
                            Sin áreas registradas
                          </span>
                        )}
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={seleccionado}
                      onChange={() => cambiarEvaluador(evaluador)}
                      className="checkbox checkbox-sm rounded-none border-highlight"
                      aria-label={`Seleccionar a ${evaluador.nombre}`}
                    />
                  </label>
                );
              })}
            </div>
          )}
          <div className="border-t border-line px-5 py-5">
            <p className="mb-4 text-sm text-muted">
              Seleccionados: {seleccionados.length} de 3
            </p>

            {mensajeAsignacion && (
              <p role="status" className="mb-4 text-sm font-semibold text-fg">
                {mensajeAsignacion}
              </p>
            )}

            <button
              type="button"
              onClick={confirmarAsignacion}
              disabled={guardando || seleccionados.length !== 3}
              className="btn min-h-12 rounded-none bg-brand px-5 font-semibold text-brand-fg hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Asignar evaluadores"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
