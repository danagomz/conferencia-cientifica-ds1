export const ESTADOS = {
  REGISTRADO: {
    etiqueta: "Registrado",
    clases: "border-dashed border-highlight bg-panel text-muted",
  },
  EN_REVISION: {
    etiqueta: "En revisión",
    clases: "border-pending-line bg-pending text-pending-fg",
  },
  ACEPTADO: {
    etiqueta: "Aceptado",
    clases: "border-highlight bg-highlight text-brand-fg",
  },
  RECHAZADO: {
    etiqueta: "Rechazado",
    clases:
      "border-muted/40 bg-[repeating-linear-gradient(135deg,transparent_0_4px,color-mix(in_srgb,var(--sgc-muted)_14%,transparent)_4px_8px)] text-muted",
  },
};

export function infoEstado(codigo) {
  return (
    ESTADOS[codigo] ?? {
      etiqueta: codigo,
      clases: "border-line bg-soft/40 text-muted",
    }
  );
}
