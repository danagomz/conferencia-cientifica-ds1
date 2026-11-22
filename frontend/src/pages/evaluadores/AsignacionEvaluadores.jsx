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

  const [busqueda, establecerBusqueda] = useState("");
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

  const evaluadoresFiltrados = evaluadores.filter((evaluador) => {
    const texto = [evaluador.nombre, evaluador.correo, evaluador.institucion]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return texto.includes(busqueda.trim().toLowerCase());
  });

  return (
    <div className="min-h-dvh bg-page font-sans text-fg">
      <header className="sticky top-0 z-40 border-b border-line bg-panel/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Marca compacta />

          <span className="hidden text-xs font-medium text-muted sm:inline">
            Miembros del comité
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <nav
          aria-label="Migas de pan"
          className="mb-6 flex flex-wrap items-center gap-2 text-sm"
        >
          <Link
            to="/comite"
            className="inline-flex min-h-10 items-center rounded-lg border border-line bg-panel px-3 font-semibold transition-colors hover:border-highlight hover:bg-[#E6E49F]/35"
          >
            Panel de comité
          </Link>

          <span aria-hidden="true" className="text-muted">
            /
          </span>

          <span
            aria-current="page"
            className="inline-flex min-h-10 items-center rounded-lg bg-soft px-3 font-bold"
          >
            Miembros del comité
          </span>
        </nav>

        <section className="mb-7">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            Comité científico
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand">
            Miembros disponibles
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Consulta los miembros disponibles del comité, su institución y su
            carga actual.{" "}
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

          <div className="border-b border-line px-5 py-4 sm:px-6">
            <label
              htmlFor="buscar-miembro-comite"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-fg"
            >
              Buscar miembro
            </label>

            {/* Aquí continúa tu input de búsqueda */}

            <input
              id="buscar-miembro-comite"
              type="search"
              value={busqueda}
              onChange={(evento) => establecerBusqueda(evento.target.value)}
              placeholder="Nombre, correo o institución"
              className="input input-bordered min-h-12 w-full rounded-none border-2 border-highlight bg-panel px-4 text-sm font-medium text-fg shadow-sm outline-none placeholder:text-muted/80 focus:border-brand focus:ring-4 focus:ring-highlight/25"
            />
          </div>

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
                      seleccionado ? "bg-[#E6E49F]/30" : "hover:bg-soft/50"
                    }`}
                  >
                    <div>
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
