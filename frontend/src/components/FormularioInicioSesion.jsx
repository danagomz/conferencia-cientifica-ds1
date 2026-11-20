import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { VerificacionHumana } from "./VerificacionHumana";
import { Marca } from "./Marca";
import { RecuperarContrasena } from "./RecuperarContrasena";

const IMAGEN_PORTADA = "/login-hero.jpg";
const claseCampo =
  "w-full rounded-none border-2 border-highlight bg-panel px-4 py-3 outline-none placeholder:text-muted/60 focus:border-brand focus:ring-4 focus:ring-highlight/30";

export function FormularioInicioSesion({ alEnviar }) {
  const [correo, establecerCorreo] = useState("");
  const [contrasena, establecerContrasena] = useState("");
  const [mostrarContrasena, establecerMostrarContrasena] = useState(false);
  const [tokenCaptcha, establecerTokenCaptcha] = useState(null);
  const [cargando, establecerCargando] = useState(false);
  const [error, establecerError] = useState("");
  const [recuperacionActiva, establecerRecuperacionActiva] = useState(false);
  const referenciaCaptcha = useRef(null);

  const puedeEnviar =
    correo.trim() !== "" &&
    contrasena !== "" &&
    tokenCaptcha !== null &&
    !cargando;

  async function enviarFormulario(evento) {
    evento.preventDefault();
    if (!puedeEnviar) return;

    establecerError("");
    establecerCargando(true);
    try {
      await alEnviar({ correo, contrasena, tokenCaptcha });
    } catch (errorEnvio) {
      establecerError(
        errorEnvio?.message || "No se pudo iniciar sesión. Intenta de nuevo.",
      );
      referenciaCaptcha.current?.reiniciar();
    } finally {
      establecerCargando(false);
    }
  }

  return (
    <div className="grid min-h-dvh bg-page font-sans text-fg md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <section className="relative flex min-h-dvh flex-col px-5 py-5 sm:px-10 sm:py-8 lg:px-14 xl:px-20">
        <header>
          <Marca />
        </header>

        <div className="relative mt-6 h-28 overflow-hidden rounded-[1.5rem] bg-brand px-5 py-4 text-brand-fg md:hidden">
          <div className="absolute -right-4 -top-10 h-32 w-32 rounded-full border-[18px] border-white/10" />
          <div className="absolute right-16 -bottom-12 h-24 w-24 rotate-12 rounded-[1.75rem] bg-highlight/80" />
          <div className="relative z-10 flex h-full max-w-[75%] flex-col justify-center">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/65">
              Investigación, comunidad y ciencia
            </span>
            <span className="mt-1 font-display text-lg font-bold leading-tight">
              Tus ideas merecen reconocimiento.
            </span>
          </div>
        </div>

        <main className="my-auto mx-auto w-full max-w-xl py-8 sm:py-12">
          {recuperacionActiva ? (
            <RecuperarContrasena
              correoInicial={correo}
              alVolver={() => establecerRecuperacionActiva(false)}
            />
          ) : (
            <>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
                Portal
              </span>
              <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                Iniciar sesión
              </h1>
              <p className="mt-3 max-w-lg leading-relaxed text-muted">
                Si tiene una cuenta acceda a su panel de gestión académica y
                científica.
              </p>

              <form onSubmit={enviarFormulario} className="mt-7 space-y-5">
                <div>
                  <label
                    htmlFor="correo"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="correo"
                    type="email"
                    required
                    autoComplete="username"
                    value={correo}
                    onChange={(evento) => {
                      establecerCorreo(evento.target.value);
                      establecerError("");
                    }}
                    placeholder="ejemplo@correo.com"
                    className={claseCampo}
                  />
                </div>

                <div>
                  <div className="mb-1.5">
                    <label
                      htmlFor="contrasena"
                      className="text-sm font-semibold"
                    >
                      Contraseña
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      id="contrasena"
                      type={mostrarContrasena ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={contrasena}
                      onChange={(evento) => {
                        establecerContrasena(evento.target.value);
                        establecerError("");
                      }}
                      placeholder="Contraseña"
                      className={`${claseCampo} pr-14`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        establecerMostrarContrasena((visible) => !visible)
                      }
                      aria-label={
                        mostrarContrasena
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      title={
                        mostrarContrasena
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
                    >
                      {mostrarContrasena ? (
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-5 w-5"
                        >
                          <path
                            d="M3 3l18 18M10.7 10.7A2 2 0 0 0 13.3 13.3M9.88 5.17A10.72 10.72 0 0 1 12 5c5 0 8.5 4.5 9.5 6.2a2.5 2.5 0 0 1 0 1.6 10.6 10.6 0 0 1-2.42 3.16M6.5 6.5A12.7 12.7 0 0 0 2.5 11.2a2.5 2.5 0 0 0 0 1.6C3.5 14.5 7 19 12 19a9.7 9.7 0 0 0 4.07-.87"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
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
                            d="M2.5 12.4C3.5 10.6 7 6 12 6s8.5 4.6 9.5 6.4a1.8 1.8 0 0 1 0 1.2C20.5 15.4 17 20 12 20s-8.5-4.6-9.5-6.4a1.8 1.8 0 0 1 0-1.2Z"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                          <circle
                            cx="12"
                            cy="13"
                            r="3"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                        </svg>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => establecerRecuperacionActiva(true)}
                    className="mt-2 text-sm font-semibold text-highlight underline underline-offset-4 transition hover:text-brand"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <VerificacionHumana
                  ref={referenciaCaptcha}
                  alCambiar={establecerTokenCaptcha}
                  deshabilitada={cargando}
                />

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-highlight bg-soft px-4 py-3 text-sm"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!puedeEnviar}
                  className="w-full rounded-none bg-brand px-8 py-3.5 font-semibold text-brand-fg transition hover:bg-brand-hover hover:text-brand-hover-fg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cargando ? "Ingresando…" : "Ingresar"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-muted">
                ¿Eres nuevo?{" "}
                <Link
                  to="/registro-autor"
                  className="font-semibold text-highlight underline underline-offset-4"
                >
                  Regístrate como autor
                </Link>
              </p>
            </>
          )}
        </main>
      </section>

      <aside className="relative hidden min-h-dvh p-4 md:block">
        <div className="relative h-full min-h-[38rem] overflow-hidden bg-brand">
          <img
            src={IMAGEN_PORTADA}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#02111B]/95 via-[#02111B]/10 to-[#02111B]/15" />
          <div className="absolute right-10 top-10 h-36 w-36 rounded-full border-[24px] border-white/20" />
          <div className="absolute right-36 top-36 h-20 w-20 rotate-12 rounded-[1.5rem] bg-highlight/80" />
          <div className="absolute bottom-8 left-8 right-8 rounded-[1.5rem] border border-white/20 bg-[#02111B]/30 p-7 text-white backdrop-blur-md lg:bottom-12 lg:left-12 lg:right-12 lg:p-9">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
              Investigación · comunidad · ciencia
            </span>
            <h2 className="mt-4 max-w-xl font-display text-3xl font-extrabold leading-tight lg:text-4xl">
              Gestión académica y científica de conferencias
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80">
              Gestione convocatorias, envíe sus artículos científicos y consulte
              dictámenes del comité.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
