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

| Método | Ruta | Requisito | Acceso |
|---|---|---|---|
| GET | `/api/salud` | – | público |
| POST | `/api/auth/login` | RF-01 | público |
| GET | `/api/empleados?nombre=&tipo=&estado=&pagina=` | RF-04 | autenticado |
| POST | `/api/empleados` | RF-03 | administrador, jefe de área |
| POST | `/api/asignaciones` | RF-06, RF-07 | administrador, jefe de área |

## Reglas de negocio validadas al asignar un turno

Turno abierto y con cupos · empleado activo · especialidad requerida · sin ausencia aprobada ·
sin traslape de horario (incluye turnos nocturnos que cruzan la medianoche) · máximo 48 h por semana.

## Pendiente (siguientes avances)

Asignación automática (ordenar candidatos por menor carga), solicitudes de cambio de turno,
aprobación de permisos, reportes PDF/Excel, notificaciones por correo, CRUD de departamentos y roles.
