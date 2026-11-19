# SIGPMAT – Guía de la API para el frontend

URL base en desarrollo: `http://localhost:3000/api`

## Configuración necesaria en el frontend (Vite)

El backend no habilita CORS, así que el navegador bloqueará las llamadas directas desde `http://localhost:5173`. La solución es un proxy de Vite. En `vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
```

Con eso, el frontend llama a rutas relativas: `fetch('/api/empleados')`.

## Autenticación

1. `POST /api/auth/login` devuelve un token.
2. En el resto de las peticiones se envía el encabezado `Authorization: Bearer <token>`.
3. El token dura 8 horas. Si vence, la API responde 401 y hay que volver a iniciar sesión.

Roles (texto exacto que devuelve la API): `administrador`, `jefe de área`, `personal médico`.

## Formatos de error

El frontend debe manejar estas tres formas:

| Forma | Cuándo | Ejemplo |
|---|---|---|
| `{ "error": "texto" }` | Sesión, permisos, JSON inválido | `{ "error": "Token requerido." }` |
| `{ "errores": ["texto", ...] }` | Validación de formularios y recursos inexistentes | `{ "errores": ["El DUI debe tener el formato 00000000-0."] }` |
| `{ "error": "Asignación rechazada.", "motivos": [{ "codigo", "mensaje" }] }` | Reglas de asignación de turnos | Ver más abajo |

Códigos de estado: 200 y 201 correcto, 400 datos inválidos, 401 sin sesión, 403 sin permiso, 404 no existe, 409 conflicto con reglas o datos existentes, 423 cuenta bloqueada.

Formatos de datos: las fechas llegan como `"2026-11-02"`, las horas como `"06:00:00"`, `horas_programadas` como texto (`"8.00"`) y `fecha_asignacion` en formato ISO.

---

## Inicio de sesión

### `POST /auth/login` (público)

Cuerpo:
```json
{ "usuario": "admin", "clave": "Sigpmat2026!" }
```
Respuesta 200:
```json
{ "token": "eyJ...", "usuario": { "id": 1, "usuario": "admin", "rol": "administrador" } }
```
Errores: 400 faltan datos, 401 credenciales inválidas, 403 cuenta inactiva, 423 bloqueada por 5 intentos fallidos (15 minutos).

Usuarios de prueba (contraseña `Sigpmat2026!` después de `npm run seed:passwords`): `admin`, `jefe.urg`, `dr.martinez`, `dra.lopez`, `enf.garcia`.

---

## Catálogos

### `GET /catalogos` (autenticado)

Sirve para llenar los selectores de los formularios.
```json
{
  "departamentos": [{ "id_departamento": 1, "nombre": "Urgencias", "tipo_area": "emergencia" }],
  "especialidades": [{ "id_especialidad": 1, "nombre": "Medicina de Emergencias" }],
  "tipos_empleado": ["médico", "enfermero", "especialista", "administrativo"],
  "estados_laborales": ["activo", "suspendido", "inactivo"]
}
```

---

## Empleados

### `GET /empleados` (autenticado)

Parámetros opcionales: `nombre` (busca en nombres y apellidos), `tipo`, `estado`, `departamento` (id), `especialidad` (id) y `pagina` (20 por página).

Respuesta 200:
```json
{
  "pagina": 1, "porPagina": 20, "total": 6,
  "empleados": [{
    "id_empleado": 3, "codigo_empleado": "EMP-003", "nombres": "Luis Alberto", "apellidos": "Martínez Díaz",
    "dui": "03456789-0", "telefono": "7000-0003", "correo": "martinez@hospital.test",
    "tipo_empleado": "médico", "estado_laboral": "activo", "fecha_ingreso": "2019-09-15",
    "departamento": "Urgencias", "especialidad_principal": "Medicina de Emergencias"
  }]
}
```

### `GET /empleados/:id` (autenticado)

Devuelve el empleado con sus especialidades y su departamento actual:
```json
{
  "id_empleado": 3, "codigo_empleado": "EMP-003", "nombres": "Luis Alberto", "...": "...",
  "especialidades": [{ "id_especialidad": 1, "nombre": "Medicina de Emergencias", "principal": true }],
  "departamento": { "id_departamento": 1, "nombre": "Urgencias", "rol_area": "Médico de turno", "fecha_inicio": "2019-09-15" }
}
```
Errores: 400 identificador inválido, 404 no existe.

### `POST /empleados` (administrador, jefe de área)

Obligatorios: `codigo_empleado`, `nombres`, `apellidos`, `tipo_empleado`, `fecha_ingreso` (`AAAA-MM-DD`). Opcionales: `dui` (`00000000-0`), `telefono`, `correo`, `estado_laboral` (por defecto `activo`), `especialidades` (lista de ids; la primera es la principal) e `id_departamento`.

```json
{
  "codigo_empleado": "EMP-050", "nombres": "Rosa", "apellidos": "Mena", "dui": "07890123-4",
  "tipo_empleado": "médico", "fecha_ingreso": "2026-10-28",
  "especialidades": [3, 1], "id_departamento": 3
}
```
Respuesta 201: el empleado con el mismo formato de `GET /empleados/:id`.
Errores: 400 validación (`errores`), 409 código, DUI o correo ya existentes.

### `PUT /empleados/:id` (administrador, jefe de área)

Solo se actualizan los campos enviados. Acepta los mismos campos que `POST`. Si se envía `especialidades`, reemplaza la lista completa; si se envía `id_departamento`, cierra el departamento anterior y asigna el nuevo (`null` lo quita).

```json
{ "telefono": "7111-2222", "estado_laboral": "inactivo" }
```
Respuesta 200: el empleado actualizado. Errores: 400, 404, 409.

### `DELETE /empleados/:id` (solo administrador)

Respuesta 200: `{ "mensaje": "Empleado eliminado." }`.

Si el empleado tiene turnos, permisos o solicitudes asociados, responde 409 y no lo elimina. En ese caso la pantalla debe ofrecer cambiar su `estado_laboral` a `inactivo` con `PUT`.

---

## Asignaciones de turnos

### `POST /asignaciones` (administrador, jefe de área)

```json
{ "id_turno": 4, "id_empleado": 6 }
```
Respuesta 201:
```json
{ "id_asignacion": 5, "id_turno": 4, "id_empleado": 6, "estado_asignacion": "programado",
  "horas_programadas": "8.00", "origen_asignacion": "manual", "fecha_asignacion": "2026-11-18T02:23:43.769Z" }
```
Respuesta 409 cuando se incumple alguna regla (puede traer varios motivos a la vez):
```json
{
  "error": "Asignación rechazada.",
  "motivos": [{ "codigo": "CONFLICTO_HORARIO", "mensaje": "Se traslapa con otro turno el 2026-11-02 (06:00-14:00)." }]
}
```
Códigos de motivo: `TURNO_NO_ABIERTO`, `SIN_CUPOS`, `EMPLEADO_NO_ACTIVO`, `SIN_ESPECIALIDAD`, `AUSENCIA_APROBADA`, `CONFLICTO_HORARIO`, `EXCEDE_48H`. Con 404 llegan `TURNO_NO_EXISTE` o `EMPLEADO_NO_EXISTE`.

La pantalla debe mostrar todos los `mensaje` recibidos.

### `GET /asignaciones` (administrador, jefe de área)

Parámetros opcionales: `id_turno`, `id_empleado`, `estado` (`programado`, `confirmado`, `cancelado`, `cambiado`), `desde` y `hasta` (`AAAA-MM-DD`).

```json
[{
  "id_asignacion": 1, "estado_asignacion": "confirmado", "horas_programadas": "8.00",
  "origen_asignacion": "automática", "fecha_asignacion": "2026-11-18T02:21:46.573Z",
  "id_turno": 1, "nombre_turno": "Urgencias diurno", "tipo_turno": "diurno",
  "fecha_turno": "2026-11-02", "hora_inicio": "06:00:00", "hora_fin": "14:00:00",
  "departamento": "Urgencias", "id_empleado": 3, "empleado": "Luis Alberto Martínez Díaz"
}]
```

### `GET /asignaciones/mias` (cualquier rol)

Lista las asignaciones del empleado vinculado al usuario que inició sesión, con el mismo formato y los mismos filtros. Devuelve 404 si el usuario no está vinculado a un empleado.

### `PATCH /asignaciones/:id/confirmar` y `PATCH /asignaciones/:id/cancelar` (administrador, jefe de área)

Sin cuerpo. Devuelven la asignación actualizada (mismo formato que el listado). `confirmar` solo aplica a asignaciones `programado`, y `cancelar` a `programado` o `confirmado`. Si el estado no lo permite, responde 409 con `errores`.

Al llenar los cupos de un turno, su estado pasa solo a `cubierto`, y vuelve a `abierto` si se cancela una asignación.