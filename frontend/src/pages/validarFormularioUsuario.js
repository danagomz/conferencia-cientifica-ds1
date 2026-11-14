function codigosDeRoles(rolesPermitidos) {
  return rolesPermitidos.map((rol) => (
    typeof rol === 'string' ? rol : rol.codigo
  ))
}

function similitudRapida(texto, atributo) {
  const frecuencias = new Map()
  for (const caracter of atributo) {
    frecuencias.set(caracter, (frecuencias.get(caracter) ?? 0) + 1)
  }

  let coincidencias = 0
  for (const caracter of texto) {
    const frecuencia = frecuencias.get(caracter) ?? 0
    if (frecuencia > 0) {
      coincidencias += 1
      frecuencias.set(caracter, frecuencia - 1)
    }
  }

  return (2 * coincidencias) / (texto.length + atributo.length)
}

function esSimilarADatosPersonales(contrasena, datos) {
  const atributos = [datos.nombre, datos.apellido, datos.correo]
    .filter(Boolean)
    .flatMap((atributo) => {
      const normalizado = atributo.toLocaleLowerCase()
      return [...normalizado.split(/[^\p{L}\p{N}_]+/u), normalizado]
    })
    .filter((atributo) => atributo.length > 0)
  const contrasenaNormalizada = contrasena.toLocaleLowerCase()

  return atributos.some(
    (atributo) => similitudRapida(contrasenaNormalizada, atributo) >= 0.7,
  )
}

export function validarFormularioUsuario(datos, rolesPermitidos) {
  const errores = {}
  const rolesValidos = codigosDeRoles(rolesPermitidos)
  const camposObligatorios = [
    ['nombre', 'Ingresa el nombre.'],
    ['apellido', 'Ingresa el apellido.'],
    ['correo', 'Ingresa el correo electrónico.'],
    ['institucion', 'Ingresa la institución o afiliación.'],
  ]

  camposObligatorios.forEach(([campo, mensaje]) => {
    if (!datos[campo]?.trim()) errores[campo] = [mensaje]
  })

  for (const campo of ['nombre', 'apellido', 'institucion']) {
    if (datos[campo]?.length > 150) {
      errores[campo] = ['Este campo no puede superar los 150 caracteres.']
    }
  }

  const correo = datos.correo?.trim() ?? ''
  if (correo && correo.length > 150) {
    errores.correo = [
      'El correo, que también se usa como nombre de usuario, no puede superar los 150 caracteres.',
    ]
  } else if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    errores.correo = ['Ingresa un correo electrónico válido, sin espacios.']
  }

  if (!datos.contrasena) {
    errores.contrasena = ['Ingresa una contraseña.']
  } else if (datos.contrasena.length < 8) {
    errores.contrasena = ['La contraseña debe tener al menos 8 caracteres.']
  } else if (/^\d+$/.test(datos.contrasena)) {
    errores.contrasena = ['La contraseña no puede estar formada solo por números.']
  } else if (esSimilarADatosPersonales(datos.contrasena, datos)) {
    errores.contrasena = ['La contraseña no puede ser demasiado similar a tu nombre, apellido o correo.']
  }

  if (!datos.confirmarContrasena) {
    errores.confirmarContrasena = ['Confirma la contraseña.']
  } else if (datos.contrasena !== datos.confirmarContrasena) {
    errores.confirmarContrasena = ['Las contraseñas no coinciden.']
  }

  const roles = Array.isArray(datos.roles) ? datos.roles : []
  if (roles.length === 0) {
    errores.roles = ['Selecciona al menos un rol para el usuario.']
  } else if (roles.some((rol) => !rolesValidos.includes(rol))) {
    errores.roles = ['Selecciona únicamente roles autorizados para tu cuenta.']
  }

  return errores
}
