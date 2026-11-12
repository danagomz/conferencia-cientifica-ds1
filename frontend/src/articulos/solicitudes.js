// Capa de solicitudes de artículos. Por ahora devuelve datos de prueba;
// cuando exista el endpoint de consulta, solo cambia esta función.

const RETARDO_MS = 800; // simula la espera de la red

const PRUEBA = [
  {
    id: 1,
    titulo: "Optimización de modelos de lenguaje para el análisis de datos",
    autores: [
      { nombre: "María González", responsable: true },
      { nombre: "Carlos Rodríguez", responsable: false },
    ],
    linea: "Sistemas Inteligentes",
    fecha: "2026-11-09",
    estado: "EN_REVISION",
  },
  {
    id: 2,
    titulo: "Estudio estandarizado de modelos de lenguaje",
    autores: [{ nombre: "Ana Martínez", responsable: true }],
    linea: "Educación en Informática",
    fecha: "2026-11-05",
    estado: "ACEPTADO",
  },
  {
    id: 3,
    titulo: "Arquitecturas de software: mercado laboral y usabilidad",
    autores: [{ nombre: "Luis Pérez", responsable: true }],
    linea: "Software en la práctica",
    fecha: "2026-11-03",
    estado: "REGISTRADO",
  },
  {
    id: 4,
    titulo: "Python para análisis de datos",
    autores: [{ nombre: "Laura Gómez", responsable: true }],
    linea: "Tecnologías en Informática",
    fecha: "2026-10-28",
    estado: "RECHAZADO",
  },
  {
    id: 5,
    titulo: "Frameworks de trabajo ágil",
    autores: [{ nombre: "Sofía Ramírez", responsable: true }],
    linea: "Sistemas de Software",
    fecha: "2026-10-12",
    estado: "ACEPTADO",
  },
  {
    id: 6,
    titulo: "Frameworks",
    autores: [{ nombre: "Maria Paz", responsable: true }],
    linea: "Sistemas de Software",
    fecha: "2026-10-12",
    estado: "ACEPTADO",
  },
];

export async function listarArticulos() {
  await new Promise((resolver) => setTimeout(resolver, RETARDO_MS));
  return PRUEBA;
}
