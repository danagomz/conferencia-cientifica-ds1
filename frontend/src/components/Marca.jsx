export function Marca({ compacta = false }) {
  const tamano = compacta ? "h-11 w-11 text-sm" : "h-16 w-16 text-xl";
  const tamanoNombre = compacta ? "text-base" : "text-lg sm:text-xl";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid shrink-0 -rotate-3 place-items-center rounded-2xl bg-brand font-display font-extrabold tracking-tight text-brand-fg shadow-lg shadow-brand/20 ${tamano}`}
      >
        SGC
      </div>
      <span
        className={`min-w-0 font-display font-bold leading-tight ${tamanoNombre}`}
      >
        Sistema de Gestión de Conferencias
      </span>
    </div>
  );
}
