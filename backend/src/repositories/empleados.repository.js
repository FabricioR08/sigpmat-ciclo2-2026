const pool = require('../config/db');

// RF-04: busqueda con filtros y paginacion
async function listar({ nombre, tipo, estado, limite, desplazamiento }) {
  const condiciones = [];
  const valores = [];

  if (nombre) {
    valores.push(`%${nombre}%`);
    condiciones.push(`(e.nombres ILIKE $${valores.length} OR e.apellidos ILIKE $${valores.length})`);
  }
  if (tipo) {
    valores.push(tipo);
    condiciones.push(`e.tipo_empleado = $${valores.length}`);
  }
  if (estado) {
    valores.push(estado);
    condiciones.push(`e.estado_laboral = $${valores.length}`);
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const total = await pool.query(`SELECT COUNT(*)::int AS total FROM empleados e ${donde}`, valores);

  valores.push(limite, desplazamiento);
  const { rows } = await pool.query(
    `SELECT e.id_empleado, e.codigo_empleado, e.nombres, e.apellidos, e.dui, e.telefono,
            e.correo, e.tipo_empleado, e.estado_laboral, e.fecha_ingreso
       FROM empleados e
       ${donde}
      ORDER BY e.apellidos, e.nombres
      LIMIT $${valores.length - 1} OFFSET $${valores.length}`,
    valores
  );
  return { total: total.rows[0].total, empleados: rows };
}

async function obtenerPorId(id) {
  const { rows } = await pool.query('SELECT * FROM empleados WHERE id_empleado = $1', [id]);
  return rows[0] || null;
}

// RF-03: registro de personal
async function crear(e) {
  const { rows } = await pool.query(
    `INSERT INTO empleados
       (codigo_empleado, nombres, apellidos, dui, telefono, correo, tipo_empleado, estado_laboral, fecha_ingreso)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'activo'),$9)
     RETURNING *`,
    [e.codigo_empleado, e.nombres, e.apellidos, e.dui || null, e.telefono || null,
     e.correo || null, e.tipo_empleado, e.estado_laboral, e.fecha_ingreso]
  );
  return rows[0];
}

module.exports = { listar, obtenerPorId, crear };
