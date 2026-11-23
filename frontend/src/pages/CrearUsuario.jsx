import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { crearUsuario } from "../autenticacion/solicitudes";
import { useAutenticacion } from "../autenticacion/useAutenticacion";
import { Marca } from "../components/Marca";
import { validarFormularioUsuario } from "./validarFormularioUsuario";

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
  "input input-bordered mt-2 min-h-12 w-full rounded-none border-2 border-[#5D737E]/70 bg-[#FCFCFC] px-4 text-[#02111B] shadow-sm outline-none transition placeholder:text-[#777B78] focus:border-[#02111B] focus:ring-4 focus:ring-[#5D737E]/20";
const CLASE_ERROR = "mt-1 block text-sm font-medium text-red-800";
const ETIQUETAS_CAMPOS = {
  nombre: "Nombre",
  apellido: "Apellido",
  correo: "Correo electrónico / nombre de usuario",
  institucion: "Institución o afiliación",
  contrasena: "Contraseña",
  confirmarContrasena: "Confirmación de contraseña",
  roles: "Roles asignados",
};

function mostrarMensajes(mensajes) {
  return Array.isArray(mensajes) ? mensajes.join(" ") : mensajes;
}

export function CrearUsuario() {
  const { sesion } = useAutenticacion();
  const [formulario, establecerFormulario] = useState(FORMULARIO_INICIAL);
  const [rolesSeleccionados, establecerRolesSeleccionados] = useState([]);
  const [erroresCampo, establecerErroresCampo] = useState({});
  const [erroresServidor, establecerErroresServidor] = useState({});
  const [mensajeErrorGeneral, establecerMensajeErrorGeneral] = useState("");
  const [mensajeExito, establecerMensajeExito] = useState("");
  const [enviando, establecerEnviando] = useState(false);
  const [mostrarContrasena, establecerMostrarContrasena] = useState(false);
  const alertaErrorRef = useRef(null);

  const rolesPermitidos =
    sesion.rolActivo === "ADMIN"
      ? ROLES
      : ROLES.filter((rol) => rol.codigo !== "ADMIN");
  const erroresVisibles = { ...erroresServidor, ...erroresCampo };
  const erroresParaAlerta = Object.entries(erroresVisibles).filter(
    ([campo]) => ETIQUETAS_CAMPOS[campo],
  );

  useEffect(() => {
    if (!mensajeErrorGeneral || !alertaErrorRef.current) return;
    alertaErrorRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    alertaErrorRef.current.focus({ preventScroll: true });
  }, [mensajeErrorGeneral]);

  function actualizarCampo(evento) {
    const { name, value } = evento.target;
    establecerFormulario((actual) => ({ ...actual, [name]: value }));
    establecerErroresCampo((actuales) => {
      const nuevosErrores = { ...actuales };
      delete nuevosErrores[name];
      if (name === "contrasena") delete nuevosErrores.confirmarContrasena;
      return nuevosErrores;
    });
    establecerErroresServidor((actuales) => {
      const nuevosErrores = { ...actuales };
      delete nuevosErrores[name];
      if (name === "contrasena") delete nuevosErrores.confirmarContrasena;
      return nuevosErrores;
    });
    establecerMensajeErrorGeneral("");
  }

  function validarCampo(campo, datos = formulario, roles = rolesSeleccionados) {
    const errores = validarFormularioUsuario(
      { ...datos, roles },
      rolesPermitidos,
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
  }

  function alternarRol(codigo) {
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
    establecerMensajeErrorGeneral("");
  }

  async function enviarFormulario(evento) {
    evento.preventDefault();
    if (enviando) return;
    establecerMensajeErrorGeneral("");
    establecerMensajeExito("");
    establecerErroresServidor({});
    const errores = validarFormularioUsuario(
      { ...formulario, roles: rolesSeleccionados },
      rolesPermitidos,
    );
    establecerErroresCampo(errores);
    if (Object.keys(errores).length > 0) {
      establecerMensajeErrorGeneral(
        "Revisa los campos indicados antes de crear el usuario.",
      );
      return;
    }

    establecerEnviando(true);
    try {
      const usuario = await crearUsuario({
        token: sesion.tokenAcceso,
        ...formulario,
        roles: rolesSeleccionados,
      });
      const rolesRegistrados =
        Array.isArray(usuario.roles) && usuario.roles.length > 0
          ? usuario.roles
          : rolesSeleccionados;
      const nombresRoles = ROLES.filter((rol) =>
        rolesRegistrados.includes(rol.codigo),
      ).map((rol) => rol.nombre);
      establecerMensajeExito(
        `La cuenta de ${usuario.first_name} ${usuario.last_name} (${usuario.email}) se creó correctamente con el rol${nombresRoles.length === 1 ? "" : "es"}: ${nombresRoles.join(", ")}.`,
      );
      establecerFormulario(FORMULARIO_INICIAL);
      establecerRolesSeleccionados([]);
      establecerErroresCampo({});
      establecerMostrarContrasena(false);
    } catch (errorSolicitud) {
      const erroresRespuesta = errorSolicitud.erroresCampo ?? {};
      establecerMensajeErrorGeneral(
        errorSolicitud.message ||
          "No se pudo crear el usuario. Inténtalo nuevamente.",
      );
      establecerErroresServidor(erroresRespuesta);
      establecerErroresCampo({});
    } finally {
      establecerEnviando(false);
    }
  }

  const rutaPanel = sesion.rolActivo === "ADMIN" ? "/admin" : "/comite";

  return (
    <div className="min-h-dvh bg-[#FCFCFC] text-[#02111B]">
      <header className="border-b border-[#BDC2BF] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            to={rutaPanel}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#5D737E] transition hover:bg-[#E6E49F]/35 hover:text-[#02111B]"
          >
            {" "}
            <Marca compacta />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-[#3F4045] sm:inline">
              {sesion.usuario.nombre}
            </span>
            <Link
              to={rutaPanel}
              className="rounded-full border border-[#5D737E] px-4 py-2 font-semibold transition hover:bg-[#E6E49F]/40"
            >
              Volver al panel
            </Link>
          </div>
        </div>
      </header>

      <main className="grid min-h-[calc(100dvh-73px)] w-full overflow-x-hidden lg:grid-cols-[minmax(300px,32fr)_minmax(0,68fr)]">
        {" "}
        <aside className="relative overflow-hidden bg-[#02111B] px-6 py-7 text-[#FCFCFC] sm:px-10 lg:px-12 lg:py-12 xl:px-16">
          {" "}
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
              Crear usuario
            </h1>
            <p className="mt-2 max-w-md leading-7 text-[#BDC2BF]">
              Registra una cuenta institucional y asigna los roles que
              correspondan a sus responsabilidades en la conferencia.
            </p>
            <div class="mt-7 inline-flex items-center rounded-2xl bg-slate-800 px-6 py-2.5 text-sm leading-snug text-white">
              Herramienta es exclusiva para Administración y Comité científico.
            </div>
            <div className="mt-10 border-t border-white/15 pt-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#989C94]">
                Roles posibles
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {rolesPermitidos.map((rol) => (
                  <li
                    key={rol.codigo}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-[#FCFCFC]"
                  >
                    {rol.nombre}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
        <section className="min-w-0 px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12 xl:px-16">
          {" "}
          <div className="mx-auto w-full max-w-5xl">
            {" "}
            <Link
              to={rutaPanel}
              className="group inline-flex min-h-9 items-center gap-2 rounded-md px-2 -ml-2 text-sm font-semibold text-[#5D737E] transition-all duration-200 hover:bg-[#E3E7D3]/60 hover:text-[#02111B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D737E]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-1"
              >
                <path
                  d="M10 3L5 8l5 5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Volver al panel de{" "}
              {sesion.rolActivo === "ADMIN" ? "administración" : "comité"}
            </Link>
            <div className="mt-6 border-b border-[#BDC2BF] pb-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5D737E]">
                Alta administrativa
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
                Datos de la nueva cuenta
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#3F4045]">
                El correo electrónico también será el nombre de usuario para
                iniciar sesión.
              </p>
            </div>
            {mensajeExito && (
              <div
                role="status"
                aria-live="polite"
                className="mt-6 flex items-start justify-between gap-4 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
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
                  <p className="font-semibold">{mensajeErrorGeneral}</p>
                  {erroresParaAlerta.length > 0 && (
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {erroresParaAlerta.flatMap(([campo, mensajes]) =>
                        (Array.isArray(mensajes) ? mensajes : [mensajes]).map(
                          (mensaje, indice) => (
                            <li key={`${campo}-${indice}`}>
                              {ETIQUETAS_CAMPOS[campo]}: {mensaje}
                            </li>
                          ),
                        ),
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
                    htmlFor="nombre-usuario"
                  >
                    Nombre <span className="text-[#5D737E]">*</span>
                    <input
                      id="nombre-usuario"
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
                          ? "nombre-usuario-error"
                          : undefined
                      }
                      className={`${CLASE_CAMPO} ${erroresVisibles.nombre ? "border-red-700 focus:border-red-700 focus:ring-red-700/20" : ""}`}
                    />
                    {erroresVisibles.nombre && (
                      <span id="nombre-usuario-error" className={CLASE_ERROR}>
                        {mostrarMensajes(erroresVisibles.nombre)}
                      </span>
                    )}
                  </label>
                  <label
                    className="block text-sm font-semibold"
                    htmlFor="apellido-usuario"
                  >
                    Apellido <span className="text-[#5D737E]">*</span>
                    <input
                      id="apellido-usuario"
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
                          ? "apellido-usuario-error"
                          : undefined
                      }
                      className={`${CLASE_CAMPO} ${erroresVisibles.apellido ? "border-red-700 focus:border-red-700 focus:ring-red-700/20" : ""}`}
                    />
                    {erroresVisibles.apellido && (
                      <span id="apellido-usuario-error" className={CLASE_ERROR}>
                        {mostrarMensajes(erroresVisibles.apellido)}
                      </span>
                    )}
                  </label>
                  <label
                    className="block text-sm font-semibold sm:col-span-2"
                    htmlFor="correo-usuario"
                  >
                    Correo electrónico / nombre de usuario{" "}
                    <span className="text-[#5D737E]">*</span>
                    <input
                      id="correo-usuario"
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
                          ? "correo-usuario-error"
                          : undefined
                      }
                      className={`${CLASE_CAMPO} ${erroresVisibles.correo ? "border-red-700 focus:border-red-700 focus:ring-red-700/20" : ""}`}
                      placeholder="nombre@institucion.edu"
                    />
                    {erroresVisibles.correo && (
                      <span id="correo-usuario-error" className={CLASE_ERROR}>
                        {mostrarMensajes(erroresVisibles.correo)}
                      </span>
                    )}
                  </label>
                  <label
                    className="block text-sm font-semibold sm:col-span-2"
                    htmlFor="institucion-usuario"
                  >
                    Institución o afiliación{" "}
                    <span className="text-[#5D737E]">*</span>
                    <input
                      id="institucion-usuario"
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
                          ? "institucion-usuario-error"
                          : undefined
                      }
                      className={`${CLASE_CAMPO} ${erroresVisibles.institucion ? "border-red-700 focus:border-red-700 focus:ring-red-700/20" : ""}`}
                      placeholder="Universidad o centro de investigación"
                    />
                    {erroresVisibles.institucion && (
                      <span
                        id="institucion-usuario-error"
                        className={CLASE_ERROR}
                      >
                        {mostrarMensajes(erroresVisibles.institucion)}
                      </span>
                    )}
                  </label>
                </div>
              </section>

              <section
                aria-labelledby="roles-usuario"
                className="border-y border-[#BDC2BF]/70 py-7"
              >
                <h3
                  id="roles-usuario"
                  className="font-display text-lg font-bold tracking-tight text-[#02111B]"
                >
                  Roles asignados <span className="text-[#5D737E]">*</span>
                </h3>
                <p className="mt-1 text-sm text-[#3F4045]">
                  Puedes asignar uno o varios roles permitidos.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {rolesPermitidos.map((rol) => (
                    <label
                      key={rol.codigo}
                      className={`group relative flex min-h-13 cursor-pointer items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-all duration-200 select-none active:scale-[0.985] ${erroresVisibles.roles ? "border-red-600/80 bg-red-50/90 text-red-950 shadow-xs" : rolesSeleccionados.includes(rol.codigo) ? "border-[#02111B] bg-gradient-to-br from-white via-white to-[#E3E7D3]/55 text-[#02111B] shadow-sm ring-2 ring-[#02111B]/10" : "border-[#BDC2BF]/70 bg-white text-[#3F4045] shadow-2xs hover:-translate-y-0.5 hover:border-[#5D737E] hover:shadow-sm"}`}
                    >
                      <input
                        type="checkbox"
                        checked={rolesSeleccionados.includes(rol.codigo)}
                        onChange={() => alternarRol(rol.codigo)}
                        onBlur={() => validarCampo("roles")}
                        aria-invalid={Boolean(erroresVisibles.roles)}
                        aria-describedby={
                          erroresVisibles.roles
                            ? "roles-usuario-error"
                            : undefined
                        }
                        className="checkbox checkbox-sm shrink-0 rounded-md border-2 border-[#5D737E]/50 bg-white shadow-2xs transition-all duration-150 checked:border-[#02111B] checked:bg-[#02111B] checked:text-[#E6E49F] group-hover:border-[#02111B]"
                      />
                      <span
                        className={`text-sm tracking-tight transition-colors ${rolesSeleccionados.includes(rol.codigo) ? "font-bold text-[#02111B]" : "font-medium text-[#02111B]/80 group-hover:text-[#02111B]"}`}
                      >
                        {rol.nombre}
                      </span>
                    </label>
                  ))}
                </div>
                {erroresVisibles.roles && (
                  <p id="roles-usuario-error" className={CLASE_ERROR}>
                    {mostrarMensajes(erroresVisibles.roles)}
                  </p>
                )}
              </section>

              <section aria-labelledby="contrasena-usuario">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3
                      id="contrasena-usuario"
                      className="font-display text-lg font-bold"
                    >
                      Contraseña de acceso
                    </h3>
                    <p className="mt-1 text-sm text-[#3F4045]">
                      Usa al menos 8 caracteres; evita contraseñas comunes o
                      solo numéricas.
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
                    htmlFor="contrasena-usuario-input"
                  >
                    Contraseña <span className="text-[#5D737E]">*</span>
                    <input
                      id="contrasena-usuario-input"
                      name="contrasena"
                      type={mostrarContrasena ? "text" : "password"}
                      autoComplete="new-password"
                      value={formulario.contrasena}
                      onChange={actualizarCampo}
                      onBlur={() => validarCampo("contrasena")}
                      aria-invalid={Boolean(erroresVisibles.contrasena)}
                      aria-describedby={
                        erroresVisibles.contrasena
                          ? "contrasena-usuario-error"
                          : undefined
                      }
                      className={`${CLASE_CAMPO} ${erroresVisibles.contrasena ? "border-red-700 focus:border-red-700 focus:ring-red-700/20" : ""}`}
                    />
                    {erroresVisibles.contrasena && (
                      <span
                        id="contrasena-usuario-error"
                        className={CLASE_ERROR}
                      >
                        {mostrarMensajes(erroresVisibles.contrasena)}
                      </span>
                    )}
                  </label>
                  <label
                    className="block text-sm font-semibold"
                    htmlFor="confirmar-contrasena-usuario"
                  >
                    Confirmar contraseña{" "}
                    <span className="text-[#5D737E]">*</span>
                    <input
                      id="confirmar-contrasena-usuario"
                      name="confirmarContrasena"
                      type={mostrarContrasena ? "text" : "password"}
                      autoComplete="new-password"
                      value={formulario.confirmarContrasena}
                      onChange={actualizarCampo}
                      onBlur={() => validarCampo("confirmarContrasena")}
                      aria-invalid={Boolean(
                        erroresVisibles.confirmarContrasena,
                      )}
                      aria-describedby={
                        erroresVisibles.confirmarContrasena
                          ? "confirmar-contrasena-usuario-error"
                          : undefined
                      }
                      className={`${CLASE_CAMPO} ${erroresVisibles.confirmarContrasena ? "border-red-700 focus:border-red-700 focus:ring-red-700/20" : ""}`}
                    />
                    {erroresVisibles.confirmarContrasena && (
                      <span
                        id="confirmar-contrasena-usuario-error"
                        className={CLASE_ERROR}
                      >
                        {mostrarMensajes(erroresVisibles.confirmarContrasena)}
                      </span>
                    )}
                  </label>
                </div>
              </section>

              <div className="flex flex-col-reverse gap-3 border-t border-[#BDC2BF] pt-6 sm:flex-row sm:justify-end">
                <Link
                  to={rutaPanel}
                  className="inline-flex min-h-12 items-center justify-center border rounded-full border-[#5D737E] px-6 font-bold transition hover:bg-[#964141]/20"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={enviando}
                  className="min-h-12 border rounded-full border-[#02111B] bg-[#02111B] px-7 font-semibold text-white transition hover:bg-[#5D737E] disabled:cursor-wait disabled:opacity-60"
                >
                  {enviando ? "Registrando usuario..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
