# Frontend

Interfaz de la Conferencia Científica hecha con React y Vite.

## Estructura

- `src/App.jsx`: rutas principales y acceso según sesión y rol.
- `src/autenticacion/`: solicitudes a la API, inicio de sesión, sesión local y roles.
- `src/components/`: formulario, marca y CAPTCHA.
- `src/pages/`: registro de autor, selector de rol y panel de inicio.
- `src/index.css`: estilos y colores compartidos.

La ruta `/registro-autor` envía nombre, apellido, correo electrónico, contraseña e institución a `POST /api/auth/registro-autor/`. El formulario también pide confirmar la contraseña y comprueba que coincida antes de enviar; el campo de confirmación no se envía al servidor. El servidor valida los datos, comprueba que el correo sea único, guarda la contraseña con el hash de Django y asigna exclusivamente el rol `AUTOR`. El formulario informa el éxito del registro y muestra errores generales o junto a sus campos, incluidos los mensajes devueltos por el servidor.

En `/login`, el enlace «¿Olvidaste tu contraseña?» solicita un PIN de seis dígitos al correo registrado. El PIN vence a los 10 minutos y permite cambiar la contraseña una sola vez; el servidor limita los intentos y la frecuencia de solicitudes.

En el panel del rol Autor, «Registrar un artículo» abre el formulario de la historia HU-008. El backend guarda el artículo, la línea temática, el autor responsable y los demás autores (sin exigirles una cuenta), asocia la propuesta con la cuenta del autor que la envía y rechaza convocatorias cerradas. Para habilitar postulaciones, un administrador debe crear una convocatoria activa con fecha límite y al menos una línea temática en Django Admin (`/admin/`).

## Desarrollo

Desde esta carpeta:

```sh
npm install
npm run dev
```

`npm run build` genera la versión de producción y `npm run lint` revisa el código.

El frontend usa `fetch` para el inicio de sesión y el registro. Ambas operaciones requieren el backend. `VITE_API_URL` cambia la dirección base de la API; por defecto es `/api`, que Vite reenvía a Django en `http://127.0.0.1:8000`.

El backend imprime los correos en la consola durante el desarrollo. Para enviar PIN por SMTP, configura `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` y `DEFAULT_FROM_EMAIL` en el entorno del backend.

## Nota sobre CAPTCHA

El CAPTCHA actual solo simula la verificación en pantalla y entrega un token de prueba. No protege contra bots; debe integrarse un proveedor real y validarse su token en el servidor antes de producción.
