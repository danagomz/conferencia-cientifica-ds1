import axios from "axios";

const URL_API = import.meta.env.VITE_API_URL ?? "/api";
const URL_ARTICULOS = `${URL_API}/articulos/`;
const URL_FILTROS = `${URL_ARTICULOS}filtros/`;

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
