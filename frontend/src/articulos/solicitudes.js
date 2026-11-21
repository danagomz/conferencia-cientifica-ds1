import axios from "axios";

const URL_API = import.meta.env.VITE_API_URL ?? "/api";
const URL_ARTICULOS = `${URL_API}/articulos/`;
const URL_FILTROS = `${URL_ARTICULOS}filtros/`;
const URL_ARTICULOS_PROPIOS = `${URL_ARTICULOS}propios/`;

function mensajeErrorConsulta(error) {
  if (!axios.isAxiosError(error)) throw error;

  const estado = error.response?.status;
  const detalle = error.response?.data?.detail;
  const mensajeDetalle =
    typeof detalle === "string" && detalle.length > 0 ? detalle : "";

  if (!error.response) {
    return "No fue posible establecer conexión, compruebe su conexión a internet e intente de nuevo";
  }

  if (estado === 401) {
    return "Su sesión caducó. Inicie sesión nuevamente";
  }

  if (estado === 403) {
    return (
      mensajeDetalle || "Su cuenta no tiene permiso para consultar artículos"
    );
  }

  if (estado >= 500) {
    return "El servidor no pudo completar la consulta. Intente de nuevo más tarde";
  }

  return mensajeDetalle || "No fue posible cargar los artículos";
}

export async function listarArticulos(token, filtros = {}) {
  if (!token) {
    throw new Error("Inicie sesión para consultar artículos");
  }

  const params = {};
  if (filtros.idLinea) params.id_linea = filtros.idLinea;
  if (filtros.estado) params.estado = filtros.estado;

  let respuesta;

  try {
    respuesta = await axios.get(URL_ARTICULOS, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params,
    });
  } catch (error) {
    throw new Error(mensajeErrorConsulta(error), { cause: error });
  }

  const resultados = respuesta.data?.resultados;

  if (!Array.isArray(resultados)) {
    throw new Error("El servidor devolvió respuesta de artículos inválida");
  }

  return resultados;
}

export async function obtenerCriteriosFiltrado(token) {
  if (!token) {
    throw new Error("Inicie sesión para consultar artículos");
  }

  try {
    const respuesta = await axios.get(URL_FILTROS, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const criterios = respuesta.data?.criterios;
    if (!Array.isArray(criterios)) {
      throw new Error("El servidor devolvió criterios de filtrado inválidos");
    }
    const opcionesDe = (parametro) =>
      criterios.find((c) => c.parametro === parametro)?.opciones ?? [];
    return { lineas: opcionesDe("id_linea"), estados: opcionesDe("estado") };
  } catch (error) {
    throw new Error(mensajeErrorConsulta(error), { cause: error });
  }
}

export async function listarArticulosPropios(token) {
  if (!token) {
    throw new Error("Inicie sesión para consultar artículos");
  }

  let respuesta;

  try {
    respuesta = await axios.get(URL_ARTICULOS_PROPIOS, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    throw new Error(mensajeErrorConsulta(error), { cause: error });
  }

  const resultados = respuesta.data?.resultados;

  if (!Array.isArray(resultados)) {
    throw new Error("El servidor devolvió respuesta de artículos inválida");
  }

  return resultados;
}

// ───────────── HU-014 · Versiones e historial del artículo (SDGC-192) ─────────────

const ROL_AUTOR = "AUTOR";

function cabecerasAutor(token) {
  return {
    Authorization: `Bearer ${token}`,
    "X-Rol-Activo": ROL_AUTOR,
  };
}

// Extrae el primer texto útil de las respuestas de error del backend:
// { mensaje }, { detail } o errores de validación { campo: ["texto"] }.
function textoErrorServidor(datos) {
  if (!datos || typeof datos !== "object") return "";
  if (typeof datos.mensaje === "string" && datos.mensaje) return datos.mensaje;
  if (typeof datos.detail === "string" && datos.detail) return datos.detail;

  for (const valor of Object.values(datos)) {
    if (typeof valor === "string" && valor) return valor;
    if (Array.isArray(valor) && typeof valor[0] === "string") return valor[0];
  }
  return "";
}

function mensajeErrorVersiones(error, accion) {
  if (!axios.isAxiosError(error)) throw error;

  if (!error.response) {
    return "No fue posible establecer conexión, compruebe su conexión a internet e intente de nuevo";
  }

  const estado = error.response.status;
  const mensajeServidor = textoErrorServidor(error.response.data);

  if (estado === 401) return "Su sesión caducó. Inicie sesión nuevamente";
  if (estado === 413) return "El archivo supera el tamaño máximo permitido";
  if (estado >= 500 && estado !== 502) {
    return `El servidor no pudo ${accion}. Intente de nuevo más tarde`;
  }

  return mensajeServidor || `No fue posible ${accion}`;
}

/**
 * Historial de versiones de un artículo del autor.
 * GET /api/articulos/<id>/ → el detalle incluye `versiones` ordenadas por
 * número ascendente (id, numero_version, tipo_version, nombre_archivo,
 * tamano_bytes, fecha_carga, observaciones). El backend no expone ruta de descarga.
 */
export async function obtenerHistorialVersiones(token, idArticulo) {
  if (!token) throw new Error("Inicie sesión para consultar el artículo");
  if (!idArticulo) throw new Error("No se indicó un artículo a consultar");

  let respuesta;

  try {
    respuesta = await axios.get(`${URL_ARTICULOS}${idArticulo}/`, {
      headers: cabecerasAutor(token),
    });
  } catch (error) {
    throw new Error(mensajeErrorVersiones(error, "consultar el artículo"), {
      cause: error,
    });
  }

  const articulo = respuesta.data;

  if (!articulo || typeof articulo !== "object") {
    throw new Error("El servidor devolvió un detalle de artículo inválido");
  }

  return {
    ...articulo,
    versiones: Array.isArray(articulo.versiones) ? articulo.versiones : [],
  };
}

/**
 * Estado del plazo de postulación de la conferencia del artículo.
 * GET /api/articulos/contexto/ → convocatorias[].postulaciones_abiertas y
 * fecha_limite_postulaciones. Devuelve null si la conferencia no aparece
 * (por ejemplo, no está activa): en ese caso decide el servidor.
 */
export async function obtenerPlazoPostulacion(token, idConferencia) {
  if (!token) throw new Error("Inicie sesión para consultar el plazo");

  let respuesta;

  try {
    respuesta = await axios.get(`${URL_ARTICULOS}contexto/`, {
      headers: cabecerasAutor(token),
    });
  } catch (error) {
    throw new Error(mensajeErrorVersiones(error, "consultar el plazo"), {
      cause: error,
    });
  }

  const convocatorias = respuesta.data?.convocatorias;
  if (!Array.isArray(convocatorias)) return null;

  const convocatoria = convocatorias.find(
    (item) => String(item.id) === String(idConferencia),
  );
  if (!convocatoria) return null;

  return {
    abierto: Boolean(convocatoria.postulaciones_abiertas),
    fechaLimite: convocatoria.fecha_limite_postulaciones ?? null,
  };
}

/**
 * Carga una nueva versión en PDF.
 * POST /api/articulos/<id>/versiones/ (multipart, campo `archivo`).
 * 201 → { mensaje, id_version, numero_version, tipo_version, nombre_archivo }
 * 400 → { mensaje } o { id_conferencia: [..] } (plazo) · 403/404 → { detail } · 502 → { mensaje }
 */
export async function cargarVersionArticulo(token, idArticulo, archivo) {
  if (!token) throw new Error("Inicie sesión para cargar una versión");
  if (!idArticulo) throw new Error("No se indicó el artículo");
  if (!archivo) throw new Error("Debe seleccionar un archivo");

  const formulario = new FormData();
  formulario.append("archivo", archivo);

  try {
    const respuesta = await axios.post(
      `${URL_ARTICULOS}${idArticulo}/versiones/`,
      formulario,
      {
        headers: {
          ...cabecerasAutor(token),
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return respuesta.data;
  } catch (error) {
    throw new Error(mensajeErrorVersiones(error, "cargar la versión"), {
      cause: error,
    });
  }
}

export async function obtenerArticulo(token, idArticulo) {
  if (!token) {
    throw new Error("Inicie sesión para consultar articulos");
  }

  if (!idArticulo) {
    throw new Error("No se indicó un artículo a consultar");
  }

  try {
    const respuesta = await axios.get(`${URL_ARTICULOS}${idArticulo}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!respuesta.data || typeof respuesta.data !== "object") {
      throw new Error("Se devolvió un detalle de artículo inválido");
    }

    return respuesta.data;
  } catch (error) {
    throw new Error(mensajeErrorConsulta(error), { cause: error });
  }
}
