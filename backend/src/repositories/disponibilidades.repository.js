const pool = require('../config/db');

const SELECT_BASE = `
  SELECT d.id_disponibilidad, d.id_empleado, d.dia_semana,
         TO_CHAR(d.hora_inicio, 'HH24:MI') AS hora_inicio,
         TO_CHAR(d.hora_fin, 'HH24:MI') AS hora_fin,
         d.tipo_disponibilidad,
         e.codigo_empleado, e.nombres, e.apellidos,
         e.nombres || ' ' || e.apellidos AS empleado,
         e.tipo_empleado
    FROM disponibilidades d
    JOIN empleados e ON e.id_empleado = d.id_empleado`;

async function listar({ idEmpleado, diaSemana, tipoDisponibilidad }) {
  const condiciones = [];
  const valores = [];

  if (idEmpleado) {
    valores.push(idEmpleado);
    condiciones.push(`d.id_empleado = $${valores.length}`);
  }
  if (diaSemana) {
    valores.push(diaSemana);
    condiciones.push(`d.dia_semana = $${valores.length}`);
  }
  if (tipoDisponibilidad) {
    valores.push(tipoDisponibilidad);
    condiciones.push(`d.tipo_disponibilidad = $${valores.length}`);
  }

  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `${SELECT_BASE} ${donde}
      ORDER BY e.apellidos, e.nombres,
        CASE d.dia_semana
          WHEN 'lunes' THEN 1
          WHEN 'martes' THEN 2
          WHEN 'miércoles' THEN 3
          WHEN 'jueves' THEN 4
          WHEN 'viernes' THEN 5
          WHEN 'sábado' THEN 6
          WHEN 'domingo' THEN 7
        END,
        d.hora_inicio`,
    valores
  );
  return rows;
}

async function obtenerPorId(idDisponibilidad) {
  const { rows } = await pool.query(
    `${SELECT_BASE} WHERE d.id_disponibilidad = $1`,
    [idDisponibilidad]
  );
  return rows[0] || null;
}

async function crear({ idEmpleado, diaSemana, horaInicio, horaFin, tipoDisponibilidad }) {
  const { rows } = await pool.query(
    `INSERT INTO disponibilidades (id_empleado, dia_semana, hora_inicio, hora_fin, tipo_disponibilidad)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_disponibilidad`,
    [idEmpleado, diaSemana, horaInicio, horaFin, tipoDisponibilidad]
  );
  return obtenerPorId(rows[0].id_disponibilidad);
}

async function actualizar(idDisponibilidad, { diaSemana, horaInicio, horaFin, tipoDisponibilidad }) {
  const { rowCount } = await pool.query(
    `UPDATE disponibilidades
        SET dia_semana = $1,
            hora_inicio = $2,
            hora_fin = $3,
            tipo_disponibilidad = $4
      WHERE id_disponibilidad = $5`,
    [diaSemana, horaInicio, horaFin, tipoDisponibilidad, idDisponibilidad]
  );
  if (!rowCount) return null;
  return obtenerPorId(idDisponibilidad);
}

async function eliminar(idDisponibilidad) {
  const { rowCount } = await pool.query(
    'DELETE FROM disponibilidades WHERE id_disponibilidad = $1',
    [idDisponibilidad]
  );
  return rowCount > 0;
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};