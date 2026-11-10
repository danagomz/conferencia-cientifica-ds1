// Logo + nombre del sistema, igual que en el login.
export function Marca({ compacta = false }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid shrink-0 -rotate-3 place-items-center rounded-2xl bg-brand font-display font-extrabold tracking-tight text-brand-fg shadow-lg shadow-brand/20 ${
          compacta ? 'h-11 w-11 text-sm' : 'h-16 w-16 text-xl'
        }`}
      >
        SGC
      </div>
      <span className={`min-w-0 font-display font-bold leading-tight ${compacta ? 'text-base' : 'text-lg sm:text-xl'}`}>
        Sistema de Gestión de Convocatorias y Artículos
      </span>
    </div>
  )
}
