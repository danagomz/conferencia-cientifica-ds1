import axios from "axios";

const URL_API = import.meta.env.VITE_API_URL ?? "/api";
const URL_ARTICULOS = `${URL_API}/articulos/`;

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

export async function listarArticulos(token) {
  if (!token) {
    throw new Error("Inicie sesión para consultar artículos");
  }

  let respuesta;

  try {
    respuesta = await axios.get(URL_ARTICULOS, {
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
