
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  actualizarUsuario,
  obtenerUsuarioPorId,
} from "../autenticacion/solicitudes";
import { ROLES_DISPONIBLES, RUTA_ELEGIR_ROL } from "../autenticacion/roles";
import { useAutenticacion } from "../autenticacion/useAutenticacion";
import { Marca } from "../components/Marca";
import { validarFormularioEdicionUsuario } from "./validarFormularioUsuario";

const FORMULARIO_INICIAL = {
  nombre: "",
  apellido: "",
  correo: "",
  institucion: "",
  contrasena: "",
  confirmarContrasena: "",
};

const ROLES = [
  { codigo: "ADMIN", nombre: "Administrador del sistema" },
  { codigo: "COMITE", nombre: "Miembro del comité científico" },
  { codigo: "AUTOR", nombre: "Autor" },
];

const CLASE_CAMPO =
  "input input-bordered mt-2 min-h-12 w-full rounded-none border-[#BDC2BF] bg-[#FCFCFC] px-4 text-[#02111B] outline-none transition placeholder:text-[#777B78] focus:border-[#5D737E] focus:ring-2 focus:ring-[#5D737E]/20";

const CLASE_ERROR =
  "mt-1 block text-sm font-medium text-red-800";

const ETIQUETAS_CAMPOS = {
  nombre: "Nombre",
  apellido: "Apellido",
  correo: "Correo electrónico",
  institucion: "Institución o afiliación",
  contrasena: "Contraseña",
  confirmarContrasena: "Confirmación de contraseña",
  roles: "Roles asignados",
};

function mostrarMensajes(mensajes) {
  return Array.isArray(mensajes) ? mensajes.join(" ") : mensajes;
}

function normalizarRoles(roles) {
  if (!Array.isArray(roles)) return [];

  return roles.map((rol) =>
    typeof rol === "string" ? rol : rol.codigo,
  );
}

export function EditarUsuario() {
  const { id } = useParams();

  const {
    sesion,
    actualizarDatosUsuario,
  } = useAutenticacion();

  const idUsuario = id ?? sesion?.usuario?.id;

  const esEdicionPropia =
    idUsuario !== undefined &&
    idUsuario !== null &&
    String(idUsuario) === String(sesion?.usuario?.id);

  const puedeGestionarRoles =
    !esEdicionPropia &&
    ["ADMIN", "COMITE"].includes(sesion?.rolActivo);

  /*
   * La ruta de perfil debe estar disponible incluso cuando
   * el usuario tiene varios roles y todavía no seleccionó
   * uno activo.
   *
   * Se utiliza el primer rol asociado únicamente como
   * contexto de la petición cuando no hay uno seleccionado.
   */
  const rolSolicitud =
    sesion?.rolActivo ?? sesion?.roles?.[0];

  const rolesPermitidos =
    sesion?.rolActivo === "ADMIN"
      ? ROLES
      : ROLES.filter((rol) => rol.codigo !== "ADMIN");

  const rutaPanel =
    sesion?.rolActivo
      ? ROLES_DISPONIBLES[sesion.rolActivo]?.rutaInicio
      : RUTA_ELEGIR_ROL;

  const rutaCancelar = esEdicionPropia
    ? rutaPanel
    : "/gestion/usuarios";

  const [formulario, establecerFormulario] = useState(
    FORMULARIO_INICIAL,
  );

  const [rolesSeleccionados, establecerRolesSeleccionados] =
    useState([]);

  const [usuarioCargado, establecerUsuarioCargado] =
    useState(false);

  const [cargando, establecerCargando] = useState(true);

  const [enviando, establecerEnviando] = useState(false);

  const [mostrarContrasena, establecerMostrarContrasena] =
    useState(false);

  const [erroresCampo, establecerErroresCampo] = useState({});

  const [erroresServidor, establecerErroresServidor] = useState({});

  const [mensajeErrorGeneral, establecerMensajeErrorGeneral] =
    useState("");

  const [mensajeExito, establecerMensajeExito] = useState("");

  const alertaErrorRef = useRef(null);

  const alertaExitoRef = useRef(null);

  const [intentosCarga, establecerIntentosCarga] = useState(0);

  const erroresVisibles = {
    ...erroresServidor,
    ...erroresCampo,
  };

  const erroresParaAlerta = Object.entries(erroresVisibles)
    .filter(([campo]) => ETIQUETAS_CAMPOS[campo]);

  useEffect(() => {
    if (!mensajeErrorGeneral || !alertaErrorRef.current) return;

    alertaErrorRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    alertaErrorRef.current.focus({
      preventScroll: true,
    });
  }, [mensajeErrorGeneral]);

  useEffect(() => {
    if (!mensajeExito || !alertaExitoRef.current) return;

    alertaExitoRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    alertaExitoRef.current.focus({
      preventScroll: true,
    });
  }, [mensajeExito]);

  /*
   * Consulta inicial del usuario.
   * Se utiliza una bandera para impedir que una respuesta
   * tardía actualice el estado después de desmontar el componente.
   */
  useEffect(() => {
    let activo = true;

    async function cargarUsuario() {
      establecerCargando(true);
      establecerUsuarioCargado(false);
      establecerMensajeErrorGeneral("");
      establecerMensajeExito("");
      establecerErroresCampo({});
      establecerErroresServidor({});

      try {
        if (!idUsuario) {
          throw new Error(
            "No fue posible identificar la cuenta que deseas editar.",
          );
        }

        const usuario = await obtenerUsuarioPorId({
          id: idUsuario,
          token: sesion.tokenAcceso,
          rolActivo: rolSolicitud,
        });

        if (!activo) return;

        establecerFormulario({
          nombre: usuario.first_name ?? "",
          apellido: usuario.last_name ?? "",
          correo: usuario.email ?? "",
          institucion: usuario.institucion ?? "",
          contrasena: "",
          confirmarContrasena: "",
        });

        /*
         * Los roles solo se precargan cuando se edita
         * una cuenta diferente a la cuenta autenticada.
         */
        if (!esEdicionPropia && puedeGestionarRoles) {
          establecerRolesSeleccionados(
            normalizarRoles(usuario.roles),
          );
        } else {
          establecerRolesSeleccionados([]);
        }

        establecerUsuarioCargado(true);
      } catch (errorSolicitud) {
        if (!activo) return;

        establecerMensajeErrorGeneral(
          errorSolicitud instanceof Error
            ? errorSolicitud.message
            : "No se pudo cargar la información del usuario.",
        );

        establecerErroresServidor(
          errorSolicitud.erroresCampo ?? {},
        );
      } finally {
        if (activo) {
          establecerCargando(false);
        }
      }
    }

    cargarUsuario();

    return () => {
      activo = false;
    };
  }, [
    idUsuario,
    sesion?.tokenAcceso,
    rolSolicitud,
    esEdicionPropia,
    puedeGestionarRoles,
    intentosCarga,
  ]);

  function actualizarCampo(evento) {
    const { name, value } = evento.target;
    const camposRelacionados =
      name === "contrasena"
        ? [name, "confirmarContrasena"]
        : [name];

    establecerFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));

    const erroresCampoActualizados = { ...erroresCampo };
    const erroresServidorActualizados = { ...erroresServidor };
    camposRelacionados.forEach((campo) => {
      delete erroresCampoActualizados[campo];
      delete erroresServidorActualizados[campo];
    });

    establecerErroresCampo(erroresCampoActualizados);
    establecerErroresServidor(erroresServidorActualizados);

    const erroresRestantes = {
      ...erroresServidorActualizados,
      ...erroresCampoActualizados,
    };
    establecerMensajeErrorGeneral(
      Object.keys(erroresRestantes).length > 0
        ? "Revisa los campos indicados antes de actualizar la cuenta."
        : "",
    );
    establecerMensajeExito("");
  }

  function validarCampo(campo) {
    const errores = validarFormularioEdicionUsuario(
      {
        ...formulario,
        roles: rolesSeleccionados,
      },
      rolesPermitidos,
      {
        permitirRoles: puedeGestionarRoles,
      },
    );

    establecerErroresCampo((actuales) => {
      const nuevosErrores = { ...actuales };

      if (errores[campo]) {
        nuevosErrores[campo] = errores[campo];
      } else {
        delete nuevosErrores[campo];
      }

      return nuevosErrores;
    });

    const hayOtrosErrores = Object.keys(erroresVisibles).some(
      (campoVisible) =>
        campoVisible !== campo && Boolean(erroresVisibles[campoVisible]),
    );
    establecerMensajeErrorGeneral(
      errores[campo] || hayOtrosErrores
        ? "Revisa los campos indicados antes de actualizar la cuenta."
        : "",
    );
  }

  function alternarRol(codigo) {
    if (!puedeGestionarRoles || !rolesPermitidos.some(
      (rol) => rol.codigo === codigo,
    )) {
      return;
    }

    const nuevosRoles = rolesSeleccionados.includes(codigo)
      ? rolesSeleccionados.filter((rol) => rol !== codigo)
      : [...rolesSeleccionados, codigo];

    establecerRolesSeleccionados(nuevosRoles);

    establecerErroresCampo((actuales) => {
      const nuevosErrores = { ...actuales };
      delete nuevosErrores.roles;
      return nuevosErrores;
    });

    establecerErroresServidor((actuales) => {
      const nuevosErrores = { ...actuales };
      delete nuevosErrores.roles;
      return nuevosErrores;
    });

    const quedanErrores = Object.keys(erroresVisibles).some(
      (campo) => campo !== "roles" && Boolean(erroresVisibles[campo]),
    );
    establecerMensajeErrorGeneral(
      quedanErrores
        ? "Revisa los campos indicados antes de actualizar la cuenta."
        : "",
    );
    establecerMensajeExito("");
  }

  async function enviarFormulario(evento) {
    evento.preventDefault();

    if (enviando || !usuarioCargado) return;

    establecerMensajeErrorGeneral("");
    establecerMensajeExito("");
    establecerErroresServidor({});

    const errores = validarFormularioEdicionUsuario(
      {
        ...formulario,
        roles: rolesSeleccionados,
      },
      rolesPermitidos,
      {
        permitirRoles: puedeGestionarRoles,
      },
    );

    establecerErroresCampo(errores);

    if (Object.keys(errores).length > 0) {
      establecerMensajeErrorGeneral(
        "Revisa los campos indicados antes de actualizar la cuenta.",
      );
      return;
    }

    establecerEnviando(true);

    try {
      const usuarioActualizado = await actualizarUsuario({
        id: idUsuario,
        idUsuarioSesion: sesion.usuario.id,
        token: sesion.tokenAcceso,
        rolActivo: rolSolicitud,
        ...formulario,

        /*
         * En una edición propia se entrega undefined.
         * La capa de solicitudes también comprueba los ID
         * antes de incorporar roles al PATCH.
         */
        roles: puedeGestionarRoles
          ? rolesSeleccionados
          : undefined,
      });

      const nombreActualizado =
        [
          usuarioActualizado.first_name ?? formulario.nombre.trim(),
          usuarioActualizado.last_name ?? formulario.apellido.trim(),
        ]
          .filter(Boolean)
          .join(" ");

      const correoActualizado =
        usuarioActualizado.email ??
        formulario.correo.trim().toLowerCase();

      /*
       * Si se modificó la propia cuenta, se actualiza
       * la información guardada en el contexto de sesión.
       */
      if (esEdicionPropia) {
        actualizarDatosUsuario?.({
          nombre: nombreActualizado,
          correo: correoActualizado,
        });
      }

      establecerFormulario((actual) => ({
        ...actual,
        nombre:
          usuarioActualizado.first_name ?? actual.nombre,
        apellido:
          usuarioActualizado.last_name ?? actual.apellido,
        correo:
          usuarioActualizado.email ?? actual.correo,
        institucion:
          usuarioActualizado.institucion ?? actual.institucion,
        contrasena: "",
        confirmarContrasena: "",
      }));

      if (
        puedeGestionarRoles &&
        Array.isArray(usuarioActualizado.roles)
      ) {
        establecerRolesSeleccionados(
          normalizarRoles(usuarioActualizado.roles),
        );
      }

      establecerErroresCampo({});
      establecerErroresServidor({});
      establecerMostrarContrasena(false);

      establecerMensajeExito(
        esEdicionPropia
          ? "Tus datos personales se actualizaron correctamente."
          : "Los datos del usuario se actualizaron correctamente.",
      );
    } catch (errorSolicitud) {
      establecerMensajeErrorGeneral(
        errorSolicitud instanceof Error
          ? errorSolicitud.message
          : "No se pudo actualizar la información del usuario.",
      );

      establecerErroresServidor(
        errorSolicitud.erroresCampo ?? {},
      );

      establecerErroresCampo({});
    } finally {
      establecerEnviando(false);
    }
  }

  const tituloFormulario = esEdicionPropia
    ? "Actualizar mis datos"
    : "Editar usuario";

  return (
    <div className="min-h-dvh bg-[#FCFCFC] text-[#02111B]">
      <header className="border-b border-[#BDC2BF] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to={rutaCancelar} aria-label="Volver al panel">
            <Marca compacta />
          </Link>

          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-[#3F4045] sm:inline">
              {sesion.usuario.nombre}
            </span>

            <Link
              to={rutaCancelar}
              className="border border-[#5D737E] px-4 py-2 font-semibold transition hover:bg-[#E3E7D3]"
            >
              Volver
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100dvh-73px)] max-w-6xl lg:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.5fr)]">
        <aside className="relative overflow-hidden bg-[#02111B] px-6 py-9 text-[#FCFCFC] sm:px-10 lg:px-11 lg:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 top-14 h-64 w-64 rounded-full border border-[#5D737E]/40"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 top-28 h-40 w-40 rounded-full border border-[#BDC2BF]/30"
          />

          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#BDC2BF]">
              Administración de cuentas
            </p>

            <h1 className="mt-5 max-w-sm font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              {tituloFormulario}
            </h1>

            <p className="mt-4 max-w-md leading-7 text-[#BDC2BF]">
              {esEdicionPropia
                ? "Actualiza tus datos personales y conserva tu información institucional al día."
                : "Modifica la información de la cuenta seleccionada según los permisos de tu rol."}
            </p>

            <div className="mt-8 border-l-2 border-[#E6E49F] bg-[#30292F] p-4 text-sm leading-6">
              {esEdicionPropia
                ? "Puedes actualizar tus datos personales. Los roles y niveles de autorización de tu propia cuenta no se pueden modificar desde esta pantalla."
                : "Los cambios dependen de los permisos de tu cuenta. Las modificaciones de roles están restringidas a los roles autorizados por el sistema."}
            </div>

            {puedeGestionarRoles && (
              <div className="mt-8 border-t border-white/15 pt-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#989C94]">
                  Roles que puedes asignar
                </p>

                <ul className="mt-4 space-y-3">
                  {rolesPermitidos.map((rol) => (
                    <li
                      key={rol.codigo}
                      className="flex items-start gap-3 text-sm text-[#FCFCFC]"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#E6E49F]"
                      />
                      {rol.nombre}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        <section className="px-5 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-3xl">
            <Link
              to={rutaCancelar}
              className="text-sm font-semibold text-[#5D737E] underline underline-offset-4"
            >
              ← Volver al panel
            </Link>

            <div className="mt-6 border-b border-[#BDC2BF] pb-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5D737E]">
                {esEdicionPropia
                  ? "Perfil personal"
                  : "Gestión administrativa"}
              </p>

              <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
                Información de la cuenta
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#3F4045]">
                Los campos marcados son obligatorios. Deja la contraseña
                vacía si no deseas cambiarla.
              </p>
            </div>

            {mensajeExito && (
              <div
                ref={alertaExitoRef}
                tabIndex={-1}
                role="status"
                aria-live="polite"
                className="mt-6 flex items-start justify-between gap-4 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-700/30"
              >
                <p>{mensajeExito}</p>

                <button
                  type="button"
                  onClick={() => establecerMensajeExito("")}
                  aria-label="Cerrar mensaje de éxito"
                  className="shrink-0 text-xl leading-none"
                >
                  ×
                </button>
              </div>
            )}

            {mensajeErrorGeneral && (
              <div
                ref={alertaErrorRef}
                tabIndex={-1}
                role="alert"
                aria-live="assertive"
                className="mt-6 flex items-start justify-between gap-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950 outline-none focus:ring-2 focus:ring-red-700/30"
              >
                <div>
                  <p className="font-semibold">
                    {mensajeErrorGeneral}
                  </p>

                  {erroresParaAlerta.length > 0 && (
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {erroresParaAlerta.flatMap(
                        ([campo, mensajes]) =>
                          (
                            Array.isArray(mensajes)
                              ? mensajes
                              : [mensajes]
                          ).map((mensaje, indice) => (
                            <li key={`${campo}-${indice}`}>
                              {ETIQUETAS_CAMPOS[campo]}: {mensaje}
                            </li>
                          )),
                      )}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => establecerMensajeErrorGeneral("")}
                  aria-label="Cerrar mensaje de error"
                  className="shrink-0 text-xl leading-none"
                >
                  ×
                </button>
              </div>
            )}

            {cargando ? (
              <div
                role="status"
                aria-live="polite"
                className="mt-7 border border-[#BDC2BF] bg-white px-6 py-12 text-center"
              >
                <span className="loading loading-spinner loading-lg text-[#5D737E]" />
                <p className="mt-4 text-sm font-semibold text-[#3F4045]">
                  Cargando información del usuario...
                </p>
              </div>
            ) : !usuarioCargado ? (
              <div className="mt-7 border border-[#BDC2BF] bg-white px-6 py-8">
                <p className="text-sm text-[#3F4045]">
                  No fue posible cargar el formulario.
                  Comprueba tu sesión y tus permisos.
                </p>

                <Link
                  to={rutaCancelar}
                  className="mt-5 inline-flex min-h-11 items-center border border-[#5D737E] px-5 text-sm font-semibold transition hover:bg-[#E3E7D3]"
                >
                  Volver
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    establecerIntentosCarga((actual) => actual + 1)
                  }
                  className="ml-3 mt-5 inline-flex min-h-11 items-center border border-[#5D737E] px-5 text-sm font-semibold transition hover:bg-[#E3E7D3]"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <form
                noValidate
                onSubmit={enviarFormulario}
                className="mt-7 space-y-7"
              >
                <section aria-labelledby="datos-personales">
                  <h3
                    id="datos-personales"
                    className="font-display text-lg font-bold"
                  >
                    Información personal
                  </h3>

                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <label
                      className="block text-sm font-semibold"
                      htmlFor="nombre-editar"
                    >
                      Nombre <span className="text-[#5D737E]">*</span>

                      <input
                        id="nombre-editar"
                        name="nombre"
                        type="text"
                        autoComplete="given-name"
                        maxLength={150}
                        value={formulario.nombre}
                        onChange={actualizarCampo}
                        onBlur={() => validarCampo("nombre")}
                        aria-invalid={Boolean(erroresVisibles.nombre)}
                        aria-describedby={
                          erroresVisibles.nombre
                            ? "nombre-editar-error"
                            : undefined
                        }
                        className={`${CLASE_CAMPO} ${
                          erroresVisibles.nombre
                            ? "border-red-700 focus:border-red-700 focus:ring-red-700/20"
                            : ""
                        }`}
                      />

                      {erroresVisibles.nombre && (
                        <span
                          id="nombre-editar-error"
                          className={CLASE_ERROR}
                        >
                          {mostrarMensajes(erroresVisibles.nombre)}
                        </span>
                      )}
                    </label>

                    <label
                      className="block text-sm font-semibold"
                      htmlFor="apellido-editar"
                    >
                      Apellido <span className="text-[#5D737E]">*</span>

                      <input
                        id="apellido-editar"
                        name="apellido"
                        type="text"
                        autoComplete="family-name"
                        maxLength={150}
                        value={formulario.apellido}
                        onChange={actualizarCampo}
                        onBlur={() => validarCampo("apellido")}
                        aria-invalid={Boolean(erroresVisibles.apellido)}
                        aria-describedby={
                          erroresVisibles.apellido
                            ? "apellido-editar-error"
                            : undefined
                        }
                        className={`${CLASE_CAMPO} ${
                          erroresVisibles.apellido
                            ? "border-red-700 focus:border-red-700 focus:ring-red-700/20"
                            : ""
                        }`}
                      />

                      {erroresVisibles.apellido && (
                        <span
                          id="apellido-editar-error"
                          className={CLASE_ERROR}
                        >
                          {mostrarMensajes(erroresVisibles.apellido)}
                        </span>
                      )}
                    </label>

                    <label
                      className="block text-sm font-semibold sm:col-span-2"
                      htmlFor="correo-editar"
                    >
                      Correo electrónico / nombre de usuario{" "}
                      <span className="text-[#5D737E]">*</span>

                      <input
                        id="correo-editar"
                        name="correo"
                        type="email"
                        autoComplete="email"
                        maxLength={150}
                        value={formulario.correo}
                        onChange={actualizarCampo}
                        onBlur={() => validarCampo("correo")}
                        aria-invalid={Boolean(erroresVisibles.correo)}
                        aria-describedby={
                          erroresVisibles.correo
                            ? "correo-editar-error"
                            : undefined
                        }
                        className={`${CLASE_CAMPO} ${
                          erroresVisibles.correo
                            ? "border-red-700 focus:border-red-700 focus:ring-red-700/20"
                            : ""
                        }`}
                        placeholder="nombre@institucion.edu"
                      />

                      {erroresVisibles.correo && (
                        <span
                          id="correo-editar-error"
                          className={CLASE_ERROR}
                        >
                          {mostrarMensajes(erroresVisibles.correo)}
                        </span>
                      )}
                    </label>

                    <label
                      className="block text-sm font-semibold sm:col-span-2"
                      htmlFor="institucion-editar"
                    >
                      Institución o afiliación{" "}
                      <span className="text-[#5D737E]">*</span>

                      <input
                        id="institucion-editar"
                        name="institucion"
                        type="text"
                        autoComplete="organization"
                        maxLength={150}
                        value={formulario.institucion}
                        onChange={actualizarCampo}
                        onBlur={() => validarCampo("institucion")}
                        aria-invalid={Boolean(erroresVisibles.institucion)}
                        aria-describedby={
                          erroresVisibles.institucion
                            ? "institucion-editar-error"
                            : undefined
                        }
                        className={`${CLASE_CAMPO} ${
                          erroresVisibles.institucion
                            ? "border-red-700 focus:border-red-700 focus:ring-red-700/20"
                            : ""
                        }`}
                        placeholder="Universidad o centro de investigación"
                      />

                      {erroresVisibles.institucion && (
                        <span
                          id="institucion-editar-error"
                          className={CLASE_ERROR}
                        >
                          {mostrarMensajes(erroresVisibles.institucion)}
                        </span>
                      )}
                    </label>
                  </div>
                </section>

                {puedeGestionarRoles && (
                  <section
                    aria-labelledby="roles-editar"
                    className="border-y border-[#BDC2BF] py-6"
                  >
                    <h3
                      id="roles-editar"
                      className="font-display text-lg font-bold"
                    >
                      Roles asignados{" "}
                      <span className="text-[#5D737E]">*</span>
                    </h3>

                    <p className="mt-1 text-sm text-[#3F4045]">
                      Selecciona los roles autorizados para esta cuenta.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {rolesPermitidos.map((rol) => (
                        <label
                          key={rol.codigo}
                          className={`flex min-h-14 cursor-pointer items-start gap-3 border p-4 transition ${
                            erroresVisibles.roles
                              ? "border-red-700 bg-red-50"
                              : rolesSeleccionados.includes(rol.codigo)
                                ? "border-[#5D737E] bg-[#E3E7D3]"
                                : "border-[#BDC2BF] bg-white hover:bg-[#FCFCFC]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={rolesSeleccionados.includes(
                              rol.codigo,
                            )}
                            onChange={() => alternarRol(rol.codigo)}
                            onBlur={() => validarCampo("roles")}
                            aria-invalid={Boolean(
                              erroresVisibles.roles,
                            )}
                            aria-describedby={
                              erroresVisibles.roles
                                ? "roles-editar-error"
                                : undefined
                            }
                            className="checkbox checkbox-primary mt-0.5 rounded-none"
                          />

                          <span className="text-sm font-semibold">
                            {rol.nombre}
                          </span>
                        </label>
                      ))}
                    </div>

                    {erroresVisibles.roles && (
                      <p
                        id="roles-editar-error"
                        className={CLASE_ERROR}
                      >
                        {mostrarMensajes(erroresVisibles.roles)}
                      </p>
                    )}
                  </section>
                )}

                <section aria-labelledby="contrasena-editar">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3
                        id="contrasena-editar"
                        className="font-display text-lg font-bold"
                      >
                        Contraseña de acceso
                      </h3>

                      <p className="mt-1 text-sm text-[#3F4045]">
                        Opcional. Escribe una nueva contraseña únicamente
                        cuando desees cambiarla.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        establecerMostrarContrasena((actual) => !actual)
                      }
                      className="text-sm font-semibold text-[#5D737E] underline underline-offset-4"
                    >
                      {mostrarContrasena
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <label
                      className="block text-sm font-semibold"
                      htmlFor="contrasena-editar-input"
                    >
                      Nueva contraseña

                      <input
                        id="contrasena-editar-input"
                        name="contrasena"
                        type={mostrarContrasena ? "text" : "password"}
                        autoComplete="new-password"
                        value={formulario.contrasena}
                        onChange={actualizarCampo}
                        onBlur={() => validarCampo("contrasena")}
                        aria-invalid={Boolean(
                          erroresVisibles.contrasena,
                        )}
                        aria-describedby={
                          erroresVisibles.contrasena
                            ? "contrasena-editar-error"
                            : undefined
                        }
                        className={`${CLASE_CAMPO} ${
                          erroresVisibles.contrasena
                            ? "border-red-700 focus:border-red-700 focus:ring-red-700/20"
                            : ""
                        }`}
                      />

                      {erroresVisibles.contrasena && (
                        <span
                          id="contrasena-editar-error"
                          className={CLASE_ERROR}
                        >
                          {mostrarMensajes(
                            erroresVisibles.contrasena,
                          )}
                        </span>
                      )}
                    </label>

                    <label
                      className="block text-sm font-semibold"
                      htmlFor="confirmar-contrasena-editar"
                    >
                      Confirmar nueva contraseña

                      <input
                        id="confirmar-contrasena-editar"
                        name="confirmarContrasena"
                        type={mostrarContrasena ? "text" : "password"}
                        autoComplete="new-password"
                        value={formulario.confirmarContrasena}
                        onChange={actualizarCampo}
                        onBlur={() =>
                          validarCampo("confirmarContrasena")
                        }
                        aria-invalid={Boolean(
                          erroresVisibles.confirmarContrasena,
                        )}
                        aria-describedby={
                          erroresVisibles.confirmarContrasena
                            ? "confirmar-contrasena-editar-error"
                            : undefined
                        }
                        className={`${CLASE_CAMPO} ${
                          erroresVisibles.confirmarContrasena
                            ? "border-red-700 focus:border-red-700 focus:ring-red-700/20"
                            : ""
                        }`}
                      />

                      {erroresVisibles.confirmarContrasena && (
                        <span
                          id="confirmar-contrasena-editar-error"
                          className={CLASE_ERROR}
                        >
                          {mostrarMensajes(
                            erroresVisibles.confirmarContrasena,
                          )}
                        </span>
                      )}
                    </label>
                  </div>
                </section>

                <div className="flex flex-col-reverse gap-3 border-t border-[#BDC2BF] pt-6 sm:flex-row sm:justify-end">
                  <Link
                    to={rutaCancelar}
                    className="inline-flex min-h-12 items-center justify-center border border-[#5D737E] px-6 font-semibold transition hover:bg-[#E3E7D3]"
                  >
                    Cancelar
                  </Link>

                  <button
                    type="submit"
                    disabled={enviando || cargando}
                    className="inline-flex min-h-12 cursor-pointer items-center justify-center bg-[#02111B] px-7 text-sm font-semibold text-[#FCFCFC] transition hover:bg-[#30292F] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {enviando
                      ? "Actualizando información..."
                      : "Guardar cambios"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
