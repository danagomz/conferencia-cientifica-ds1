# Frontend

Interfaz de la Conferencia Científica hecha con React y Vite.

## Estructura

- `src/App.jsx`: rutas principales y acceso según sesión y rol.
- `src/autenticacion/`: solicitudes a la API, inicio de sesión, sesión local y roles.
- `src/components/`: formulario, marca y CAPTCHA.
- `src/pages/`: registro de autor, selector de rol y panel de inicio.
- `src/index.css`: estilos y colores compartidos.

La ruta `/registro-autor` envía nombre, apellido, correo electrónico, contraseña e institución a `POST /api/auth/registro-autor/`. El formulario también pide confirmar la contraseña y comprueba que coincida antes de enviar; el campo de confirmación no se envía al servidor. El servidor valida los datos, comprueba que el correo sea único, guarda la contraseña con el hash de Django y asigna exclusivamente el rol `AUTOR`. El formulario informa el éxito del registro y muestra errores generales o junto a sus campos, incluidos los mensajes devueltos por el servidor.

## Desarrollo

Desde esta carpeta:

```sh
npm install
npm run dev
```

`npm run build` genera la versión de producción y `npm run lint` revisa el código.

El frontend usa `fetch` para el inicio de sesión y el registro. Ambas operaciones requieren el backend. `VITE_API_URL` cambia la dirección base de la API; por defecto es `/api`, que Vite reenvía a Django en `http://127.0.0.1:8000`.

## Nota sobre CAPTCHA

El CAPTCHA actual solo simula la verificación en pantalla y entrega un token de prueba. No protege contra bots; debe integrarse un proveedor real y validarse su token en el servidor antes de producción.
