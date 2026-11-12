// Línea temática → código de dos letras y color (tokens del tema).
const LINEAS = [
  {
    clave: "sistemas inteligentes",
    codigo: "SI",
    clases: "bg-brand text-brand-fg",
  },
  {
    clave: "tecnologias en informatica",
    codigo: "TI",
    clases: "bg-highlight text-brand-fg",
  },
  {
    clave: "educacion en informatica",
    codigo: "EI",
    clases: "bg-pending text-pending-fg",
  },
  { clave: "sistemas de software", codigo: "SS", clases: "bg-soft text-fg" },
  {
    clave: "software en la practica",
    codigo: "SP",
    clases: "bg-panel text-fg",
  },
];

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function infoLinea(nombre) {
  const clave = normalizar(nombre);
  const conocida = LINEAS.find((l) => l.clave === clave);
  if (conocida) return conocida;

  const iniciales = nombre
    .split(/\s+/)
    .filter((palabra) => palabra.length > 2)
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join("");
  return { codigo: iniciales || "··", clases: "bg-soft text-fg" };
}
