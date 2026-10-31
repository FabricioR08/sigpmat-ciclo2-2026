const pool = require('../config/db');

async function obtenerTurno(idTurno) {
  const { rows } = await pool.query(
    `SELECT id_turno, id_departamento, id_especialidad_requerida, nombre_turno, tipo_turno,
            fecha_turno, hora_inicio, hora_fin, cupos_requeridos, estado
       FROM turnos WHERE id_turno = $1`,
    [idTurno]
  );
  return rows[0] || null;
}

// Asignaciones vigentes del empleado (se ignoran las canceladas o cambiadas)
async function asignacionesVigentes(idEmpleado) {
  const { rows } = await pool.query(
    `SELECT t.fecha_turno, t.hora_inicio, t.hora_fin, a.horas_programadas
       FROM asignaciones_turno a
       JOIN turnos t ON t.id_turno = a.id_turno
      WHERE a.id_empleado = $1 AND a.estado_asignacion IN ('programado','confirmado')`,
    [idEmpleado]
  );
  return rows;
}

async function permisosAprobados(idEmpleado) {
  const { rows } = await pool.query(
    `SELECT fecha_inicio, fecha_fin FROM permisos_vacaciones
      WHERE id_empleado = $1 AND estado = 'aprobado'`,
    [idEmpleado]
  );
  return rows;
}

async function tieneEspecialidad(idEmpleado, idEspecialidad) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM empleado_especialidad WHERE id_empleado = $1 AND id_especialidad = $2',
    [idEmpleado, idEspecialidad]
  );
  return rowCount > 0;
}

async function contarCuposOcupados(idTurno) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS ocupados FROM asignaciones_turno
      WHERE id_turno = $1 AND estado_asignacion IN ('programado','confirmado')`,
    [idTurno]
  );
  return rows[0].ocupados;
}

async function crear({ idTurno, idEmpleado, horas, origen }) {
  const { rows } = await pool.query(
    `INSERT INTO asignaciones_turno (id_turno, id_empleado, horas_programadas, origen_asignacion)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [idTurno, idEmpleado, horas, origen]
  );
  return rows[0];
}

module.exports = {
  obtenerTurno, asignacionesVigentes, permisosAprobados,
  tieneEspecialidad, contarCuposOcupados, crear,
};
