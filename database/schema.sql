-- script de esquema para PostgreSQL
-- basado en el diccionario de datos de la primera entrega.
-- para poder re-ejecutar el script desde cero
DROP TABLE IF EXISTS auditoria_sistema        CASCADE;
DROP TABLE IF EXISTS notificaciones           CASCADE;
DROP TABLE IF EXISTS incidencias_laborales    CASCADE;
DROP TABLE IF EXISTS solicitudes_cambio_turno CASCADE;
DROP TABLE IF EXISTS permisos_vacaciones      CASCADE;
DROP TABLE IF EXISTS asignaciones_turno       CASCADE;
DROP TABLE IF EXISTS turnos                   CASCADE;
DROP TABLE IF EXISTS disponibilidades         CASCADE;
DROP TABLE IF EXISTS departamento_empleado    CASCADE;
DROP TABLE IF EXISTS departamentos            CASCADE;
DROP TABLE IF EXISTS empleado_especialidad    CASCADE;
DROP TABLE IF EXISTS especialidades           CASCADE;
DROP TABLE IF EXISTS empleados                CASCADE;
DROP TABLE IF EXISTS usuarios                 CASCADE;
DROP TABLE IF EXISTS roles                    CASCADE;

-- 1 roles
CREATE TABLE roles (
    id_rol       SERIAL       PRIMARY KEY,
    nombre_rol   VARCHAR(40)  NOT NULL UNIQUE,
    descripcion  VARCHAR(150),
    estado       BOOLEAN      NOT NULL DEFAULT TRUE
);

-- 2. usuarios
CREATE TABLE usuarios (
    id_usuario     SERIAL       PRIMARY KEY,
    id_rol         INTEGER      NOT NULL REFERENCES roles(id_rol),
    usuario        VARCHAR(50)  NOT NULL UNIQUE,
    correo         VARCHAR(100) NOT NULL UNIQUE
                   CHECK (correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    clave_hash     VARCHAR(255) NOT NULL,
    estado         VARCHAR(15)  NOT NULL DEFAULT 'activo'
                   CHECK (estado IN ('activo', 'inactivo', 'bloqueado')),
    ultimo_acceso  TIMESTAMP
);

-- 3. empleados
CREATE TABLE empleados (
    id_empleado      SERIAL       PRIMARY KEY,
    id_usuario       INTEGER      UNIQUE REFERENCES usuarios(id_usuario),
    codigo_empleado  VARCHAR(20)  NOT NULL UNIQUE,
    nombres          VARCHAR(80)  NOT NULL,
    apellidos        VARCHAR(80)  NOT NULL,
    dui              VARCHAR(10)  UNIQUE
                     CHECK (dui ~ '^[0-9]{8}-[0-9]$'),
    telefono         VARCHAR(15),
    correo           VARCHAR(100)
                     CHECK (correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    tipo_empleado    VARCHAR(25)  NOT NULL
                     CHECK (tipo_empleado IN ('médico', 'enfermero', 'especialista', 'administrativo')),
    estado_laboral   VARCHAR(20)  NOT NULL DEFAULT 'activo'
                     CHECK (estado_laboral IN ('activo', 'suspendido', 'inactivo')),
    fecha_ingreso    DATE         NOT NULL
);

-- 4 especialidades
CREATE TABLE especialidades (
    id_especialidad  SERIAL       PRIMARY KEY,
    nombre           VARCHAR(80)  NOT NULL UNIQUE,
    descripcion      VARCHAR(200),
    estado           BOOLEAN      NOT NULL DEFAULT TRUE
);

-- 5. empleado_especialidad (relación N:M)
CREATE TABLE empleado_especialidad (
    id_empleado_especialidad  SERIAL   PRIMARY KEY,
    id_empleado               INTEGER  NOT NULL REFERENCES empleados(id_empleado),
    id_especialidad           INTEGER  NOT NULL REFERENCES especialidades(id_especialidad),
    principal                 BOOLEAN  NOT NULL DEFAULT FALSE,
    UNIQUE (id_empleado, id_especialidad)
);

-- 6. departamentos
CREATE TABLE departamentos (
    id_departamento        SERIAL       PRIMARY KEY,
    nombre                 VARCHAR(80)  NOT NULL UNIQUE,
    tipo_area              VARCHAR(50)  NOT NULL,
    ubicacion              VARCHAR(100),
    capacidad_minima_dia   INTEGER      NOT NULL CHECK (capacidad_minima_dia   >= 0),
    capacidad_minima_noche INTEGER      NOT NULL CHECK (capacidad_minima_noche >= 0),
    estado                 BOOLEAN      NOT NULL DEFAULT TRUE
);

-- 7 departamento_empleado
CREATE TABLE departamento_empleado (
    id_asignacion_depto  SERIAL       PRIMARY KEY,
    id_departamento      INTEGER      NOT NULL REFERENCES departamentos(id_departamento),
    id_empleado          INTEGER      NOT NULL REFERENCES empleados(id_empleado),
    fecha_inicio         DATE         NOT NULL,
    fecha_fin            DATE,
    rol_area             VARCHAR(50),
    CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

-- 8 disponibilidades
-- aclaracion leanla: se usa hora_inicio <> hora_fin (y no <) para permitir rangos que
-- cruzan la medianoche, como el turno nocturno 22:00-06:00.
CREATE TABLE disponibilidades (
    id_disponibilidad  SERIAL       PRIMARY KEY,
    id_empleado        INTEGER      NOT NULL REFERENCES empleados(id_empleado),
    dia_semana         VARCHAR(10)  NOT NULL
                       CHECK (dia_semana IN ('lunes','martes','miércoles','jueves','viernes','sábado','domingo')),
    hora_inicio        TIME         NOT NULL,
    hora_fin           TIME         NOT NULL,
    tipo_disponibilidad VARCHAR(20) NOT NULL
                       CHECK (tipo_disponibilidad IN ('disponible', 'no disponible', 'preferente')),
    CHECK (hora_inicio <> hora_fin)
);

-- 9. turnos
CREATE TABLE turnos (
    id_turno                 SERIAL       PRIMARY KEY,
    id_departamento          INTEGER      NOT NULL REFERENCES departamentos(id_departamento),
    id_especialidad_requerida INTEGER     REFERENCES especialidades(id_especialidad),
    nombre_turno             VARCHAR(80)  NOT NULL,
    tipo_turno               VARCHAR(20)  NOT NULL
                             CHECK (tipo_turno IN ('diurno', 'nocturno', 'emergencia')),
    fecha_turno              DATE         NOT NULL,
    hora_inicio              TIME         NOT NULL,
    hora_fin                 TIME         NOT NULL,
    cupos_requeridos         INTEGER      NOT NULL CHECK (cupos_requeridos > 0),
    estado                   VARCHAR(20)  NOT NULL DEFAULT 'abierto'
                             CHECK (estado IN ('abierto', 'cubierto', 'cancelado')),
    CHECK (hora_inicio <> hora_fin)
);

-- 10. asignaciones_turno
CREATE TABLE asignaciones_turno (
    id_asignacion       SERIAL        PRIMARY KEY,
    id_turno            INTEGER       NOT NULL REFERENCES turnos(id_turno),
    id_empleado         INTEGER       NOT NULL REFERENCES empleados(id_empleado),
    estado_asignacion   VARCHAR(20)   NOT NULL DEFAULT 'programado'
                        CHECK (estado_asignacion IN ('programado','confirmado','cancelado','cambiado')),
    horas_programadas   NUMERIC(5,2)  NOT NULL CHECK (horas_programadas > 0),
    origen_asignacion   VARCHAR(20)   NOT NULL
                        CHECK (origen_asignacion IN ('manual', 'automática', 'emergencia')),
    fecha_asignacion    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_turno, id_empleado)
);

-- 11 permisos_vacaciones
-- CAMBIO respecto al diccionario: se agrega id_aprobador, porque RF-07
-- exige registrar quien aprueba el permiso.
CREATE TABLE permisos_vacaciones (
    id_permiso    SERIAL       PRIMARY KEY,
    id_empleado   INTEGER      NOT NULL REFERENCES empleados(id_empleado),
    id_aprobador  INTEGER      REFERENCES usuarios(id_usuario),
    tipo_permiso  VARCHAR(25)  NOT NULL
                  CHECK (tipo_permiso IN ('permiso', 'vacación', 'incapacidad')),
    fecha_inicio  DATE         NOT NULL,
    fecha_fin     DATE         NOT NULL,
    motivo        VARCHAR(200),
    estado        VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    CHECK (fecha_fin >= fecha_inicio)
);

-- 12 solicitudes_cambio_turno
CREATE TABLE solicitudes_cambio_turno (
    id_solicitud          SERIAL       PRIMARY KEY,
    id_asignacion_origen  INTEGER      NOT NULL REFERENCES asignaciones_turno(id_asignacion),
    id_empleado_solicita  INTEGER      NOT NULL REFERENCES empleados(id_empleado),
    id_empleado_reemplazo INTEGER      REFERENCES empleados(id_empleado),
    motivo                VARCHAR(200) NOT NULL,
    estado                VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
    fecha_solicitud       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13 incidencias_laborales
CREATE TABLE incidencias_laborales (
    id_incidencia   SERIAL       PRIMARY KEY,
    id_asignacion   INTEGER      NOT NULL REFERENCES asignaciones_turno(id_asignacion),
    tipo_incidencia VARCHAR(30)  NOT NULL
                    CHECK (tipo_incidencia IN ('ausencia','tardanza','cambio','emergencia','otro')),
    descripcion     TEXT         NOT NULL,
    fecha_registro  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registrado_por  INTEGER      NOT NULL REFERENCES usuarios(id_usuario)
);

-- 14. notificaciones
CREATE TABLE notificaciones (
    id_notificacion SERIAL       PRIMARY KEY,
    id_usuario      INTEGER      NOT NULL REFERENCES usuarios(id_usuario),
    titulo          VARCHAR(100) NOT NULL,
    mensaje         VARCHAR(500) NOT NULL,
    leida           BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_envio     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. auditoria_sistema
CREATE TABLE auditoria_sistema (
    id_auditoria      SERIAL       PRIMARY KEY,
    id_usuario        INTEGER      NOT NULL REFERENCES usuarios(id_usuario),
    accion            VARCHAR(80)  NOT NULL,
    tabla_afectada    VARCHAR(60)  NOT NULL,
    registro_afectado VARCHAR(40)  NOT NULL,
    fecha_accion      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_origen         VARCHAR(45)
);

-- indices sobre claves foraneas y busquedas frecuentes
CREATE INDEX idx_usuarios_rol          ON usuarios(id_rol);
CREATE INDEX idx_empleados_apellidos   ON empleados(apellidos, nombres);
CREATE INDEX idx_emp_esp_especialidad  ON empleado_especialidad(id_especialidad);
CREATE INDEX idx_depto_emp_empleado    ON departamento_empleado(id_empleado);
CREATE INDEX idx_disp_empleado         ON disponibilidades(id_empleado);
CREATE INDEX idx_turnos_depto_fecha    ON turnos(id_departamento, fecha_turno);
CREATE INDEX idx_asig_empleado         ON asignaciones_turno(id_empleado);
CREATE INDEX idx_permisos_empleado     ON permisos_vacaciones(id_empleado, fecha_inicio, fecha_fin);
CREATE INDEX idx_solicitudes_asignacion ON solicitudes_cambio_turno(id_asignacion_origen);
CREATE INDEX idx_incidencias_asignacion ON incidencias_laborales(id_asignacion);
CREATE INDEX idx_notif_usuario         ON notificaciones(id_usuario, leida);
CREATE INDEX idx_auditoria_usuario     ON auditoria_sistema(id_usuario, fecha_accion);