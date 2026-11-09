import { forwardRef, useImperativeHandle, useState } from 'react'

// Simulación visual: reemplazar por un CAPTCHA real antes de producción.
export const Captcha = forwardRef(function Captcha({ onChange, disabled = false }, ref) {
  const [verified, setVerified] = useState(false)

  function reset() {
    setVerified(false)
    onChange(null)
  }

  useImperativeHandle(ref, () => ({ reset }))

  function verify() {
    setVerified(true)
    onChange('token-de-prueba')
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={verified}
      disabled={disabled || verified}
      onClick={verify}
      className="flex w-full items-center gap-3 rounded-xl border-2 border-highlight bg-panel px-4 py-3 text-left disabled:cursor-default"
    >
      <span
        className={`grid h-7 w-7 place-items-center rounded-md border-2 ${
          verified ? 'border-brand bg-brand text-brand-fg' : 'border-highlight bg-page'
        }`}
      >
        {verified && '✓'}
      </span>
      <span className="font-medium">No soy un robot</span>
      <span className="ml-auto text-xs text-muted">Simulación</span>
    </button>
  )
})
