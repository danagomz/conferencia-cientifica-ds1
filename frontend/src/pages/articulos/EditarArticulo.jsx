import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { infoEstado } from "../../articulos/estados";
import {
  actualizarArticulo,
  consultarArticuloParaEditar,
  consultarConvocatoriaArticulo,
} from "../../articulos/solicitudes";
import {
  hayCambios,
  validarDatosArticulo,
} from "../../articulos/validarArticulo";
import { useAutenticacion } from "../../autenticacion/useAutenticacion";
import { Marca } from "../../components/Marca";
import { AlertaFormulario } from "../../components/AlertaFormulario";

const RUTA_MIS_ARTICULOS = "/autor/articulos";

// Estados en los que el autor todavía puede modificar los datos generales.
const ESTADOS_EDITABLES = ["REGISTRADO"];

// Campo del servidor → campo del formulario.
const CAMPOS_FORMULARIO = {
  titulo: "titulo",
  resumen: "resumen",
  palabras_clave: "palabrasClave",
  id_linea: "idLinea",
};

const claseCampo =
  "input input-bordered mt-2 min-h-12 w-full rounded-xl border !border-slate-300 bg-slate-50/70 px-4 text-slate-900 shadow-2xs outline-none transition placeholder:text-slate-500 hover:!border-slate-400 focus:!border-slate-700 focus:bg-white focus:ring-2 focus:ring-slate-500/20";
const claseErrorCampo = "mt-2 text-sm font-medium text-red-700";
const claseBotonSecundario =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 shadow-2xs transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900";
function fechaLegible(fecha) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Línea actual del artículo más las líneas habilitadas de su convocatoria.
function construirOpcionesLinea(articulo, convocatoria) {
  const disponibles = convocatoria?.lineas ?? [];
  const actualDisponible = disponibles.some(
    (linea) => String(linea.id) === String(articulo.id_linea),
  );
  if (actualDisponible) return disponibles;
  return [{ id: articulo.id_linea, nombre: articulo.linea }, ...disponibles];
}

// Devuelve el motivo por el que el artículo ya no se puede modificar, o "".
function motivoNoEditable(articulo, convocatoria) {
  if (!ESTADOS_EDITABLES.includes(articulo.estado)) {
    return `El artículo está en estado «${infoEstado(articulo.estado).etiqueta}» y ya no se puede modificar.`;
  }
  if (convocatoria && !convocatoria.abierto) {
    const fecha = convocatoria.fechaLimite
      ? ` (fecha límite: ${fechaLegible(convocatoria.fechaLimite)})`
      : "";
    return `El plazo de postulación de la convocatoria no está abierto${fecha}, por lo que el artículo ya no se puede modificar.`;
  }
  return "";
}

export function EditarArticulo() {
  const { id } = useParams();
  const { sesion } = useAutenticacion();

  const [articulo, establecerArticulo] = useState(null);
  const [convocatoria, establecerConvocatoria] = useState(null);
  const [valores, establecerValores] = useState({
    titulo: "",
    resumen: "",
    palabrasClave: "",
    idLinea: "",
  });
  const [erroresCampos, establecerErroresCampos] = useState({});
  const [cargando, establecerCargando] = useState(true);
  const [errorCarga, establecerErrorCarga] = useState(null);
  const [intento, establecerIntento] = useState(0);
  const [estadoEnvio, establecerEstadoEnvio] = useState("inactivo");
  const [alerta, establecerAlerta] = useState(null);
  const contadorAlertas = useRef(0);

  useEffect(() => {
    let vigente = true;

    async function cargarDatos() {
      try {
        const datos = await consultarArticuloParaEditar(
          sesion?.tokenAcceso,
          id,
        );
        // Si no se puede consultar el contexto, decide el servidor al guardar.
        const datosConvocatoria = await consultarConvocatoriaArticulo(
          sesion?.tokenAcceso,
          datos.id_conferencia,
        ).catch(() => null);

        if (!vigente) return;

        establecerArticulo(datos);
        establecerConvocatoria(datosConvocatoria);
        establecerValores({
          titulo: datos.titulo ?? "",
          resumen: datos.resumen ?? "",
          palabrasClave: datos.palabras_clave ?? "",
          idLinea: String(datos.id_linea ?? ""),
        });
      } catch (errorConsulta) {
        if (!vigente) return;
        establecerErrorCarga({
          mensaje:
            errorConsulta instanceof Error
              ? errorConsulta.message
              : "No fue posible cargar el artículo",
          estadoHttp: errorConsulta?.estadoHttp ?? null,
        });
      } finally {
        if (vigente) establecerCargando(false);
      }
    }

    cargarDatos();

    return () => {
      vigente = false;
    };
  }, [id, intento, sesion?.tokenAcceso]);

  const opcionesLinea = articulo
    ? construirOpcionesLinea(articulo, convocatoria)
    : [];
  const motivoBloqueo = articulo
    ? motivoNoEditable(articulo, convocatoria)
    : "";
  const editable = motivoBloqueo === "";
  const enviando = estadoEnvio === "enviando";
  const sinAutorizacion =
    errorCarga?.estadoHttp === 403 || errorCarga?.estadoHttp === 404;

  function reintentar() {
    establecerErrorCarga(null);
    establecerCargando(true);
    establecerIntento((n) => n + 1);
  }

  function mostrarAlerta(tipo, mensaje, detalles = [], enlace = null) {
    contadorAlertas.current += 1;
    establecerAlerta({
      id: contadorAlertas.current,
      tipo,
      mensaje,
      detalles,
      enlace,
    });
  }

  function cambiarCampo(campo, valor) {
    establecerValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    establecerErroresCampos((anteriores) => {
      if (!anteriores[campo]) return anteriores;
      const restantes = { ...anteriores };
      delete restantes[campo];
      return restantes;
    });
  }

  async function enviarFormulario(evento) {
    evento.preventDefault();
    if (!editable) return;

    establecerErroresCampos({});
    establecerAlerta(null);
    const erroresLocales = validarDatosArticulo(
      valores,
      opcionesLinea.map((linea) => String(linea.id)),
    );
    if (Object.keys(erroresLocales).length > 0) {
      establecerErroresCampos(erroresLocales);
      mostrarAlerta(
        "error",
        "Revisa los campos señalados antes de guardar los cambios.",
        Object.values(erroresLocales),
      );
      return;
    }

    if (!hayCambios(articulo, valores)) {
      mostrarAlerta(
        "error",
        "No realizaste ningún cambio. Modifica algún dato antes de guardar.",
      );
      return;
    }

    establecerEstadoEnvio("enviando");

    const datos = {
      titulo: valores.titulo.trim(),
      resumen: valores.resumen.trim(),
      palabras_clave: valores.palabrasClave.trim(),
      id_linea: Number(valores.idLinea),
    };

    try {
      const respuesta = await actualizarArticulo(
        sesion?.tokenAcceso,
        id,
        datos,
      );
      const nombreLinea =
        opcionesLinea.find((linea) => String(linea.id) === valores.idLinea)
          ?.nombre ?? articulo.linea;

      establecerArticulo({
        ...articulo,
        titulo: datos.titulo,
        resumen: datos.resumen,
        palabras_clave: datos.palabras_clave,
        id_linea: datos.id_linea,
        linea: nombreLinea,
      });
      establecerValores({
        titulo: datos.titulo,
        resumen: datos.resumen,
        palabrasClave: datos.palabras_clave,
        idLinea: valores.idLinea,
      });
      mostrarAlerta(
        "exito",
        typeof respuesta?.mensaje === "string" && respuesta.mensaje
          ? respuesta.mensaje
          : `El artículo «${datos.titulo}» se actualizó correctamente.`,
      );
    } catch (errorEnvio) {
      const campos = {};
      for (const [campoServidor, mensaje] of Object.entries(
        errorEnvio?.erroresCampos ?? {},
      )) {
        const campo = CAMPOS_FORMULARIO[campoServidor];
        if (campo) campos[campo] = mensaje;
      }
      establecerErroresCampos(campos);

      const sinPermiso =
        errorEnvio?.estadoHttp === 403 || errorEnvio?.estadoHttp === 404;
      mostrarAlerta(
        "error",
        errorEnvio?.message ||
          "Ocurrió un error inesperado al actualizar el artículo. Inténtelo nuevamente.",
        [...new Set(Object.values(campos))],
        sinPermiso
          ? { ruta: RUTA_MIS_ARTICULOS, texto: "Volver a mis artículos" }
          : null,
      );
    } finally {
      establecerEstadoEnvio("inactivo");
    }
  }

  return (
    <div className="relative min-h-dvh bg-[url('/fondo-crear-articulo.jpg')] bg-cover bg-center bg-fixed font-sans text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/90 via-slate-50/85 to-slate-100/80"
      />
      <header className="relative border-b border-white/70 bg-white/85 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Marca compacta />
          <nav
            aria-label="Navegación de autor"
            className="flex items-center gap-4 text-sm"
          >
            <span className="hidden font-medium text-slate-600 sm:inline">
              {sesion?.usuario?.nombre}
            </span>
            <Link
              to={RUTA_MIS_ARTICULOS}
              className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
            >
              Mis artículos
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          to={RUTA_MIS_ARTICULOS}
          className="group inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          <span
            aria-hidden="true"
            className="text-lg leading-none transition-transform duration-200 group-hover:-translate-x-1"
          >
            ‹
          </span>{" "}
          <span className="group-hover:underline underline-offset-4">
            Mis artículos
          </span>
        </Link>

        <div className="relative mt-7 overflow-hidden rounded-none bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-2xl sm:px-10 sm:py-11">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10 sm:right-8 sm:top-1/2 sm:-translate-y-1/2"
          >
            <div className="absolute inset-5 rounded-full border border-white/10" />
            <div className="absolute inset-10 rounded-full border border-white/10" />
          </div>
          <div className="relative max-w-3xl">
            <h1 className=" font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
              Modificar un artículo
            </h1>
            <p className="mt-3 max-w-2xl leading-relaxed text-slate-300">
              Actualiza el título, el resumen, las palabras clave o la línea
              temática de tu propuesta.
            </p>
          </div>
        </div>

        {cargando ? (
          <p
            role="status"
            className="mt-8 rounded-2xl border border-white/80 bg-white/95 p-5 text-slate-600 shadow-xl"
          >
            Cargando los datos del artículo…
          </p>
        ) : errorCarga ? (
          <section
            aria-labelledby="error-carga"
            className="mt-8 rounded-2xl border border-white/80 border-l-4 border-l-red-700 bg-white/95 p-5 shadow-xl sm:p-7"
          >
            <h2
              id="error-carga"
              className="font-display text-xl font-bold text-slate-900"
            >
              {sinAutorizacion
                ? "No puedes modificar este artículo"
                : "No fue posible cargar el artículo"}
            </h2>
            <p role="alert" className="mt-2 leading-relaxed text-slate-700">
              {errorCarga.mensaje}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to={RUTA_MIS_ARTICULOS} className={claseBotonSecundario}>
                Volver a mis artículos
              </Link>
              {!sinAutorizacion && errorCarga.estadoHttp !== 401 && (
                <button
                  type="button"
                  onClick={reintentar}
                  className="btn min-h-12 rounded-none border-slate-900 bg-slate-900 px-6 font-semibold text-white transition hover:border-slate-700 hover:bg-slate-700"
                >
                  Reintentar
                </button>
              )}
            </div>
          </section>
        ) : (
          <form
            noValidate
            onSubmit={enviarFormulario}
            className="mt-7 space-y-6"
          >
            {motivoBloqueo && (
              <div
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950"
              >
                <p className="font-bold">Este artículo no se puede modificar</p>
                <p className="mt-1">{motivoBloqueo}</p>
              </div>
            )}

            <section
              aria-labelledby="datos-articulo"
              className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-xl backdrop-blur-sm sm:p-8"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 4.75A2.75 2.75 0 0 1 7.75 2H20v17H7.75A2.75 2.75 0 0 0 5 21.75m0-17v17m0-17h11M8.5 7h8m-8 3.5h8"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    01 · Información académica
                  </p>
                  <h2
                    id="datos-articulo"
                    className="mt-1 font-display text-xl font-bold text-slate-950 sm:text-2xl"
                  >
                    Datos de la propuesta
                  </h2>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 border-y border-slate-200 py-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Convocatoria
                  </dt>
                  <dd className="mt-1 font-semibold">{articulo.conferencia}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {infoEstado(articulo.estado).etiqueta}
                  </dd>
                </div>
              </dl>

              <fieldset
                disabled={!editable || enviando}
                className="mt-6 grid gap-5 sm:grid-cols-2"
              >
                <legend className="sr-only">
                  Datos editables del artículo
                </legend>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="titulo-articulo"
                    className="text-sm font-semibold"
                  >
                    Nombre del artículo <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="titulo-articulo"
                    type="text"
                    maxLength={255}
                    value={valores.titulo}
                    onChange={(evento) =>
                      cambiarCampo("titulo", evento.target.value)
                    }
                    aria-invalid={Boolean(erroresCampos.titulo)}
                    aria-describedby={
                      erroresCampos.titulo ? "error-titulo" : undefined
                    }
                    placeholder="Escribe el título de tu propuesta"
                    className={claseCampo}
                  />
                  {erroresCampos.titulo && (
                    <p id="error-titulo" className={claseErrorCampo}>
                      {erroresCampos.titulo}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="resumen-articulo"
                    className="text-sm font-semibold"
                  >
                    Resumen <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="resumen-articulo"
                    rows={5}
                    value={valores.resumen}
                    onChange={(evento) =>
                      cambiarCampo("resumen", evento.target.value)
                    }
                    aria-invalid={Boolean(erroresCampos.resumen)}
                    aria-describedby={
                      erroresCampos.resumen ? "error-resumen" : undefined
                    }
                    placeholder="Describe brevemente el objetivo y aporte de la propuesta"
                    className={`textarea textarea-bordered mt-2 min-h-36 w-full rounded-xl border !border-slate-300 bg-slate-50/70 px-4 py-3 text-slate-900 shadow-2xs outline-none transition placeholder:text-slate-500 hover:!border-slate-400 focus:!border-slate-700 focus:bg-white focus:ring-2 focus:ring-slate-500/20 ${erroresCampos.resumen ? "textarea-error" : ""}`}
                  />
                  {erroresCampos.resumen && (
                    <p id="error-resumen" className={claseErrorCampo}>
                      {erroresCampos.resumen}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="palabras-clave"
                    className="text-sm font-semibold"
                  >
                    Palabras clave <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="palabras-clave"
                    type="text"
                    value={valores.palabrasClave}
                    onChange={(evento) =>
                      cambiarCampo("palabrasClave", evento.target.value)
                    }
                    aria-invalid={Boolean(erroresCampos.palabrasClave)}
                    aria-describedby={
                      erroresCampos.palabrasClave
                        ? "error-palabras-clave"
                        : undefined
                    }
                    placeholder="Separadas por comas"
                    className={claseCampo}
                  />
                  {erroresCampos.palabrasClave && (
                    <p id="error-palabras-clave" className={claseErrorCampo}>
                      {erroresCampos.palabrasClave}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="linea-tematica"
                    className="text-sm font-semibold"
                  >
                    Línea temática <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="linea-tematica"
                    value={valores.idLinea}
                    onChange={(evento) =>
                      cambiarCampo("idLinea", evento.target.value)
                    }
                    aria-invalid={Boolean(erroresCampos.idLinea)}
                    aria-describedby={
                      erroresCampos.idLinea ? "error-linea" : undefined
                    }
                    className="select select-bordered mt-2 min-h-12 w-full rounded-xl border !border-slate-300 bg-white px-4 text-slate-900 shadow-2xs outline-none transition hover:!border-slate-400 focus:!border-slate-700 focus:ring-2 focus:ring-slate-500/20"
                  >
                    {opcionesLinea.map((linea) => (
                      <option
                        key={linea.id}
                        value={String(linea.id)}
                        className="bg-white py-2 text-slate-900"
                      >
                        {linea.nombre}
                      </option>
                    ))}
                  </select>

                  {erroresCampos.idLinea && (
                    <p id="error-linea" className={claseErrorCampo}>
                      {erroresCampos.idLinea}
                    </p>
                  )}
                </div>
              </fieldset>
            </section>

            <section
              aria-labelledby="datos-autores"
              className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-xl backdrop-blur-sm sm:p-8"
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                02 · Equipo de investigación
              </p>
              <h2
                id="datos-autores"
                className="mt-1 font-display text-xl font-bold text-slate-950 sm:text-2xl"
              >
                Autores del artículo
              </h2>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Los autores no se pueden modificar desde esta pantalla.
              </p>
              <ul className="mt-5 space-y-3">
                {(articulo.autores ?? []).map((autor) => (
                  <li
                    key={autor.email}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm"
                  >
                    <p className="font-semibold text-slate-900">
                      {autor.nombre}
                      {autor.es_responsable && (
                        <span className="ml-2 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-700">
                          Responsable de versiones
                        </span>
                      )}
                    </p>
                    <p className="text-slate-600">
                      {autor.email} · {autor.institucion}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <AlertaFormulario alerta={alerta} />

            <div className="flex flex-col-reverse gap-3 border-t border-white/80 pt-6 sm:flex-row sm:justify-end">
              <Link to={RUTA_MIS_ARTICULOS} className={claseBotonSecundario}>
                Volver a mis artículos
              </Link>
              <button
                type="submit"
                disabled={enviando || !editable}
                className="btn min-h-12 rounded-full border-slate-900 bg-slate-900 px-7 font-semibold text-white shadow-lg transition hover:border-slate-700 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enviando ? "Guardando cambios…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
