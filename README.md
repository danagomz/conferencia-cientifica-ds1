# Sistema de Gestión de Conferencias Científicas

Aplicación web para gestionar el ciclo de una conferencia científica: convocatoria, postulación de artículos, asignación de evaluadores, evaluación y decisión del comité. Proyecto del curso **Desarrollo de Software I** (Grupo 80), Escuela de Ingeniería de Sistemas y Computación, Universidad del Valle, Cali.

> Esta documentación corresponde a la rama `develop` (integración y entorno de pruebas).

## Tabla de contenido

1. [Estado del proyecto](#estado-del-proyecto)
2. [Equipo](#equipo)
3. [Tecnologías](#tecnologías)
4. [Arquitectura y despliegue](#arquitectura-y-despliegue)
5. [Estructura del repositorio](#estructura-del-repositorio)
6. [Requisitos previos](#requisitos-previos)
7. [Puesta en marcha local](#puesta-en-marcha-local)
8. [Variables de entorno](#variables-de-entorno)
9. [Pruebas](#pruebas)
10. [API REST](#api-rest)
11. [Roles de usuario](#roles-de-usuario)
12. [Flujo de trabajo del equipo](#flujo-de-trabajo-del-equipo)
13. [Documentación adicional](#documentación-adicional)

## Estado del proyecto

Funcionalidades implementadas en `develop` (historias de usuario de Jira):

| HU | Funcionalidad |
|---|---|
| HU-031 | Registro de autores |
| HU-001 | Inicio de sesión con selección de rol y verificación CAPTCHA (Cloudflare Turnstile) |
| HU-007 | Recuperación de contraseña con PIN de 6 dígitos enviado por correo (Brevo) |
| HU-030 | Configuración de la conferencia (fechas límite y líneas temáticas) |
| HU-008 | Registro de artículos |
| HU-014 | Carga del PDF del artículo (Supabase Storage) |
| HU-009, HU-010, HU-011 | Listado, filtros y detalle de artículos |
| HU-002, HU-003 | Listado, filtros y edición de usuarios |
| HU-012 | Modificación de artículos |
| HU-015 | Asignación de evaluadores a un artículo |

Pendiente (planificado en los siguientes sprints): evaluaciones y decisión del comité, versiones corregida y final con aval, y agenda de la conferencia.

## Equipo

| Integrante | Rol |
|---|---|
| Laura Valentina Bernal Lozada | Scrum Master |
| Samuel Vargas Valderruten | Product Owner |
| Howard Duvan Sánchez García | Desarrollo frontend |
| Hilary Herrera Erazo | Desarrollo frontend |
| Dana Sofía Gómez Manrique | Desarrollo backend |
| Leidy Vanessa Ruano Canacuan | Base de datos y apoyo en backend |

Docente: Beatriz Florián Gaviria. La metodología es Scrum y el seguimiento de tareas se hace en Jira.

## Tecnologías

**Backend**
- Python y Django 6.1 con Django REST Framework 3.18
- Autenticación JWT (`djangorestframework-simplejwt`)
- `django-filter`, `django-cors-headers`, `python-decouple`, `dj-database-url`
- PostgreSQL (Supabase) en producción y SQLite en local
- Supabase Storage para los PDF (bucket `articulos-pdf`)
- Cloudflare Turnstile (CAPTCHA) y Brevo (correo por API HTTPS)
- `gunicorn` y `psycopg2-binary` para el despliegue

**Frontend**
- React 19 y Vite 8
- Tailwind CSS 4 y DaisyUI 5
- `react-router-dom` 7, `axios`, `react-hook-form`, `@marsidev/react-turnstile`

## Arquitectura y despliegue

Arquitectura en tres capas más una capa de comunicación:

- **Presentación:** frontend React + Vite.
- **Lógica de negocio:** backend Django REST Framework.
- **Persistencia:** PostgreSQL en Supabase y Supabase Storage para archivos.
- **Comunicación:** API REST sobre HTTP/HTTPS en formato JSON, con CORS configurado por entorno.

| Entorno | Frontend | Backend | Base de datos |
|---|---|---|---|
| Local | Vite (`localhost:5173`) | Django (`127.0.0.1:8000`) | SQLite |
| Pruebas | Vercel (rama `develop`) | Render (rama `develop`) | SQLite |
| Producción | Vercel (rama `main`) | Render (rama `main`) | PostgreSQL en Supabase |

- Vercel genera una vista previa por cada Pull Request.
- El frontend apunta al backend con la variable `VITE_API_URL`, distinta en cada entorno.
- `frontend/vercel.json` redirige todas las rutas a `index.html` (SPA).
- El plan gratuito de Render bloquea SMTP, por eso el correo se envía con la API de Brevo (HTTPS).

## Estructura del repositorio

```
.
├── backend/                  # API Django REST
│   ├── config/               # settings.py, urls.py
│   ├── usuarios/             # autenticación, registro, recuperación de contraseña, usuarios, roles
│   ├── conferencias/         # configuración de la conferencia, fechas límite, líneas temáticas
│   ├── articulos/            # artículos, PDF, filtros, evaluadores
│   ├── Crear_usuarios_prueba.py
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # aplicación React + Vite
│   ├── src/
│   ├── vercel.json
│   ├── package.json
│   └── .env.example
├── docs/                     # documentación técnica y diagramas
└── README.md
```

## Requisitos previos

- Python 3.12 o superior y `pip`
- Node.js 20 o superior y `npm`
- Git

## Puesta en marcha local

### 1. Clonar el repositorio

```bash
git clone https://github.com/danagomz/conferencia-cientifica-ds1.git
cd conferencia-cientifica-ds1
git checkout develop
```

### 2. Backend

```bash
cd backend
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env        # en Windows: copy .env.example .env
```

Edita `.env` (ver [Variables de entorno](#variables-de-entorno)). Para trabajar en local basta con definir `SECRET_KEY`, `DEBUG=True` y `ALLOWED_HOSTS=localhost,127.0.0.1`.

```bash
python manage.py migrate
python Crear_usuarios_prueba.py     # opcional: cuentas de prueba
python manage.py runserver
```

La API queda en `http://127.0.0.1:8000/api/`. Si `DATABASE_URL` está vacía, se usa `sqlite:///db.sqlite3`.

> Si `pip` falla al leer `requirements.txt` por su codificación (el archivo está guardado en UTF-16), conviértelo a UTF-8 en tu equipo y vuelve a instalar.

**Cuentas de prueba** (contraseña `Prueba#2026`):

| Correo | Rol |
|---|---|
| `admin@pruebas.co` | Administrador |
| `comite@pruebas.co` | Comité científico |
| `autor@pruebas.co` | Autor |
| `destino@pruebas.co` | Autor |

Son solo para desarrollo y pruebas. No las uses en producción.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

La aplicación queda en `http://localhost:5173`. En desarrollo, Vite reenvía `/api` a `http://127.0.0.1:8000`, así que no hace falta configurar CORS.

Scripts disponibles: `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`.

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción |
|---|---|
| `SECRET_KEY` | Clave secreta de Django |
| `DEBUG` | `True` en local, `False` en despliegue |
| `ALLOWED_HOSTS` | Hosts permitidos, separados por coma |
| `DATABASE_URL` | URL de la base de datos. Vacía = SQLite local. En producción, la URL de PostgreSQL (Supabase) |
| `CORS_ALLOWED_ORIGINS` | Orígenes del frontend autorizados, separados por coma |
| `TURNSTILE_SECRET_KEY` | Clave secreta de Cloudflare Turnstile (en pruebas se usan las claves de prueba de Cloudflare) |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SECRET_KEY` | Clave de servicio de Supabase |
| `SUPABASE_BUCKET` | Bucket de PDF (`articulos-pdf`) |
| `EMAIL_BACKEND` | Por defecto `django.core.mail.backends.console.EmailBackend` (el correo se imprime en consola) |
| `BREVO_API_KEY` | Clave de la API de Brevo para enviar el PIN de recuperación |
| `DEFAULT_FROM_EMAIL` | Remitente de los correos |
| `EMAIL_TIMEOUT` | Tiempo máximo de espera del envío, en segundos (por defecto `10`) |

Nunca subas el archivo `.env` al repositorio. Ya está excluido por `.gitignore`.

### Frontend (`frontend/.env`)

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API. Por defecto `/api` (proxy de Vite) |
| `VITE_TURNSTILE_SITE_KEY` | Clave pública de Turnstile. El valor `1x00000000000000000000AA` es la clave de prueba de Cloudflare |

## Pruebas

```bash
cd backend
python manage.py test
```

Se pueden ejecutar por aplicación (`python manage.py test usuarios`, `conferencias`, `articulos`). Las pruebas cubren registro, inicio de sesión, CAPTCHA, recuperación por PIN, permisos, gestión de usuarios, conferencias y artículos.

Frontend:

```bash
cd frontend
npm run lint
```

## API REST

Todas las rutas cuelgan de `/api/`. La autenticación usa JWT en el encabezado `Authorization: Bearer <token>`. El rol con el que actúa el usuario se envía en el encabezado `x-rol-activo`.

| Grupo | Ruta | Descripción |
|---|---|---|
| Salud | `health/` | Verificación de disponibilidad |
| Autenticación | `auth/login/` | Inicio de sesión |
| | `auth/registro-autor/` | Registro de autores |
| | `auth/recuperar-contrasena/` | Solicita el PIN por correo |
| | `auth/restablecer-contrasena/` | Valida el PIN y cambia la contraseña |
| | `auth/refresh/` | Renueva el token |
| | `auth/me/` | Datos del usuario autenticado |
| Usuarios | rutas de `usuarios/` | Listado, filtros, detalle y edición |
| Conferencias | rutas de `conferencias/` | Configuración, fechas límite y líneas temáticas |
| Artículos | `articulos/` | Registro y listado |
| | `articulos/contexto/` | Datos necesarios para el formulario |
| | `articulos/filtros/` | Opciones de filtrado |
| | `articulos/propios/` | Artículos del autor autenticado |
| | `articulos/<id>/` | Detalle (GET) y modificación (PATCH) |
| | endpoints de evaluadores | Candidatos y asignación de evaluadores |
| Administración | `/admin/` | Panel de administración de Django |

**Recuperación de contraseña:** el PIN tiene 6 dígitos, se guarda con hash, vence a los 10 minutos y permite hasta 5 intentos. La solicitud de PIN está limitada a 3 por hora y el restablecimiento a 10 por minuto.

## Roles de usuario

- **Autor:** se registra, postula y modifica sus artículos y consulta su estado.
- **Comité científico:** consulta artículos y participa en la evaluación.
- **Administrador:** gestiona usuarios, configura la conferencia y asigna evaluadores.

Un usuario puede tener varios roles y elige con cuál ingresar.

## Flujo de trabajo del equipo

- **Ramas:** `main` es la versión estable y de producción. `develop` integra el trabajo y alimenta el entorno de pruebas. Cada tarea se desarrolla en `feature/<CLAVE-JIRA>-<descripcion-corta>`, creada desde `develop`, por ejemplo `feature/SDGC-108-envio-pin-correo`.
- **Commits:** incluyen la clave de Jira de la subtarea (por ejemplo `SDGC-108`).
- **Pull Requests:** todo cambio entra a `develop` por Pull Request revisado por otro integrante. Cuando `develop` está probado, se integra a `main`.
- **Despliegue:** al fusionar, Vercel y Render despliegan automáticamente.
- **Seguimiento:** Scrum con cinco sprints. El proyecto cierra con la sustentación final del 22 de diciembre de 2026.

## Documentación adicional

- `frontend/README.md`: estructura del frontend y detalles de los módulos de registro y recuperación de contraseña.
- `docs/`: diagramas BPMN de los procesos de negocio y demás documentación técnica.
- Informe 2 del proyecto (24 de noviembre de 2026).
