import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { ProveedorAutenticacion } from "./autenticacion/ProveedorAutenticacion";
import { useAutenticacion } from "./autenticacion/useAutenticacion";
import {
  ROLES_DISPONIBLES,
  RUTA_ELEGIR_ROL,
  rutaInicial,
} from "./autenticacion/roles";
import { FormularioInicioSesion } from "./components/FormularioInicioSesion";
import { RegistroAutor } from "./pages/RegistroAutor";
import { InicioRol } from "./pages/InicioRol";
import { RegistroArticulo } from "./pages/RegistroArticulo";
import { ConfiguracionConferencia } from "./pages/ConfiguracionConferencia";
import { CrearUsuario } from "./pages/CrearUsuario";
import { SelectorRol } from "./pages/SelectorRol";
import ListadoArticulos from "./pages/articulos/ListadoArticulos";
import { VersionesArticulo } from "./pages/articulos/VersionesArticulo";
import { ListadoUsuarios } from "./pages/usuarios/ListadoUsuarios";

const EditarUsuario = lazy(() =>
  import("./pages/EditarUsuario").then(({ EditarUsuario: pagina }) => ({
    default: pagina,
  })),
);

function PaginaInicioSesion() {
  const { sesion, iniciarSesion } = useAutenticacion();
  if (sesion) return <Navigate to={rutaInicial(sesion)} replace />;
  return <FormularioInicioSesion alEnviar={iniciarSesion} />;
}

function RequiereSesion() {
  const { sesion } = useAutenticacion();
  return sesion ? <Outlet /> : <Navigate to="/login" replace />;
}

function PaginaSeleccionRol() {
  const { sesion } = useAutenticacion();
  return sesion.roles.length > 1 ? (
    <SelectorRol />
  ) : (
    <Navigate to={rutaInicial(sesion)} replace />
  );
}

function PaginaSoloRol({ rol }) {
  const { sesion } = useAutenticacion();
  if (!sesion.rolActivo) return <Navigate to={RUTA_ELEGIR_ROL} replace />;
  if (sesion.rolActivo !== rol)
    return <Navigate to={rutaInicial(sesion)} replace />;
  return <InicioRol rol={rol} />;
}

function PaginaArticulos() {
  const { sesion } = useAutenticacion();
  if (!sesion.rolActivo) return <Navigate to={RUTA_ELEGIR_ROL} replace />;
  if (!["ADMIN", "COMITE"].includes(sesion.rolActivo)) {
    return <Navigate to={rutaInicial(sesion)} replace />;
  }
  return <ListadoArticulos />;
}

function PaginaMisArticulos() {
  const { sesion } = useAutenticacion();
  if (!sesion.rolActivo) return <Navigate to={RUTA_ELEGIR_ROL} replace />;
  if (sesion.rolActivo !== "AUTOR")
    return <Navigate to={rutaInicial(sesion)} replace />;
  return <ListadoArticulos modo="propios" />;
}

function PaginaVersionesArticulo() {
  const { sesion } = useAutenticacion();
  if (!sesion.rolActivo) return <Navigate to={RUTA_ELEGIR_ROL} replace />;
  if (sesion.rolActivo !== "AUTOR")
    return <Navigate to={rutaInicial(sesion)} replace />;
  return <VersionesArticulo />;
}

function PaginaRegistroArticulo() {
  const { sesion } = useAutenticacion();
  if (!sesion.rolActivo) return <Navigate to={RUTA_ELEGIR_ROL} replace />;
  if (sesion.rolActivo !== "AUTOR")
    return <Navigate to={rutaInicial(sesion)} replace />;
  return <RegistroArticulo />;
}

function PaginaConfiguracionConferencia() {
  const { sesion } = useAutenticacion();
  if (!sesion.rolActivo) return <Navigate to={RUTA_ELEGIR_ROL} replace />;
  if (!["ADMIN", "COMITE"].includes(sesion.rolActivo)) {
    return <Navigate to={rutaInicial(sesion)} replace />;
  }
  return <ConfiguracionConferencia />;
}

function PaginaCrearUsuario() {
  const { sesion } = useAutenticacion();
  if (!sesion.rolActivo) return <Navigate to={RUTA_ELEGIR_ROL} replace />;
  if (!["ADMIN", "COMITE"].includes(sesion.rolActivo)) {
    return <Navigate to={rutaInicial(sesion)} replace />;
  }
  return <CrearUsuario />;
}

// Cualquier usuario autenticado puede editar sus propios datos.
function PaginaEditarPerfil() {
  return <EditarUsuario />;
}

// La edición de otras cuentas requiere ADMIN o COMITE.
function PaginaEditarOtroUsuario() {
  const { sesion } = useAutenticacion();

  if (!sesion.rolActivo) {
    return <Navigate to={RUTA_ELEGIR_ROL} replace />;
  }

  if (!["ADMIN", "COMITE"].includes(sesion.rolActivo)) {
    return <Navigate to={rutaInicial(sesion)} replace />;
  }

  return <EditarUsuario />;
}

function PaginaUsuarios() {
  const { sesion } = useAutenticacion();

  if (!sesion.rolActivo) return <Navigate to={RUTA_ELEGIR_ROL} replace />;

  if (!["ADMIN", "COMITE"].includes(sesion.rolActivo)) {
    return <Navigate to={rutaInicial(sesion)} replace />;
  }

  return <ListadoUsuarios />;
}

function RedireccionInicial() {
  const { sesion } = useAutenticacion();
  return <Navigate to={sesion ? rutaInicial(sesion) : "/login"} replace />;
}

function Aplicacion() {
  return (
    <ProveedorAutenticacion>
      <Suspense
        fallback={
          <div role="status" aria-live="polite" className="p-8 text-center">
            Cargando pantalla...
          </div>
        }
      >
        <Routes>
          <Route path="/login" element={<PaginaInicioSesion />} />
          <Route path="/registro-autor" element={<RegistroAutor />} />

          <Route element={<RequiereSesion />}>
            <Route path={RUTA_ELEGIR_ROL} element={<PaginaSeleccionRol />} />
            <Route
              path="/autor/articulos/nuevo"
              element={<PaginaRegistroArticulo />}
            />
            <Route
              path="/configuracion-conferencia"
              element={<PaginaConfiguracionConferencia />}
            />
            <Route
              path="/perfil/editar"
              element={<PaginaEditarPerfil />}
            />
            <Route
              path="/gestion/usuarios/:id/editar"
              element={<PaginaEditarOtroUsuario />}
            />
            <Route
              path="/gestion/usuarios/nuevo"
              element={<PaginaCrearUsuario />}
            />
            <Route path="/gestion/usuarios" element={<PaginaUsuarios />} />
            <Route path="/gestion/articulos" element={<PaginaArticulos />} />
            <Route path="/autor/articulos" element={<PaginaMisArticulos />} />
            <Route
              path="/autor/articulos/:id/versiones"
              element={<PaginaVersionesArticulo />}
            />
            {Object.entries(ROLES_DISPONIBLES).map(([rol, informacion]) => (
              <Route
                key={rol}
                path={informacion.rutaInicio}
                element={<PaginaSoloRol rol={rol} />}
              />
            ))}
          </Route>

          <Route path="*" element={<RedireccionInicial />} />
        </Routes>
      </Suspense>
    </ProveedorAutenticacion>
  );
}

export default Aplicacion;
