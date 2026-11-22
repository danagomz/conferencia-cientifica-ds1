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
  if (filtros.sinEvaluadores) {
    params.sin_evaluadores = "true";
  }

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

// Campos donde el backend puede informar errores de validación del archivo
// (400): { mensaje }, { detail }, { archivo: [..] }, { pdf: [..] },
// { non_field_errors: [..] } o { id_conferencia: [..] } (plazo vencido).
const CAMPOS_ERROR_VERSION = [
  "mensaje",
  "detail",
  "archivo",
  "pdf",
  "non_field_errors",
  "id_conferencia",
];

function primerTexto(valor) {
  if (typeof valor === "string") return valor.trim();
  if (Array.isArray(valor)) {
    for (const elemento of valor) {
      const texto = primerTexto(elemento);
      if (texto) return texto;
    }
  }
  return "";
}

// Extrae el primer texto útil de una respuesta de error del servidor.
function textoErrorServidor(datos) {
  if (typeof datos === "string") {
    // Una página HTML de error (por ejemplo un 500) no es un mensaje para el autor.
    return datos.trim().startsWith("<") ? "" : datos.trim();
  }
  if (!datos || typeof datos !== "object") return "";

  for (const campo of CAMPOS_ERROR_VERSION) {
    const texto = primerTexto(datos[campo]);
    if (texto) return texto;
  }
  for (const valor of Object.values(datos)) {
    const texto = primerTexto(valor);
    if (texto) return texto;
  }
  return "";
}

// Traduce cualquier fallo de Axios a un mensaje claro en español (CA-098).
// `accion` completa frases como "No fue posible {accion}".
function mensajeErrorVersiones(error, accion) {
  if (!axios.isAxiosError(error)) throw error;

  if (!error.response) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return "La solicitud tardó demasiado en responder. Intente de nuevo";
    }
    return "No fue posible establecer conexión, compruebe su conexión a internet e intente de nuevo";
  }

  const estado = error.response.status;
  const mensajeServidor = textoErrorServidor(error.response.data);

  if (estado === 401) return "Su sesión caducó. Inicie sesión nuevamente";

  if (estado === 403) {
    return (
      mensajeServidor ||
      "No tiene permiso para esta operación. Solo el autor responsable puede cargar versiones del artículo"
    );
  }

  if (estado === 404) {
    return mensajeServidor || "El artículo no existe o no está disponible";
  }

  if (estado === 413) return "El archivo supera el tamaño máximo permitido";

  if (estado === 400 || estado === 422) {
    return (
      mensajeServidor ||
      `No fue posible ${accion}: revise que el archivo sea un PDF válido`
    );
  }

  // 502: el almacenamiento falló y el backend envía un mensaje propio.
  if (estado === 502) {
    return (
      mensajeServidor ||
      "No fue posible almacenar el archivo. Inténtelo nuevamente"
    );
  }

  if (estado >= 500) {
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

// ───────────── HU-012 · Modificar artículo (SDGC-173) ─────────────

// Campos del servidor donde el backend informa errores de validación (400).
const CAMPOS_EDITABLES_SERVIDOR = [
  "titulo",
  "resumen",
  "palabras_clave",
  "id_linea",
];

function erroresCamposServidor(datos) {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return {};

  const campos = {};
  for (const campo of CAMPOS_EDITABLES_SERVIDOR) {
    const texto = primerTexto(datos[campo]);
    if (texto) campos[campo] = texto;
  }
  return campos;
}

// Convierte un fallo de Axios en un Error con mensaje claro en español.
// Agrega `estadoHttp` y `erroresCampos` para que la pantalla decida qué mostrar.
function crearErrorEdicion(error, accion) {
  const estadoHttp = error.response?.status ?? null;
  const datos = error.response?.data;
  const erroresCampos = erroresCamposServidor(datos);
  const mensajeServidor = textoErrorServidor(datos);
  let mensaje;

  if (!error.response) {
    mensaje =
      error.code === "ECONNABORTED" || error.code === "ETIMEDOUT"
        ? "La solicitud tardó demasiado en responder. Intente de nuevo"
        : "No fue posible establecer conexión, compruebe su conexión a internet e intente de nuevo";
  } else if (estadoHttp === 401) {
    mensaje = "Su sesión caducó. Inicie sesión nuevamente";
  } else if (estadoHttp === 403) {
    mensaje =
      mensajeServidor || "No tiene autorización para modificar este artículo";
  } else if (estadoHttp === 404) {
    mensaje = mensajeServidor || "El artículo no existe o no está disponible";
  } else if (estadoHttp === 400 || estadoHttp === 422) {
    mensaje =
      Object.keys(erroresCampos).length > 0
        ? "Revise los datos señalados antes de guardar"
        : mensajeServidor ||
          `No fue posible ${accion}: revise los datos ingresados`;
  } else if (estadoHttp >= 500) {
    mensaje = `El servidor no pudo ${accion}. Intente de nuevo más tarde`;
  } else {
    mensaje = mensajeServidor || `No fue posible ${accion}`;
  }

  const errorEdicion = new Error(mensaje, { cause: error });
  errorEdicion.estadoHttp = estadoHttp;
  errorEdicion.erroresCampos = erroresCampos;
  return errorEdicion;
}

/**
 * Datos actuales del artículo para precargar el formulario.
 * GET /api/articulos/<id>/ → id, titulo, resumen, palabras_clave, id_conferencia,
 * conferencia, id_linea, linea, estado, autores, ...
 * 403 → el artículo no es del autor · 404 → no existe o está deshabilitado.
 */
export async function consultarArticuloParaEditar(token, idArticulo) {
  if (!token) throw new Error("Inicie sesión para modificar el artículo");
  if (!idArticulo) throw new Error("No se indicó el artículo a modificar");

  try {
    const respuesta = await axios.get(`${URL_ARTICULOS}${idArticulo}/`, {
      headers: cabecerasAutor(token),
    });

    if (!respuesta.data || typeof respuesta.data !== "object") {
      throw new Error("El servidor devolvió un detalle de artículo inválido");
    }

    return respuesta.data;
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    throw crearErrorEdicion(error, "consultar el artículo");
  }
}

/**
 * Plazo y líneas temáticas habilitadas de la conferencia del artículo.
 * GET /api/articulos/contexto/. Devuelve null si la conferencia no aparece
 * (por ejemplo, no está activa): en ese caso decide el servidor.
 */
export async function consultarConvocatoriaArticulo(token, idConferencia) {
  if (!token) throw new Error("Inicie sesión para consultar la convocatoria");

  let respuesta;

  try {
    respuesta = await axios.get(`${URL_ARTICULOS}contexto/`, {
      headers: cabecerasAutor(token),
    });
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    throw crearErrorEdicion(error, "consultar la convocatoria");
  }

  const convocatorias = respuesta.data?.convocatorias;
  if (!Array.isArray(convocatorias)) return null;

  const convocatoria = convocatorias.find(
    (item) => String(item.id) === String(idConferencia),
  );
  if (!convocatoria) return null;

  return {
    nombre: convocatoria.nombre,
    abierto: Boolean(convocatoria.postulaciones_abiertas),
    fechaLimite: convocatoria.fecha_limite_postulaciones ?? null,
    lineas: Array.isArray(convocatoria.lineas_tematicas)
      ? convocatoria.lineas_tematicas
      : [],
  };
}

/**
 * Actualiza los datos generales del artículo.
 * PATCH /api/articulos/<id>/ con { titulo, resumen, palabras_clave, id_linea }.
 * 400 → errores por campo · 401 sesión · 403/404 sin permiso o inexistente.
 */
export async function actualizarArticulo(token, idArticulo, datos) {
  if (!token) throw new Error("Inicie sesión para modificar el artículo");
  if (!idArticulo) throw new Error("No se indicó el artículo a modificar");

  try {
    const respuesta = await axios.patch(
      `${URL_ARTICULOS}${idArticulo}/`,
      datos,
      { headers: cabecerasAutor(token) },
    );
    return respuesta.data;
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    throw crearErrorEdicion(error, "actualizar el artículo");
  }
}

export async function obtenerCandidatosEvaluadores(token, idArticulo) {
  if (!token) {
    throw new Error("Inicie sesión para consultar candidatos");
  }

  if (!idArticulo) {
    throw new Error("No se indicó el artículo");
  }

  try {
    const respuesta = await axios.get(
      `${URL_ARTICULOS}${idArticulo}/evaluadores/candidatos/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!respuesta.data || typeof respuesta.data !== "object") {
      throw new Error("El servidor devolvió candidatos inválidos");
    }

    return {
      articulo: respuesta.data.articulo ?? null,
      evaluadoresRequeridos: respuesta.data.evaluadores_requeridos ?? 3,
      evaluadores: Array.isArray(respuesta.data.evaluadores)
        ? respuesta.data.evaluadores
        : [],
    };
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;

    const estado = error.response?.status;
    const detalle =
      error.response?.data?.detail || error.response?.data?.message;

    if (estado === 401) {
      throw new Error("Su sesión caducó. Inicie sesión nuevamente", {
        cause: error,
      });
    }

    if (estado === 403) {
      throw new Error(
        detalle || "Solo los miembros del comité pueden consultar candidatos",
        { cause: error },
      );
    }

    if (estado === 404) {
      throw new Error(detalle || "El artículo no existe o no está disponible", {
        cause: error,
      });
    }

    throw new Error(detalle || "No fue posible consultar los candidatos", {
      cause: error,
    });
  }
}

export async function asignarEvaluadores(token, idArticulo, idsEvaluadores) {
  if (!token) {
    throw new Error("Inicie sesión para asignar evaluadores");
  }

  if (!idArticulo) {
    throw new Error("No se indicó el artículo");
  }

  try {
    const respuesta = await axios.post(
      `${URL_ARTICULOS}${idArticulo}/evaluadores/`,
      {
        evaluadores: idsEvaluadores,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return respuesta.data;
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;

    const datos = error.response?.data;
    const estado = error.response?.status;

    let mensaje =
      datos?.detail ||
      datos?.message ||
      "No fue posible asignar los evaluadores";

    if (datos?.plazo) {
      mensaje = Array.isArray(datos.plazo) ? datos.plazo[0] : datos.plazo;
    }

    if (datos?.evaluadores) {
      mensaje = Array.isArray(datos.evaluadores)
        ? datos.evaluadores[0]
        : datos.evaluadores;
    }

    if (estado === 401) {
      mensaje = "Su sesión caducó. Inicie sesión nuevamente";
    }

    if (estado === 403) {
      mensaje = datos?.detail || "No tiene permiso para asignar evaluadores";
    }

    if (estado === 404) {
      mensaje = datos?.detail || "El artículo no existe o no está disponible";
    }

    throw new Error(mensaje, { cause: error });
  }
}
export async function obtenerEvaluadoresAsignados(token, idArticulo) {
  if (!token) {
    throw new Error("Inicie sesión para consultar evaluadores");
  }

  if (!idArticulo) {
    throw new Error("No se indicó el artículo");
  }

  try {
    const respuesta = await axios.get(
      `${URL_ARTICULOS}${idArticulo}/evaluadores/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return {
      articulo: respuesta.data.articulo ?? null,
      evaluadoresRequeridos: respuesta.data.evaluadores_requeridos ?? 3,
      total: respuesta.data.total ?? 0,
      evaluadores: Array.isArray(respuesta.data.evaluadores)
        ? respuesta.data.evaluadores
        : [],
    };
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;

    const estado = error.response?.status;
    const detalle =
      error.response?.data?.detail || error.response?.data?.message;

    if (estado === 401) {
      throw new Error("Su sesión caducó. Inicie sesión nuevamente", {
        cause: error,
      });
    }

    if (estado === 403) {
      throw new Error(
        detalle ||
          "Solo el administrador y el comité pueden consultar evaluadores",
        { cause: error },
      );
    }

    if (estado === 404) {
      throw new Error(detalle || "El artículo no existe o no está disponible", {
        cause: error,
      });
    }

    throw new Error(detalle || "No fue posible consultar los evaluadores", {
      cause: error,
    });
  }
}
