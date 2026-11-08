import { forwardRef, useImperativeHandle, useState } from 'react'

/* ════════════════════════════════════════════════════════════════
   CAPTCHA · PUNTO DE INTEGRACIÓN
   ════════════════════════════════════════════════════════════════

   CONTRATO con LoginForm (esto NO se cambia):

   Props
     onChange(token)  Llamar con un string cuando el usuario queda
                      verificado, y con null cuando no está verificado
                      (error, expiró, reinicio).
     disabled         true mientras el formulario se está enviando.

   Ref
     reset()          Vuelve al estado inicial y llama onChange(null).
                      LoginForm lo usa cuando el login falla, porque
                      un token solo sirve una vez.

   LoginForm manda el token junto al login:
     onSubmit({ email, password, captchaToken })
   y el backend lo valida.

   LO QUE SE EDITA: solo la ZONA DE IMPLEMENTACIÓN (función verify)
   y, si hace falta, el JSX de abajo. El resto queda igual.

   OPCIÓN A · Google reCAPTCHA v2   (npm i react-google-recaptcha)
     <ReCAPTCHA
       ref={recaptchaRef}
       sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
       onChange={(token) => onChange(token)}
       onExpired={() => onChange(null)}
     />
     y en reset(): recaptchaRef.current?.reset()

   OPCIÓN B · Captcha propio (imagen o texto desde el backend)
     GET  /api/captcha        →  { id, imageUrl }
     el usuario escribe la respuesta y onChange({ id, answer })
     (el token puede ser un objeto si el backend lo prefiere).
   ════════════════════════════════════════════════════════════════ */

export const Captcha = forwardRef(function Captcha({ onChange, disabled = false }, ref) {
  // 'idle' | 'loading' | 'verified' | 'error'
  const [status, setStatus] = useState('idle')

  const reset = () => {
    setStatus('idle')
    onChange(null)
  }
  useImperativeHandle(ref, () => ({ reset }))

  // ▼▼▼ ZONA DE IMPLEMENTACIÓN ▼▼▼ ─────────────────────────────
  const verify = async () => {
    setStatus('loading')
    try {
      // TODO: reemplazar este bloque por la verificación real.
      // Simulación para probar el flujo del formulario:
      await new Promise((resolve) => setTimeout(resolve, 700))
      const token = 'token-de-prueba'

      setStatus('verified')
      onChange(token)
    } catch {
      setStatus('error')
      onChange(null)
    }
  }
  // ▲▲▲ FIN DE LA ZONA DE IMPLEMENTACIÓN ▲▲▲ ───────────────────

  const busy = status === 'loading'
  const verified = status === 'verified'

  return (
    <div>
      <div className="flex items-center justify-between gap-4 rounded-xl border-2 border-highlight bg-panel px-4 py-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={verified}
          disabled={disabled || busy || verified}
          onClick={verify}
          className="group flex items-center gap-3 text-left disabled:cursor-default"
        >
          <span
            className={`grid h-7 w-7 place-items-center rounded-md border-2 transition ${
              verified
                ? 'border-brand bg-brand text-brand-fg'
                : 'border-highlight bg-page group-hover:border-brand'
            }`}
          >
            {busy && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-highlight border-t-brand" />
            )}
            {verified && (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
          <span className="font-medium">No soy un robot</span>
        </button>

        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Captcha</span>
      </div>

      {status === 'error' && (
        <p role="alert" className="mt-2 text-sm font-semibold">
          No se pudo verificar. Intenta de nuevo.
        </p>
      )}
    </div>
  )
})