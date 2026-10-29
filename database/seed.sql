-- SIGPMAT - Datos de prueba para PostgreSQL
-- Ejecutar DESPUES de schema.sql
-- Los datos son ficticios. Las claves son marcadores de posicion:
-- en la aplicación real se guardarán con bcrypt (factor >= 12).

-- roles
INSERT INTO roles (nombre_rol, descripcion) VALUES
('administrador', 'Acceso total al sistema'),
('jefe de área',  'Gestiona turnos y personal de su departamento'),
('personal médico','Consulta horarios y solicita cambios');

-- usuarios
INSERT INTO usuarios (id_rol, usuario, correo, clave_hash, estado) VALUES
(1, 'admin',      'admin@hospital.test',     '$2b$12$PLACEHOLDER_HASH_ADMIN_000000000000000000000000000', 'activo'),
(2, 'jefe.urg',   'jefe.urg@hospital.test',  '$2b$12$PLACEHOLDER_HASH_JEFE_0000000000000000000000000000', 'activo'),
(3, 'dr.martinez','martinez@hospital.test',  '$2b$12$PLACEHOLDER_HASH_MED1_0000000000000000000000000000', 'activo'),
(3, 'dra.lopez',  'lopez@hospital.test',     '$2b$12$PLACEHOLDER_HASH_MED2_0000000000000000000000000000', 'activo'),
(3, 'enf.garcia', 'garcia@hospital.test',    '$2b$12$PLACEHOLDER_HASH_ENF1_0000000000000000000000000000', 'activo');

-- especialidades
INSERT INTO especialidades (nombre, descripcion) VALUES
('Medicina de Emergencias', 'Atención de urgencias y emergencias'),
('Pediatría',               'Atención médica infantil'),
('Cirugía General',         'Procedimientos quirúrgicos generales'),
('Medicina Interna',        'Atención de adultos'),
('Enfermería',              'Cuidados de enfermería');

-- empleados
INSERT INTO empleados (id_usuario, codigo_empleado, nombres, apellidos, dui, telefono, correo, tipo_empleado, estado_laboral, fecha_ingreso) VALUES
(1,    'EMP-001', 'Carlos Ernesto', 'Ramírez Cruz',   '01234567-8', '7000-0001', 'admin@hospital.test',    'administrativo', 'activo', '2020-02-10'),
(2,    'EMP-002', 'Ana Lucía',      'Hernández Pérez','02345678-9', '7000-0002', 'jefe.urg@hospital.test', 'médico',         'activo', '2018-06-01'),
(3,    'EMP-003', 'Luis Alberto',   'Martínez Díaz',  '03456789-0', '7000-0003', 'martinez@hospital.test', 'médico',         'activo', '2019-09-15'),
(4,    'EMP-004', 'María José',     'López Flores',   '04567890-1', '7000-0004', 'lopez@hospital.test',    'especialista',   'activo', '2021-03-20'),
(5,    'EMP-005', 'Sofía Beatriz',  'García Mejía',   '05678901-2', '7000-0005', 'garcia@hospital.test',   'enfermero',      'activo', '2022-01-05'),
(NULL, 'EMP-006', 'José Manuel',    'Torres Vega',    '06789012-3', '7000-0006', NULL,                     'médico',         'activo', '2023-07-12');

-- empleado_especialidad
INSERT INTO empleado_especialidad (id_empleado, id_especialidad, principal) VALUES
(2, 1, TRUE),
(3, 1, TRUE),
(3, 4, FALSE),
(4, 2, TRUE),
(5, 5, TRUE),
(6, 3, TRUE);

-- departamentos
INSERT INTO departamentos (nombre, tipo_area, ubicacion, capacidad_minima_dia, capacidad_minima_noche) VALUES
('Urgencias',       'emergencia',      'Planta baja, ala norte', 3, 2),
('Pediatría',       'consulta',        'Segundo nivel',          2, 1),
('Cirugía',         'hospitalización', 'Tercer nivel',           2, 2),
('Medicina Interna','hospitalización', 'Segundo nivel, ala sur', 2, 1);

-- departamento_empleado
INSERT INTO departamento_empleado (id_departamento, id_empleado, fecha_inicio, fecha_fin, rol_area) VALUES
(1, 2, '2018-06-01', NULL, 'Jefe de área'),
(1, 3, '2019-09-15', NULL, 'Médico de turno'),
(2, 4, '2021-03-20', NULL, 'Pediatra'),
(1, 5, '2022-01-05', NULL, 'Enfermería'),
(3, 6, '2023-07-12', NULL, 'Cirujano');

-- disponibilidades
INSERT INTO disponibilidades (id_empleado, dia_semana, hora_inicio, hora_fin, tipo_disponibilidad) VALUES
(3, 'lunes',     '06:00', '14:00', 'disponible'),
(3, 'martes',    '06:00', '14:00', 'preferente'),
(3, 'miércoles', '22:00', '06:00', 'no disponible'),
(4, 'lunes',     '14:00', '22:00', 'disponible'),
(5, 'martes',    '22:00', '06:00', 'disponible');

-- turnos (semana del 2 al 8 de noviembre de 2026)
INSERT INTO turnos (id_departamento, id_especialidad_requerida, nombre_turno, tipo_turno, fecha_turno, hora_inicio, hora_fin, cupos_requeridos, estado) VALUES
(1, 1, 'Urgencias diurno',          'diurno',     '2026-11-02', '06:00', '14:00', 2, 'abierto'),
(1, 1, 'Urgencias nocturno',        'nocturno',   '2026-11-02', '22:00', '06:00', 1, 'abierto'),
(2, 2, 'Pediatría vespertino',      'diurno',     '2026-11-03', '14:00', '22:00', 1, 'cubierto'),
(3, 3, 'Cirugía diurno',            'diurno',     '2026-11-04', '06:00', '14:00', 1, 'abierto'),
(1, 1, 'Refuerzo de emergencia',    'emergencia', '2026-11-05', '08:00', '16:00', 1, 'abierto');

-- asignaciones_turno
INSERT INTO asignaciones_turno (id_turno, id_empleado, estado_asignacion, horas_programadas, origen_asignacion) VALUES
(1, 3, 'confirmado',  8.00, 'automática'),
(1, 2, 'programado',  8.00, 'manual'),
(3, 4, 'confirmado',  8.00, 'automática'),
(2, 3, 'programado',  8.00, 'manual');

-- permisos_vacaciones
INSERT INTO permisos_vacaciones (id_empleado, id_aprobador, tipo_permiso, fecha_inicio, fecha_fin, motivo, estado) VALUES
(5, 2,    'vacación',    '2026-12-20', '2026-12-31', 'Vacaciones de fin de año', 'aprobado'),
(6, NULL, 'permiso',     '2026-11-10', '2026-11-10', 'Trámite personal',         'pendiente'),
(4, 2,    'incapacidad', '2026-11-06', '2026-11-08', 'Incapacidad médica',       'aprobado');

-- solicitudes_cambio_turno
INSERT INTO solicitudes_cambio_turno (id_asignacion_origen, id_empleado_solicita, id_empleado_reemplazo, motivo, estado) VALUES
(4, 3, 6,    'Cita médica programada', 'pendiente'),
(2, 2, NULL, 'Reunión de dirección',   'rechazada');

-- incidencias_laborales
INSERT INTO incidencias_laborales (id_asignacion, tipo_incidencia, descripcion, registrado_por) VALUES
(1, 'tardanza', 'Llegó 15 minutos tarde al turno diurno.', 2),
(3, 'otro',     'Cambio de sala por alta demanda.',        2);

-- notificaciones
INSERT INTO notificaciones (id_usuario, titulo, mensaje) VALUES
(3, 'Nuevo turno asignado',    'Se le asignó el turno Urgencias diurno el 02/11/2026.'),
(2, 'Solicitud de cambio',     'El Dr. Martínez solicitó un cambio de turno.'),
(5, 'Vacaciones aprobadas',    'Sus vacaciones del 20 al 31 de diciembre fueron aprobadas.');

-- auditoria_sistema
INSERT INTO auditoria_sistema (id_usuario, accion, tabla_afectada, registro_afectado, ip_origen) VALUES
(1, 'login',  'usuarios',           '1', '192.168.1.10'),
(2, 'crear',  'turnos',             '1', '192.168.1.21'),
(2, 'aprobar','permisos_vacaciones','1', '192.168.1.21');