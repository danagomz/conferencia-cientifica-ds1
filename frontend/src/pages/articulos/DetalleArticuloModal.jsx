import { useEffect, useState } from "react";
import { infoEstado } from "../../articulos/estados";
import { useAutenticacion } from "../../autenticacion/useAutenticacion";
import {
  obtenerArticulo,
  obtenerEvaluadoresAsignados,
} from "../../articulos/solicitudes";

function formatearFecha(valor) {
  if (!valor) return "Sin fecha registrada";

  const fecha = new Date(valor.length === 10 ? `${valor}T00:00:00` : valor);

  return fecha.toLocaleDateString("es-CO", {
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

function ListaAutores({ autores }) {
  if (!Array.isArray(autores) || autores.length === 0) {
    return <p className="text-sm text-muted">No hay autores registrados.</p>;
  }

  return (
    <div className="divide-y divide-line border-y border-line">
      {autores.map((autor, indice) => (
        <div
          key={`${autor.email ?? autor.nombre}-${indice}`}
          className="grid gap-1 px-4 py-4 sm:grid-cols-[1fr_auto]"
        >
          <div>
            <p className="font-semibold text-fg">{autor.nombre}</p>
            <p className="mt-1 text-sm text-muted">
              {autor.institucion || "Institución no registrada"}
            </p>
          </div>

          <p className="text-sm text-muted">{autor.email}</p>
        </div>
      ))}
    </div>
  );
}

function ListaVersiones({ versiones }) {
  if (!Array.isArray(versiones) || versiones.length === 0) {
    return (
      <p className="text-sm text-muted">
        No hay versiones registradas para este artículo.
      </p>
    );
  }

  return (
    <div className="divide-y divide-line border-y border-line">
      {versiones.map((version) => (
        <article
          key={version.id}
          className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto]"
        >
          <div>
            <p className="font-semibold text-fg">
              Versión {version.numero_version} · {version.tipo_version}
            </p>

            <p className="mt-1 text-sm text-muted">{version.nombre_archivo}</p>

            {version.observaciones && (
              <p className="mt-2 text-sm text-muted">{version.observaciones}</p>
            )}
          </div>

          <div className="text-sm text-muted sm:text-right">
            <p>{formatearTamano(version.tamano_bytes)}</p>
            <p className="mt-1">{formatearFecha(version.fecha_carga)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function EstadoDetalle({
  cargando,
  error,
  articulo,
  evaluadoresAsignados,
  cargandoAsignados,
  errorAsignados,
  rolActivo,
}) {
  if (cargando) {
    return (
      <div role="status" className="space-y-4">
        <span className="sr-only">Cargando detalle del artículo…</span>
        <div className="h-8 w-3/4 animate-pulse rounded bg-soft" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-soft" />
        <div className="h-32 animate-pulse rounded bg-soft" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="py-10 text-center">
        <p className="text-sm font-semibold text-fg">
          No se pudo consultar el artículo
        </p>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (!articulo) {
    return null;
  }

  const estado = infoEstado(articulo.estado);

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            {articulo.conferencia || "Conferencia científica"}
          </p>

          <h2
            id="titulo-detalle-articulo"
            className="mt-2 text-2xl font-bold tracking-tight text-fg"
          >
            {articulo.titulo}
          </h2>
        </div>

        <span
          className={`inline-flex w-fit items-center border-y border-r border-l-6 px-3 py-1 text-xs font-bold uppercase tracking-wider ${estado.clases}`}
        >
          {estado.etiqueta}
        </span>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Línea temática
          </p>
          <p className="mt-2 text-sm font-semibold text-fg">
            {articulo.linea || "Sin línea temática registrada"}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Fecha de postulación
          </p>
          <p className="mt-2 text-sm font-semibold text-fg">
            {formatearFecha(articulo.fecha)}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h3 className="text-lg font-bold text-fg">Resumen</h3>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted">
          {articulo.resumen || "No hay resumen registrado."}
        </p>
      </section>

      <section className="mt-8">
        <h3 className="text-lg font-bold text-fg">Palabras clave</h3>
        <p className="mt-3 text-sm text-muted">
          {articulo.palabras_clave || "No hay palabras clave registradas."}
        </p>
      </section>

      <section className="mt-8">
        <h3 className="text-lg font-bold text-fg">Autores</h3>
        <div className="mt-3">
          <ListaAutores autores={articulo.autores} />
        </div>
      </section>

      {["ADMIN", "COMITE"].includes(rolActivo) && (
        <section className="mt-8">
          <h3 className="text-lg font-bold text-fg">Evaluadores asignados</h3>

          {cargandoAsignados ? (
            <p className="mt-3 text-sm text-muted">
              Cargando evaluadores asignados…
            </p>
          ) : errorAsignados ? (
            <p role="alert" className="mt-3 text-sm text-red-800">
              {errorAsignados}
            </p>
          ) : evaluadoresAsignados.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Este artículo todavía no tiene evaluadores asignados.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-line border-y border-line">
              {evaluadoresAsignados.map((evaluador) => (
                <article
                  key={evaluador.id_asignacion ?? evaluador.id}
                  className="px-4 py-4"
                >
                  <p className="font-semibold text-fg">
                    {evaluador.nombre || "Evaluador"}
                  </p>

                  {evaluador.correo && (
                    <p className="mt-1 text-sm text-muted">
                      {evaluador.correo}
                    </p>
                  )}

                  {evaluador.fecha_asignacion && (
                    <p className="mt-1 text-xs text-muted">
                      Asignado el: {formatearFecha(evaluador.fecha_asignacion)}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      <section className="mt-8">
        <h3 className="text-lg font-bold text-fg">Versiones y documentos</h3>
        <div className="mt-3">
          <ListaVersiones versiones={articulo.versiones} />
        </div>
      </section>

      <section className="mt-8 border-t border-line pt-6">
        <h3 className="text-lg font-bold text-fg">Cesión de derechos</h3>

        <p className="mt-2 text-sm text-muted">
          {articulo.cesion?.cargada
            ? `Documento cargado el ${formatearFecha(articulo.cesion.fecha)}.`
            : "No hay documento de cesión cargado."}
        </p>
      </section>

      {Array.isArray(articulo.evaluaciones) && (
        <section className="mt-8 border-t border-line pt-6">
          <h3 className="text-lg font-bold text-fg">Evaluaciones</h3>

          <p className="mt-2 text-sm text-muted">
            Las evaluaciones se mostrarán según los permisos del usuario.
          </p>
        </section>
      )}
    </>
  );
}

export function DetalleArticuloModal({ idArticulo, alCerrar }) {
  const { sesion } = useAutenticacion();
  const [articulo, establecerArticulo] = useState(null);
  const [cargando, establecerCargando] = useState(Boolean(idArticulo));
  const [error, establecerError] = useState("");
  const [evaluadoresAsignados, establecerEvaluadoresAsignados] = useState([]);
  const [cargandoAsignados, establecerCargandoAsignados] = useState(false);
  const [errorAsignados, establecerErrorAsignados] = useState("");

  useEffect(() => {
    if (!idArticulo) {
      return undefined;
    }

    let activo = true;

    obtenerArticulo(sesion?.tokenAcceso, idArticulo)
      .then((datos) => {
        if (activo) {
          establecerArticulo(datos);
        }
      })
      .catch((errorSolicitud) => {
        if (activo) {
          establecerError(
            errorSolicitud instanceof Error
              ? errorSolicitud.message
              : "No se pudo consultar el artículo.",
          );
        }
      })
      .finally(() => {
        if (activo) {
          establecerCargando(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [idArticulo, sesion?.tokenAcceso]);

  useEffect(() => {
    if (!idArticulo) return undefined;

    const puedeConsultar = ["ADMIN", "COMITE"].includes(sesion?.rolActivo);

    if (!puedeConsultar) return undefined;

    let activo = true;

    obtenerEvaluadoresAsignados(sesion?.tokenAcceso, idArticulo)
      .then((datos) => {
        if (activo) {
          establecerEvaluadoresAsignados(datos.evaluadores);
        }
      })
      .catch((errorSolicitud) => {
        if (activo) {
          establecerErrorAsignados(
            errorSolicitud instanceof Error
              ? errorSolicitud.message
              : "No fue posible consultar los evaluadores.",
          );
        }
      })
      .finally(() => {
        if (activo) {
          establecerCargandoAsignados(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [idArticulo, sesion?.tokenAcceso, sesion?.rolActivo]);
  if (!idArticulo) return null;

  return (
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-detalle-articulo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) {
          alCerrar();
        }
      }}
    >
      <div className="modal-box max-w-4xl rounded-none border border-line bg-panel p-0 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel px-5 py-4">
          <p className="text-sm font-bold text-fg">Detalle del artículo</p>

          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar detalle del artículo"
            className="btn btn-sm btn-circle btn-ghost text-lg text-fg hover:bg-soft"
          >
            ×
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto px-5 py-6 sm:px-8">
          <EstadoDetalle
            cargando={cargando}
            error={error}
            articulo={articulo}
            evaluadoresAsignados={evaluadoresAsignados}
            cargandoAsignados={cargandoAsignados}
            errorAsignados={errorAsignados}
            rolActivo={sesion?.rolActivo}
          />
        </div>
      </div>
    </div>
  );
}
