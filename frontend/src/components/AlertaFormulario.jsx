import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const ESTILOS = {
  exito: "border-emerald-200 bg-emerald-50 text-emerald-900 focus:ring-emerald-500",
  error: "border-red-200 bg-red-50 text-red-900 focus:ring-red-500",
};

// Alerta accesible del formulario: se anuncia a lectores de pantalla
// (role="status" en éxito, role="alert" en error), se desplaza a la vista
// y recibe el foco cada vez que aparece un mensaje nuevo.
export function AlertaFormulario({ alerta }) {
  const referencia = useRef(null);
  const identificador = alerta?.id;

  useEffect(() => {
    const elemento = referencia.current;
    if (!identificador || !elemento) return;

    const reducirMovimiento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    elemento.scrollIntoView({
      behavior: reducirMovimiento ? "auto" : "smooth",
      block: "center",
    });
    elemento.focus({ preventScroll: true });
  }, [identificador]);

  if (!alerta) return null;

  const esError = alerta.tipo === "error";

  return (
    <div
      ref={referencia}
      tabIndex={-1}
      role={esError ? "alert" : "status"}
      aria-live={esError ? "assertive" : "polite"}
      aria-atomic="true"
      className={`rounded-xl border px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-offset-2 ${
        ESTILOS[esError ? "error" : "exito"]
      }`}
    >
      <p className="font-bold">{alerta.mensaje}</p>
      {alerta.detalles?.length > 0 && (
        <ul className="mt-2 list-inside list-disc space-y-1">
          {alerta.detalles.map((detalle) => (
            <li key={detalle}>{detalle}</li>
          ))}
        </ul>
      )}
      {alerta.enlace && (
        <Link
          to={alerta.enlace.ruta}
          className="mt-3 inline-flex font-semibold underline"
        >
          {alerta.enlace.texto}
        </Link>
      )}
    </div>
  );
}