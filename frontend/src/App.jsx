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
import { SelectorRol } from "./pages/SelectorRol";
import ListadoArticulos from "./pages/articulos/ListadoArticulos";

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

function RedireccionInicial() {
  const { sesion } = useAutenticacion();
  return <Navigate to={sesion ? rutaInicial(sesion) : "/login"} replace />;
}

function Aplicacion() {
  return (
    <ProveedorAutenticacion>
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
          <Route path="/gestion/articulos" element={<PaginaArticulos />} />
          <Route path="/autor/articulos" element={<PaginaMisArticulos />} />
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
    </ProveedorAutenticacion>
  );
}

export default Aplicacion;
