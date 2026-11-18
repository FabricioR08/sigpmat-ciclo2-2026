const pool = require('../config/db');
const { conTransaccion } = require('../config/tx');

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

// El turno queda "cubierto" cuando se llenan sus cupos y vuelve a "abierto" si se libera uno.
// Un turno cancelado no se toca.
async function sincronizarEstadoTurno(cliente, idTurno) {
  await cliente.query(
    `UPDATE turnos t SET estado = CASE
         WHEN (SELECT COUNT(*) FROM asignaciones_turno a
                WHERE a.id_turno = t.id_turno AND a.estado_asignacion IN ('programado','confirmado'))
              >= t.cupos_requeridos THEN 'cubierto' ELSE 'abierto' END
      WHERE t.id_turno = $1 AND t.estado <> 'cancelado'`,
    [idTurno]
  );
}

async function crear({ idTurno, idEmpleado, horas, origen }) {
  return conTransaccion(async (cliente) => {
    // Si el empleado ya tuvo este turno y fue cancelado o cambiado, se reactiva esa misma fila
    // (la tabla no permite dos filas para el mismo turno y empleado).
    const { rows } = await cliente.query(
      `INSERT INTO asignaciones_turno (id_turno, id_empleado, horas_programadas, origen_asignacion)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id_turno, id_empleado) DO UPDATE
          SET estado_asignacion = 'programado',
              horas_programadas = EXCLUDED.horas_programadas,
              origen_asignacion = EXCLUDED.origen_asignacion,
              fecha_asignacion  = CURRENT_TIMESTAMP
        WHERE asignaciones_turno.estado_asignacion IN ('cancelado', 'cambiado')
       RETURNING *`,
      [idTurno, idEmpleado, horas, origen]
    );
    if (!rows.length) {
      const error = new Error('El empleado ya tiene una asignación vigente en este turno.');
      error.code = '23505';
      throw error;
    }
    await sincronizarEstadoTurno(cliente, idTurno);
    return rows[0];
  });
}

const SELECT_LISTADO = `
  SELECT a.id_asignacion, a.estado_asignacion, a.horas_programadas, a.origen_asignacion, a.fecha_asignacion,
         t.id_turno, t.nombre_turno, t.tipo_turno, t.fecha_turno, t.hora_inicio, t.hora_fin,
         d.nombre AS departamento,
         e.id_empleado, e.nombres || ' ' || e.apellidos AS empleado
    FROM asignaciones_turno a
    JOIN turnos t ON t.id_turno = a.id_turno
    JOIN departamentos d ON d.id_departamento = t.id_departamento
    JOIN empleados e ON e.id_empleado = a.id_empleado`;

// Listado con filtros opcionales (turno, empleado, estado y rango de fechas)
async function listar({ idTurno, idEmpleado, estado, desde, hasta }) {
  const condiciones = [];
  const valores = [];
  const agregar = (sql, valor) => { valores.push(valor); condiciones.push(sql.replace('?', `$${valores.length}`)); };

  if (idTurno) agregar('a.id_turno = ?', idTurno);
  if (idEmpleado) agregar('a.id_empleado = ?', idEmpleado);
  if (estado) agregar('a.estado_asignacion = ?', estado);
  if (desde) agregar('t.fecha_turno >= ?', desde);
  if (hasta) agregar('t.fecha_turno <= ?', hasta);

  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `${SELECT_LISTADO} ${donde} ORDER BY t.fecha_turno, t.hora_inicio, e.apellidos`,
    valores
  );
  return rows;
}

async function obtener(idAsignacion) {
  const { rows } = await pool.query(`${SELECT_LISTADO} WHERE a.id_asignacion = $1`, [idAsignacion]);
  return rows[0] || null;
}

// Cambia el estado y mantiene sincronizado el estado del turno
async function cambiarEstado(idAsignacion, idTurno, nuevoEstado) {
  return conTransaccion(async (cliente) => {
    await cliente.query(
      'UPDATE asignaciones_turno SET estado_asignacion = $1 WHERE id_asignacion = $2',
      [nuevoEstado, idAsignacion]
    );
    await sincronizarEstadoTurno(cliente, idTurno);
  });
}

async function empleadoDeUsuario(idUsuario) {
  const { rows } = await pool.query('SELECT id_empleado FROM empleados WHERE id_usuario = $1', [idUsuario]);
  return rows[0] ? rows[0].id_empleado : null;
}

module.exports = {
  obtenerTurno, asignacionesVigentes, permisosAprobados, tieneEspecialidad,
  contarCuposOcupados, crear, listar, obtener, cambiarEstado, empleadoDeUsuario,
};
