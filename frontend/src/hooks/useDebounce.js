import { useEffect, useState } from "react";

export function useDebounce(valor, retraso = 400) {
  const [valorAplicado, establecerValorAplicado] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      establecerValorAplicado(valor);
    }, retraso);

    return () => {
      clearTimeout(temporizador);
    };
  }, [valor, retraso]);

  return valorAplicado;
}
