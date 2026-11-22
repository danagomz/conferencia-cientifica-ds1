
import { useState } from "react";
import { ContextoAutenticacion } from "./contextoAutenticacion";
import { iniciarSesion as solicitarInicioSesion } from "./solicitudes";
import { normalizarRoles } from "./roles";
import {
  borrarSesion,
  guardarSesion,
  leerSesion,
} from "./sesion";

export function ProveedorAutenticacion({ children }) {
  const [sesion, establecerSesion] = useState(leerSesion);

  function actualizar(nueva) {
    if (nueva) guardarSesion(nueva);
    else borrarSesion();

    establecerSesion(nueva);
  }

  // Si la cuenta tiene un solo rol, queda activo de una vez;
  // si tiene varios, queda sin rol activo hasta que el usuario elija.
  async function iniciarSesion(credenciales) {
    const datos = await solicitarInicioSesion(credenciales);
    const roles = normalizarRoles(datos.roles);

    if (roles.length === 0) {
      throw new Error(
        "Tu cuenta no tiene un rol asignado. Contacta al administrador.",
      );
    }

    const nueva = {
      tokenAcceso: datos.tokenAcceso,
      tokenRenovacion: datos.tokenRenovacion,
      usuario: datos.usuario,
      roles,
      rolActivo: roles.length === 1 ? roles[0] : null,
    };

    actualizar(nueva);
    return nueva;
  }

  // Solo se puede elegir un rol que pertenezca a la cuenta.
  function seleccionarRol(rol) {
    if (!sesion || !sesion.roles.includes(rol)) {
      throw new Error("Ese rol no está asociado a tu cuenta.");
    }

    const nueva = {
      ...sesion,
      rolActivo: rol,
    };

    actualizar(nueva);
    return nueva;
  }

  // Actualiza exclusivamente los datos personales de la sesión.
  // No permite modificar el ID, los roles ni el rol activo.
  function actualizarDatosUsuario(datosUsuario) {
    if (!sesion) return null;

    const usuarioActualizado = {
      ...sesion.usuario,
    };

    if (typeof datosUsuario?.nombre === "string") {
      usuarioActualizado.nombre = datosUsuario.nombre;
    }

    if (typeof datosUsuario?.correo === "string") {
      usuarioActualizado.correo = datosUsuario.correo;
    }

    const nueva = {
      ...sesion,
      usuario: usuarioActualizado,
    };

    actualizar(nueva);
    return nueva;
  }

  function cerrarSesion() {
    actualizar(null);
  }

  return (
    <ContextoAutenticacion.Provider
      value={{
        sesion,
        iniciarSesion,
        seleccionarRol,
        cerrarSesion,
        actualizarDatosUsuario,
      }}
    >
      {children}
    </ContextoAutenticacion.Provider>
  );
}
