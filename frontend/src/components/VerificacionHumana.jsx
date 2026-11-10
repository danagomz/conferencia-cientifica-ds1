import { forwardRef, useImperativeHandle, useState } from 'react'

// Simulación visual: reemplazar por un CAPTCHA real antes de producción.
export const VerificacionHumana = forwardRef(function VerificacionHumana(
  { alCambiar, deshabilitada = false },
  referencia,
) {
  const [verificado, establecerVerificado] = useState(false)

  function reiniciar() {
    establecerVerificado(false)
    alCambiar(null)
  }

  useImperativeHandle(referencia, () => ({ reiniciar }))

  function verificar() {
    establecerVerificado(true)
    alCambiar('token-de-prueba')
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={verificado}
      disabled={deshabilitada || verificado}
      onClick={verificar}
      className="flex w-full items-center gap-3 rounded-xl border-2 border-highlight bg-panel px-4 py-3 text-left disabled:cursor-default"
    >
      <span
        className={`grid h-7 w-7 place-items-center rounded-md border-2 ${
          verificado ? 'border-brand bg-brand text-brand-fg' : 'border-highlight bg-page'
        }`}
      >
        {verificado && '✓'}
      </span>
      <span className="font-medium">No soy un robot</span>
      <span className="ml-auto text-xs text-muted">Simulación</span>
    </button>
  )
})
