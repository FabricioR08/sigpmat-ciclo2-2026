# SIGPMAT – Backend (Node.js + Express + PostgreSQL)

API REST organizada en 3 capas:

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Presentación | `src/routes`, `src/middleware` | Endpoints HTTP, validación del token JWT y de roles |
| Lógica de negocio | `src/services` | Reglas: conflictos de horario, máximo 48 h semanales, ausencias, login |
| Acceso a datos | `src/repositories` | Consultas SQL con `pg` |

## Puesta en marcha

1. Crear la BD `sigpmat` en PostgreSQL y ejecutar `database/schema.sql` y `database/seed.sql`.
2. Copiar `.env.example` a `.env` y completar `DB_PASSWORD` y `JWT_SECRET`.
3. Instalar dependencias y asignar contraseñas de prueba:

```bash
npm install
npm run seed:passwords   # contraseña de prueba para todos los usuarios: Sigpmat2026!
npm run dev              # API en http://localhost:3000
npm test                 # pruebas unitarias (Jest)
```

## Endpoints implementados

Las rutas se cargan solas: cada archivo `nombre.routes.js` de `src/routes` queda disponible en `/api/nombre`.

| Método | Ruta | Requisito | Acceso |
|---|---|---|---|
| GET | `/api/salud` | – | público |
| POST | `/api/auth/login` | RF-01 | público |
| GET | `/api/catalogos` | Listas para formularios | autenticado |
| GET | `/api/empleados?nombre=&tipo=&estado=&departamento=&especialidad=&pagina=` | RF-04 | autenticado |
| GET | `/api/empleados/:id` | RF-04 | autenticado |
| POST | `/api/empleados` | RF-03 | administrador, jefe de área |
| PUT | `/api/empleados/:id` | RF-03 | administrador, jefe de área |
| DELETE | `/api/empleados/:id` | RF-03 | administrador |
| GET | `/api/asignaciones?id_turno=&id_empleado=&estado=&desde=&hasta=` | RF-09 | administrador, jefe de área |
| GET | `/api/asignaciones/mias` | Consulta de horario | autenticado |
| POST | `/api/asignaciones` | RF-06, RF-07 | administrador, jefe de área |
| PATCH | `/api/asignaciones/:id/confirmar` | RF-06 | administrador, jefe de área |
| PATCH | `/api/asignaciones/:id/cancelar` | RF-06 | administrador, jefe de área |

## Reglas de negocio validadas al asignar un turno

Turno abierto y con cupos · empleado activo · especialidad requerida · sin ausencia aprobada ·
sin traslape de horario (incluye turnos nocturnos que cruzan la medianoche) · máximo 48 h por semana.

## Pendiente (siguientes avances)

Asignación automática (ordenar candidatos por menor carga), solicitudes de cambio de turno,
aprobación de permisos, reportes PDF/Excel, notificaciones por correo, CRUD de departamentos y roles.
