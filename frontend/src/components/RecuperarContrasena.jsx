import { useRef, useState } from 'react'
import { restablecerContrasena, solicitarCodigoRecuperacion } from '../autenticacion/solicitudes'

const claseCampo =
  'w-full rounded-xl border-2 border-highlight bg-panel px-4 py-3 outline-none placeholder:text-muted/60 focus:border-brand focus:ring-4 focus:ring-highlight/30'

export function RecuperarContrasena({ correoInicial = '', alVolver }) {
  const [paso, establecerPaso] = useState('correo')
  const [correo, establecerCorreo] = useState(correoInicial)
  const [digitosPin, establecerDigitosPin] = useState(Array(6).fill(''))
  const [contrasena, establecerContrasena] = useState('')
  const [confirmacion, establecerConfirmacion] = useState('')
  const [cargando, establecerCargando] = useState(false)
  const [mensaje, establecerMensaje] = useState('')
  const [error, establecerError] = useState('')
  const referenciasPin = useRef([])

  function actualizarPin(indice, texto) {
    const digitos = texto.replace(/\D/g, '').slice(0, 6 - indice)
    if (!digitos) {
      establecerDigitosPin((actuales) =>
        actuales.map((digito, posicion) => (posicion === indice ? '' : digito)),
      )
      establecerError('')
      return
    }

    establecerDigitosPin((actuales) => {
      const nuevos = [...actuales]
      for (let posicion = 0; posicion < digitos.length; posicion += 1) {
        nuevos[indice + posicion] = digitos[posicion]
      }
      return nuevos
    })
    establecerError('')
    referenciasPin.current[Math.min(indice + digitos.length, 5)]?.focus()
  }

  function pegarPin(indice, evento) {
    evento.preventDefault()
    actualizarPin(indice, evento.clipboardData.getData('text'))
  }

  async function enviarCorreo(evento) {
    evento.preventDefault()
    establecerError('')
    establecerCargando(true)
    try {
      const resultado = await solicitarCodigoRecuperacion(correo)
      establecerMensaje(resultado.detail)
      establecerPaso('pin')
    } catch (errorEnvio) {
      establecerError(errorEnvio.message)
    } finally {
      establecerCargando(false)
    }
  }

  async function cambiarContrasena(evento) {
    evento.preventDefault()
    establecerError('')
    if (contrasena !== confirmacion) {
      establecerError('Las contraseñas no coinciden.')
      return
    }

    establecerCargando(true)
    try {
      const resultado = await restablecerContrasena({
        correo,
        pin: digitosPin.join(''),
        contrasena,
      })
      establecerMensaje(resultado.detail)
      establecerPaso('completado')
    } catch (errorEnvio) {
      establecerError(errorEnvio.message)
    } finally {
      establecerCargando(false)
    }
  }

  return (
    <section aria-labelledby="titulo-recuperacion" className="animate-rise">
      <button
        type="button"
        onClick={alVolver}
        className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-brand"
      >
        <span aria-hidden="true">←</span> Volver a iniciar sesión
      </button>

      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-soft text-xl" aria-hidden="true">
          {paso === 'completado' ? '✓' : '✳'}
        </div>
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
          Recuperación segura
        </span>
      </div>

      <h1 id="titulo-recuperacion" className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
        {paso === 'completado' ? '¡Listo!' : 'Recupera tu acceso'}
      </h1>
      <p className="mt-3 max-w-lg leading-relaxed text-muted">
        {paso === 'correo' && 'Te enviaremos un PIN de un solo uso para que puedas crear una contraseña nueva.'}
        {paso === 'pin' && 'Revisa tu correo e ingresa el PIN de 6 dígitos junto con tu nueva contraseña.'}
        {paso === 'completado' && 'Tu contraseña fue actualizada. Ya puedes entrar con tus nuevos datos.'}
      </p>

      <div className="mt-7 flex items-center gap-2" aria-label="Progreso de recuperación">
        {[1, 2, 3].map((numero) => {
          const activo =
            (paso === 'correo' && numero === 1) ||
            (paso === 'pin' && numero === 2) ||
            (paso === 'completado' && numero === 3)
          const terminado =
            (paso === 'pin' && numero === 1) || (paso === 'completado' && numero < 3)
          return (
            <span
              key={numero}
              className={`h-1.5 flex-1 rounded-full ${activo || terminado ? 'bg-brand' : 'bg-soft'}`}
            />
          )
        })}
      </div>

      {paso === 'correo' && (
        <form onSubmit={enviarCorreo} className="mt-7 space-y-5">
          <div>
            <label htmlFor="correo-recuperacion" className="mb-1.5 block text-sm font-semibold">
              Correo asociado a tu cuenta
            </label>
            <input
              id="correo-recuperacion"
              type="email"
              required
              autoComplete="email"
              value={correo}
              onChange={(evento) => {
                establecerCorreo(evento.target.value)
                establecerError('')
              }}
              placeholder="ejemplo@correo.com"
              className={claseCampo}
            />
          </div>
          <p className="border border-line bg-soft/60 px-4 py-3 text-sm leading-relaxed text-muted">
            Por seguridad, te confirmaremos la solicitud sin revelar si el correo tiene una cuenta.
          </p>
          {error && <p role="alert" className="rounded-xl border border-highlight bg-soft px-4 py-3 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-full bg-brand px-8 py-3.5 font-semibold text-brand-fg transition hover:bg-brand-hover hover:text-brand-hover-fg disabled:cursor-wait disabled:opacity-60"
          >
            {cargando ? 'Enviando PIN…' : 'Enviar PIN al correo'}
          </button>
        </form>
      )}

      {paso === 'pin' && (
        <form onSubmit={cambiarContrasena} className="mt-7 space-y-5">
          <p role="status" className="border border-line bg-soft/60 px-4 py-3 text-sm leading-relaxed text-muted">
            {mensaje}
          </p>
          <div>
            <label id="etiqueta-pin-recuperacion" className="mb-1.5 block text-sm font-semibold">
              PIN de 6 dígitos
            </label>
            <div
              role="group"
              aria-labelledby="etiqueta-pin-recuperacion"
              className="flex gap-2"
            >
              {digitosPin.map((digito, indice) => (
                <input
                  key={indice}
                  ref={(elemento) => {
                    referenciasPin.current[indice] = elemento
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  required
                  autoComplete={indice === 0 ? 'one-time-code' : 'off'}
                  aria-label={`Dígito ${indice + 1} del PIN`}
                  value={digito}
                  onChange={(evento) => actualizarPin(indice, evento.target.value)}
                  onPaste={(evento) => pegarPin(indice, evento)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Backspace' && !digito && indice > 0) {
                      referenciasPin.current[indice - 1]?.focus()
                    } else if (evento.key === 'ArrowLeft' && indice > 0) {
                      referenciasPin.current[indice - 1]?.focus()
                    } else if (evento.key === 'ArrowRight' && indice < 5) {
                      referenciasPin.current[indice + 1]?.focus()
                    }
                  }}
                  className="h-12 min-w-0 flex-1 rounded-lg border-2 border-highlight bg-panel text-center font-mono text-lg font-bold outline-none focus:border-brand focus:ring-4 focus:ring-highlight/30 sm:h-14 sm:text-xl"
                />
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="nueva-contrasena" className="mb-1.5 block text-sm font-semibold">
              Nueva contraseña
            </label>
            <input
              id="nueva-contrasena"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={contrasena}
              onChange={(evento) => establecerContrasena(evento.target.value)}
              placeholder="Al menos 8 caracteres"
              className={`${claseCampo} rounded-none`}
            />
          </div>
          <div>
            <label htmlFor="confirmar-contrasena" className="mb-1.5 block text-sm font-semibold">
              Confirma tu contraseña
            </label>
            <input
              id="confirmar-contrasena"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmacion}
              onChange={(evento) => establecerConfirmacion(evento.target.value)}
              placeholder="Escríbela de nuevo"
              className={`${claseCampo} rounded-none`}
            />
          </div>
          {error && <p role="alert" className="rounded-xl border border-highlight bg-soft px-4 py-3 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={cargando || digitosPin.some((digito) => digito === '')}
            className="w-full rounded-full bg-brand px-8 py-3.5 font-semibold text-brand-fg transition hover:bg-brand-hover hover:text-brand-hover-fg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? 'Actualizando…' : 'Guardar nueva contraseña'}
          </button>
          <button
            type="button"
            disabled={cargando}
            onClick={enviarCorreo}
            className="w-full py-2 text-sm font-semibold text-highlight underline underline-offset-4 disabled:opacity-50"
          >
            Enviar un PIN nuevo
          </button>
        </form>
      )}

      {paso === 'completado' && (
        <div className="mt-8">
          <p role="status" className="rounded-2xl border border-line bg-soft/60 px-4 py-3 text-sm leading-relaxed text-muted">
            {mensaje}
          </p>
          <button
            type="button"
            onClick={alVolver}
            className="mt-6 w-full rounded-full bg-brand px-8 py-3.5 font-semibold text-brand-fg transition hover:bg-brand-hover hover:text-brand-hover-fg"
          >
            Ir a iniciar sesión
          </button>
        </div>
      )}
    </section>
  )
}
