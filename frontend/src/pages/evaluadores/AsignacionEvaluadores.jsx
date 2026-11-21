import { useState } from "react";
import { Link } from "react-router-dom";
import { Marca } from "../../components/Marca";
import {
  ARTICULOS_PENDIENTES_MOCK,
  EVALUADORES_MOCK,
} from "../../evaluadores/datosMock";

export function AsignacionEvaluadores() {
  const [articuloSeleccionado, establecerArticuloSeleccionado] = useState(
    ARTICULOS_PENDIENTES_MOCK[0],
  );

  const [evaluadoresSeleccionados, establecerEvaluadoresSeleccionados] =
    useState([]);

  const [mensaje, establecerMensaje] = useState("");
  const [guardado, establecerGuardado] = useState(false);

  function cambiarArticulo(articulo) {
    establecerArticuloSeleccionado(articulo);
    establecerEvaluadoresSeleccionados([]);
    establecerMensaje("");
    establecerGuardado(false);
  }

  function cambiarEvaluador(evaluador) {
    establecerGuardado(false);
    establecerMensaje("");

    const seleccionado = evaluadoresSeleccionados.some(
      (item) => item.id === evaluador.id,
    );

    if (seleccionado) {
      establecerEvaluadoresSeleccionados((actuales) =>
        actuales.filter((item) => item.id !== evaluador.id),
      );
      return;
    }

    if (evaluadoresSeleccionados.length >= 3) {
      establecerMensaje("Un artículo debe tener exactamente tres evaluadores.");
      return;
    }

    establecerEvaluadoresSeleccionados((actuales) => [...actuales, evaluador]);
  }

  function confirmarAsignacion() {
    if (evaluadoresSeleccionados.length !== 3) {
      establecerMensaje("Selecciona exactamente tres evaluadores.");
      return;
    }

    const algunAutor = evaluadoresSeleccionados.some((evaluador) =>
      articuloSeleccionado.autores.includes(evaluador.correo),
    );

    if (algunAutor) {
      establecerMensaje(
        "Un autor no puede ser evaluador de su propio artículo.",
      );
      return;
    }

    establecerMensaje(
      "Asignación preparada correctamente. Pendiente de integración con el servidor.",
    );
    establecerGuardado(true);
  }

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
            Selecciona tres evaluadores pertenecientes al comité según la línea
            temática del artículo.
          </p>
        </section>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <section
            aria-labelledby="articulos-pendientes"
            className="border border-line bg-panel"
          >
            <div className="border-b border-line px-5 py-4">
              <h2 id="articulos-pendientes" className="font-bold text-fg">
                Artículos pendientes
              </h2>
            </div>

            <div className="divide-y divide-line">
              {ARTICULOS_PENDIENTES_MOCK.map((articulo) => {
                const seleccionado = articuloSeleccionado.id === articulo.id;

                return (
                  <button
                    key={articulo.id}
                    type="button"
                    onClick={() => cambiarArticulo(articulo)}
                    className={`w-full px-5 py-5 text-left transition-colors ${
                      seleccionado ? "bg-[#E6E49F]/30" : "hover:bg-soft/60"
                    }`}
                  >
                    <p className="text-sm font-bold leading-5 text-fg">
                      {articulo.titulo}
                    </p>

                    <p className="mt-2 text-xs text-muted">
                      Línea temática: {articulo.linea}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section
            aria-labelledby="evaluadores-disponibles"
            className="min-w-0 border border-line bg-panel"
          >
            <div className="border-b border-line px-5 py-4">
              <h2 id="evaluadores-disponibles" className="font-bold text-fg">
                Evaluadores disponibles
              </h2>

              <p className="mt-1 text-xs text-muted">
                Seleccionados: {evaluadoresSeleccionados.length} de 3
              </p>
            </div>

            {articuloSeleccionado && (
              <div className="border-b border-line bg-soft/30 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Artículo seleccionado
                </p>
                <p className="mt-1 font-semibold text-fg">
                  {articuloSeleccionado.titulo}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Línea: {articuloSeleccionado.linea}
                </p>
              </div>
            )}

            <div className="divide-y divide-line">
              {EVALUADORES_MOCK.map((evaluador) => {
                const seleccionado = evaluadoresSeleccionados.some(
                  (item) => item.id === evaluador.id,
                );

                const coincide = evaluador.lineas.includes(
                  articuloSeleccionado.linea,
                );

                const esAutor = articuloSeleccionado.autores.includes(
                  evaluador.correo,
                );

                const deshabilitado =
                  seleccionado === false &&
                  evaluadoresSeleccionados.length >= 3;

                return (
                  <label
                    key={evaluador.id}
                    className={`grid cursor-pointer gap-3 px-5 py-4 transition-colors sm:grid-cols-[1fr_auto] sm:items-center ${
                      seleccionado ? "bg-[#E6E49F]/25" : "hover:bg-soft/50"
                    } ${deshabilitado ? "opacity-60" : ""}`}
                  >
                    <div>
                      <p className="text-sm font-bold text-fg">
                        {evaluador.nombre}
                      </p>

                      <p className="mt-1 text-xs text-muted">
                        {evaluador.correo}
                      </p>

                      <p className="mt-2 text-xs text-muted">
                        Áreas: {evaluador.lineas.join(", ")}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {coincide && (
                        <span className="rounded-full border border-highlight bg-panel px-3 py-1 text-xs font-semibold text-highlight">
                          Coincide con la línea
                        </span>
                      )}

                      {esAutor && (
                        <span className="rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
                          Es autor
                        </span>
                      )}

                      <input
                        type="checkbox"
                        checked={seleccionado}
                        disabled={deshabilitado || esAutor}
                        onChange={() => cambiarEvaluador(evaluador)}
                        className="checkbox checkbox-sm rounded-none border-highlight"
                        aria-label={`Seleccionar a ${evaluador.nombre}`}
                      />
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="border-t border-line px-5 py-5">
              {mensaje && (
                <p
                  role="status"
                  className={`mb-4 text-sm ${
                    guardado ? "text-brand" : "text-red-800"
                  }`}
                >
                  {mensaje}
                </p>
              )}

              <button
                type="button"
                onClick={confirmarAsignacion}
                disabled={evaluadoresSeleccionados.length !== 3}
                className="btn min-h-12 rounded-none bg-brand px-5 font-semibold text-brand-fg hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmar asignación
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
