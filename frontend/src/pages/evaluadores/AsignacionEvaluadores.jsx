import { useState } from "react";
import { Link } from "react-router-dom";
import { Marca } from "../../components/Marca";
import { EVALUADORES_MOCK } from "../../evaluadores/datosMock";

export function AsignacionEvaluadores() {
  const [busqueda, establecerBusqueda] = useState("");

  const evaluadoresFiltrados = EVALUADORES_MOCK.filter((evaluador) => {
    const texto = [evaluador.nombre, evaluador.correo, ...evaluador.lineas]
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
            Consulta los miembros del comité y sus líneas de conocimiento.
          </p>
        </section>

        <section className="border border-line bg-panel shadow-sm">
          <div className="border-b border-line px-5 py-4 sm:px-6">
            <label
              htmlFor="buscar-miembro-comite"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-fg"
            >
              Buscar miembro
            </label>

            <input
              id="buscar-miembro-comite"
              type="search"
              value={busqueda}
              onChange={(evento) => establecerBusqueda(evento.target.value)}
              placeholder="Nombre, correo o línea temática"
              className="input input-bordered min-h-12 w-full rounded-none border-2 border-highlight bg-panel px-4 text-sm font-medium text-fg shadow-sm outline-none placeholder:text-muted/80 focus:border-brand focus:ring-4 focus:ring-highlight/25"
            />
          </div>

          {evaluadoresFiltrados.length === 0 ? (
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
              {evaluadoresFiltrados.map((evaluador) => (
                <article
                  key={evaluador.id}
                  className="grid gap-3 px-5 py-5 transition-colors hover:bg-soft/50 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-fg">
                      {evaluador.nombre}
                    </p>

                    <p className="mt-1 text-sm text-muted">
                      {evaluador.correo}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {evaluador.lineas.map((linea) => (
                        <span
                          key={linea}
                          className="rounded-full border border-line bg-soft/40 px-3 py-1 text-xs font-semibold text-fg"
                        >
                          {linea}
                        </span>
                      ))}
                    </div>
                  </div>

                  <span className="w-fit rounded-full border border-highlight bg-panel px-3 py-1 text-xs font-bold text-highlight">
                    Miembro del comité
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
