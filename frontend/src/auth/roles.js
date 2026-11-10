// Roles del sistema y su pantalla de inicio.
// Los nombres coinciden con los grupos de Django (ADMIN, COMITE, AUTOR).
// Para agregar un rol nuevo: añadirlo aquí y listo (login, selector y guardas lo reconocen).

export const ROLES_DISPONIBLES = {
  ADMIN: {
    nombre: 'Administrador',
    descripcion: 'Gestiona usuarios y la configuración de la conferencia.',
    rutaInicio: '/admin',
    funciones: ['Crear usuarios y asignar roles'],
  },
  COMITE: {
    nombre: 'Comité científico',
    descripcion: 'Registra usuarios y gestiona la evaluación de los artículos.',
    rutaInicio: '/comite',
    funciones: ['Crear usuarios con los roles autorizados'],
  },
  AUTOR: {
    nombre: 'Autor',
    descripcion: 'Postula artículos a la conferencia y gestiona sus versiones.',
    rutaInicio: '/autor',
    funciones: ['Registrar un artículo con sus autores y línea temática'],
  },
}

// Ruta donde el usuario elige rol cuando su cuenta tiene más de uno (CA-042A).
export const RUTA_ELEGIR_ROL = '/elegir-rol'

// Convierte lo que mande el backend ('autor', 'AUTOR', ' Autor ') en una clave válida.
// Los roles desconocidos se descartan: nunca se da acceso a algo que el frontend no conoce.
export function normalizarRoles(roles) {
  const lista = Array.isArray(roles) ? roles : []
  const claves = lista
    .map((r) => String(r).trim().toUpperCase())
    .filter((rol) => Object.hasOwn(ROLES_DISPONIBLES, rol))
  return [...new Set(claves)]
}


// A dónde debe ir una sesión recién creada o ya existente (CA-038 y CA-039):
//  - con rol elegido  → la pantalla de ese rol
//  - con varios roles → el selector
export function rutaInicial(sesion) {
  if (!sesion) return '/login'
  if (sesion.rolActivo) return ROLES_DISPONIBLES[sesion.rolActivo].rutaInicio
  return RUTA_ELEGIR_ROL
}
