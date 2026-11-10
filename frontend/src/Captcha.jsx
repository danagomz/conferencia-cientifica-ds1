import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

export const Captcha = forwardRef(function Captcha({ onChange, disabled = false }, ref) {
  const turnstileRef = useRef(null)
  const [error, setError] = useState(false)

  const reset = () => {
    setError(false)
    onChange(null)
    turnstileRef.current?.reset()
  }
  useImperativeHandle(ref, () => ({ reset }))

  if (!SITE_KEY) {
    return (
      <p role="alert" className="rounded-xl border-2 border-highlight bg-soft px-4 py-3 text-sm font-medium">
        Falta configurar el CAPTCHA (VITE_TURNSTILE_SITE_KEY).
      </p>
    )
  }

  return (
    <div>
      <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
        <Turnstile
          ref={turnstileRef}
          siteKey={SITE_KEY}
          options={{ language: 'es', size: 'flexible', theme: 'light' }}
          onSuccess={(token) => {
            setError(false)
            onChange(token)
          }}
          onExpire={() => onChange(null)}
          onError={() => {
            setError(true)
            onChange(null)
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold">
          No se pudo verificar el CAPTCHA. Recarga la página e intenta de nuevo.
        </p>
      )}
    </div>
  )
})
