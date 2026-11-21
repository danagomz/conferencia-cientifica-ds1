// Validaciones del formulario de modificación de artículo (HU-012, SDGC-176).
// Los mensajes siguen los del formulario de registro de artículos.

export const LONGITUD_MAXIMA_TITULO = 255;

/**
 * Valida los valores del formulario y devuelve un objeto { campo: mensaje }.
 * Si no hay errores devuelve un objeto vacío.
 * `idsLineasValidos` son los ids (texto) de las líneas que se pueden elegir.
 */
export function validarDatosArticulo(valores, idsLineasValidos = []) {
  const errores = {};

  const titulo = valores.titulo ?? "";
  if (titulo === "") {
    errores.titulo = "El título del artículo es obligatorio.";
  } else if (titulo.trim() === "") {
    errores.titulo = "El título no puede contener solo espacios.";
  } else if (titulo.trim().length > LONGITUD_MAXIMA_TITULO) {
    errores.titulo = `El título no puede superar los ${LONGITUD_MAXIMA_TITULO} caracteres.`;
  }

  const resumen = valores.resumen ?? "";
  if (resumen === "") {
    errores.resumen = "El resumen del artículo es obligatorio.";
  } else if (resumen.trim() === "") {
    errores.resumen = "El resumen no puede contener solo espacios.";
  }

  const palabrasClave = valores.palabrasClave ?? "";
  const hayPalabraClave = palabrasClave
    .split(",")
    .some((palabra) => palabra.trim() !== "");
  if (!hayPalabraClave) {
    errores.palabrasClave = "Ingresa al menos una palabra clave.";
  }

  const idLinea = String(valores.idLinea ?? "");
  if (idLinea === "" || !idsLineasValidos.includes(idLinea)) {
    errores.idLinea = "Selecciona una línea temática habilitada.";
  }

  return errores;
}

/** Indica si los valores del formulario difieren de los datos guardados. */
export function hayCambios(articulo, valores) {
  return (
    (articulo.titulo ?? "").trim() !== valores.titulo.trim() ||
    (articulo.resumen ?? "").trim() !== valores.resumen.trim() ||
    (articulo.palabras_clave ?? "").trim() !== valores.palabrasClave.trim() ||
    String(articulo.id_linea ?? "") !== String(valores.idLinea)
  );
}