import { Marca } from "../../components/Marca";

function ListadoArticulos() {
  // Datos de prueba
  const articulos = [
    {
      id: 1,
      titulo: "Optimización de modelos de lenguaje para el análisis de datos",
      autor: "María González",
      linea: "Sistemas Inteligentes",
      fecha: "12 Oct 2023",
      estado: "En revisión",
      estadoClases: "border-l-brand bg-brand/5 text-brand",
    },
    {
      id: 2,
      titulo: "Arquitecturas de microservicios escalables en la nube",
      autor: "Carlos Rodríguez",
      linea: "Tecnologías en Informática",
      fecha: "05 Nov 2023",
      estado: "Aceptado",
      estadoClases: "border-l-highlight bg-highlight/10 text-highlight",
    },
    {
      id: 3,
      titulo: "Impacto de la gamificación en el aprendizaje de algoritmos",
      autor: "Ana Martínez",
      linea: "Educación en Informática",
      fecha: "20 Nov 2023",
      estado: "En revisión",
      estadoClases: "border-l-brand bg-brand/5 text-brand",
    },
    {
      id: 4,
      titulo: "Metodologías ágiles aplicadas al desarrollo de software seguro",
      autor: "Luis Pérez",
      linea: "Software en la práctica",
      fecha: "01 Dic 2023",
      estado: "Rechazado",
      estadoClases: "border-l-muted bg-muted/5 text-muted",
    },
  ];

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
          <span className="transition-colors hover:text-fg">Gestión</span>
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
            Consulte las propuestas recibidas y el estado de cada artículo.
          </p>
        </section>

        {/* Contenedor lista */}
        <section className="overflow-hidden bg-panel shadow-md">
          <div className="h-1 w-full bg-gradient-to-r from-brand via-highlight to-brand" />

          {/* Filtros */}
          <div className="flex w-full items-center overflow-x-auto border-b border-line bg-soft/20 px-4 py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line/50 bg-soft/60 p-1">
              <span className="inline-flex cursor-default items-center gap-2 whitespace-nowrap rounded-md border border-line/50 bg-panel px-3 py-1.5 text-xs font-semibold text-brand shadow-sm">
                Todos
                <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-brand-fg">
                  4
                </span>
              </span>

              <span className="inline-flex cursor-default items-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-soft hover:text-fg">
                En revisión
              </span>
              <span className="inline-flex cursor-default items-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-soft hover:text-fg">
                Aceptados
              </span>
              <span className="inline-flex cursor-default items-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-soft hover:text-fg">
                Rechazados
              </span>
            </div>
          </div>

          {/* Barra Buscador */}
          <div className="flex flex-col gap-4 border-b border-line border-l-4 border-l-brand bg-soft/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="text-base font-semibold text-fg">
              Listado de artículos
            </h2>

            <div className="flex w-full sm:w-auto">
              <span className="pointer-events-none flex w-full items-center gap-2 rounded-md border border-line bg-panel px-4 py-2 text-sm text-muted opacity-80 sm:w-64 transition-colors hover:border-highlight/50">
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                  <circle
                    cx="7"
                    cy="7"
                    r="4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M10.5 10.5L13 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Buscar artículos...
              </span>
            </div>
          </div>

          {/* Títulos columnas */}
          <div className="hidden grid-cols-[1fr_140px_190px_100px_110px] gap-4 border-b border-line bg-panel px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-muted sm:grid">
            <span>Título</span>
            <span>Autor</span>
            <span>Línea Temática</span>
            <span>Fecha</span>
            <span>Estado</span>
          </div>

          {/* Filas de datos */}
          <div className="divide-y divide-line bg-panel">
            {articulos.map((art) => (
              <div
                key={art.id}
                className="grid grid-cols-1 gap-3 px-6 py-4 transition-colors hover:bg-soft/50 sm:grid-cols-[1fr_140px_190px_100px_110px] sm:items-center sm:gap-4"
              >
                {/* Título */}
                <span className="truncate text-sm font-semibold text-fg">
                  {art.titulo}
                </span>

                {/* Autor */}
                <span className="text-sm text-muted">{art.autor}</span>

                {/* Línea Temática*/}
                <div>
                  <span className="inline-flex items-center rounded-sm border border-line bg-soft/40 px-2 py-1 text-[10px] font-medium text-fg">
                    {art.linea}
                  </span>
                </div>

                {/* Fecha */}
                <span className="text-xs text-muted tabular-nums">
                  {art.fecha}
                </span>

                {/* Estado */}
                <div>
                  <span
                    className={`inline-flex items-center border-y border-r border-l-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border-line/50 ${art.estadoClases}`}
                  >
                    {art.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pie de tabla */}
          <div className="flex items-center justify-between bg-soft/40 px-6 py-4 text-xs text-muted">
            <span className="tabular-nums">Mostrando 4 de 4</span>

            <div className="flex items-center gap-2 opacity-50">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-line bg-panel">
                <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                  <path
                    d="M10 4L6 8l4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <span className="px-1 font-medium text-fg">
                1 <span className="font-normal text-muted">/</span> 1
              </span>

              <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-line bg-panel">
                <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ListadoArticulos;
