# Frontend

Interfaz de la Conferencia Científica hecha con React y Vite.

## Estructura

- `src/App.jsx`: rutas principales y acceso según sesión y rol.
- `src/auth/`: inicio de sesión, sesión local y roles.
- `src/components/`: formulario, marca y CAPTCHA.
- `src/pages/`: registro de autor, selector de rol y panel de inicio.
- `src/index.css`: estilos y colores compartidos.

La ruta `/registro-autor` contiene el formulario de interfaz. El backend actual no ofrece auto-registro público: `POST /api/usuarios/` está restringido a ADMIN o COMITE. El alta pública requiere un endpoint que valide unicidad y asigne `AUTOR` en el servidor; el formulario no simula que la cuenta se haya creado.

## Desarrollo

Desde esta carpeta:

```sh
npm install
npm run dev
```

`npm run build` genera la versión de producción y `npm run lint` revisa el código.

El frontend usa `fetch` para el login. `VITE_API_URL` cambia la dirección base de la API; por defecto es `/api`, que Vite reenvía a Django en `http://127.0.0.1:8000`.

Para probar la interfaz sin servidor, configura `VITE_USE_MOCK=true` en `.env.local`. Las cuentas de demostración usan la contraseña `Demo#12345`.

## Nota sobre CAPTCHA

El CAPTCHA actual solo simula la verificación en pantalla y entrega un token de prueba. No protege contra bots; debe integrarse un proveedor real y validarse su token en el servidor antes de producción.
