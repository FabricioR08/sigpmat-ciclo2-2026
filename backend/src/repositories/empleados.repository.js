const pool = require('../config/db');
const { conTransaccion } = require('../config/tx');

const COLUMNAS_EDITABLES = [
  'codigo_empleado', 'nombres', 'apellidos', 'dui', 'telefono',
  'correo', 'tipo_empleado', 'estado_laboral', 'fecha_ingreso',
];

// RF-04: busqueda con filtros y paginacion
async function listar({ nombre, tipo, estado, departamento, especialidad, limite, desplazamiento }) {
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
  if (departamento) {
    valores.push(departamento);
    condiciones.push(`EXISTS (SELECT 1 FROM departamento_empleado de
                              WHERE de.id_empleado = e.id_empleado AND de.fecha_fin IS NULL
                                AND de.id_departamento = $${valores.length})`);
  }
  if (especialidad) {
    valores.push(especialidad);
    condiciones.push(`EXISTS (SELECT 1 FROM empleado_especialidad ee
                              WHERE ee.id_empleado = e.id_empleado
                                AND ee.id_especialidad = $${valores.length})`);
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const total = await pool.query(`SELECT COUNT(*)::int AS total FROM empleados e ${donde}`, valores);

  valores.push(limite, desplazamiento);
  const { rows } = await pool.query(
    `SELECT e.id_empleado, e.codigo_empleado, e.nombres, e.apellidos, e.dui, e.telefono,
            e.correo, e.tipo_empleado, e.estado_laboral, e.fecha_ingreso,
            d.nombre AS departamento, s.nombre AS especialidad_principal
       FROM empleados e
       LEFT JOIN LATERAL (
              SELECT dep.nombre FROM departamento_empleado de
                JOIN departamentos dep ON dep.id_departamento = de.id_departamento
               WHERE de.id_empleado = e.id_empleado AND de.fecha_fin IS NULL
               ORDER BY de.fecha_inicio DESC LIMIT 1) d ON TRUE
       LEFT JOIN LATERAL (
              SELECT esp.nombre FROM empleado_especialidad ee
                JOIN especialidades esp ON esp.id_especialidad = ee.id_especialidad
               WHERE ee.id_empleado = e.id_empleado
               ORDER BY ee.principal DESC, esp.nombre LIMIT 1) s ON TRUE
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

// Empleado con sus especialidades y su departamento actual
async function obtenerDetalle(id) {
  const empleado = await obtenerPorId(id);
  if (!empleado) return null;

  const esp = await pool.query(
    `SELECT s.id_especialidad, s.nombre, ee.principal
       FROM empleado_especialidad ee
       JOIN especialidades s ON s.id_especialidad = ee.id_especialidad
      WHERE ee.id_empleado = $1
      ORDER BY ee.principal DESC, s.nombre`,
    [id]
  );
  const dep = await pool.query(
    `SELECT d.id_departamento, d.nombre, de.rol_area, de.fecha_inicio
       FROM departamento_empleado de
       JOIN departamentos d ON d.id_departamento = de.id_departamento
      WHERE de.id_empleado = $1 AND de.fecha_fin IS NULL
      ORDER BY de.fecha_inicio DESC LIMIT 1`,
    [id]
  );
  return { ...empleado, especialidades: esp.rows, departamento: dep.rows[0] || null };
}

async function reemplazarEspecialidades(cliente, idEmpleado, especialidades) {
  await cliente.query('DELETE FROM empleado_especialidad WHERE id_empleado = $1', [idEmpleado]);
  const ids = [...new Set(especialidades)];
  for (let i = 0; i < ids.length; i += 1) {
    // la primera de la lista es la especialidad principal
    await cliente.query(
      'INSERT INTO empleado_especialidad (id_empleado, id_especialidad, principal) VALUES ($1, $2, $3)',
      [idEmpleado, ids[i], i === 0]
    );
  }
}

async function asignarDepartamento(cliente, idEmpleado, idDepartamento) {
  // cierra la asignacion vigente si es a otro departamento (o si se quita)
  await cliente.query(
    `UPDATE departamento_empleado SET fecha_fin = GREATEST(fecha_inicio, CURRENT_DATE)
      WHERE id_empleado = $1 AND fecha_fin IS NULL
        AND ($2::int IS NULL OR id_departamento <> $2::int)`,
    [idEmpleado, idDepartamento]
  );
  if (idDepartamento) {
    await cliente.query(
      `INSERT INTO departamento_empleado (id_departamento, id_empleado, fecha_inicio)
       SELECT $1, $2, CURRENT_DATE
        WHERE NOT EXISTS (SELECT 1 FROM departamento_empleado
                           WHERE id_empleado = $2 AND fecha_fin IS NULL AND id_departamento = $1)`,
      [idDepartamento, idEmpleado]
    );
  }
}

// RF-03: registro de personal (con especialidades y departamento opcionales)
async function crear(e, { especialidades, idDepartamento }) {
  return conTransaccion(async (cliente) => {
    const { rows } = await cliente.query(
      `INSERT INTO empleados
         (codigo_empleado, nombres, apellidos, dui, telefono, correo, tipo_empleado, estado_laboral, fecha_ingreso)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'activo'),$9)
       RETURNING id_empleado`,
      [e.codigo_empleado, e.nombres, e.apellidos, e.dui || null, e.telefono || null,
       e.correo || null, e.tipo_empleado, e.estado_laboral, e.fecha_ingreso]
    );
    const id = rows[0].id_empleado;
    if (especialidades && especialidades.length) await reemplazarEspecialidades(cliente, id, especialidades);
    if (idDepartamento) await asignarDepartamento(cliente, id, idDepartamento);
    return id;
  });
}

// Modificacion: solo cambia los campos recibidos. Devuelve false si el empleado no existe.
async function actualizar(id, campos, { especialidades, idDepartamento }) {
  return conTransaccion(async (cliente) => {
    const existe = await cliente.query('SELECT 1 FROM empleados WHERE id_empleado = $1 FOR UPDATE', [id]);
    if (!existe.rowCount) return false;

    const nombres = Object.keys(campos).filter((c) => COLUMNAS_EDITABLES.includes(c));
    if (nombres.length) {
      const asignaciones = nombres.map((c, i) => `${c} = $${i + 1}`).join(', ');
      await cliente.query(
        `UPDATE empleados SET ${asignaciones} WHERE id_empleado = $${nombres.length + 1}`,
        [...nombres.map((c) => campos[c]), id]
      );
    }
    if (especialidades !== undefined) await reemplazarEspecialidades(cliente, id, especialidades);
    if (idDepartamento !== undefined) await asignarDepartamento(cliente, id, idDepartamento);
    return true;
  });
}

// Eliminacion: borra al empleado y su configuración (especialidades, departamento, disponibilidad).
// Si tiene turnos, permisos o solicitudes asociados, PostgreSQL lo impide (error 23503).
async function eliminar(id) {
  return conTransaccion(async (cliente) => {
    await cliente.query('DELETE FROM empleado_especialidad WHERE id_empleado = $1', [id]);
    await cliente.query('DELETE FROM departamento_empleado WHERE id_empleado = $1', [id]);
    await cliente.query('DELETE FROM disponibilidades WHERE id_empleado = $1', [id]);
    const { rowCount } = await cliente.query('DELETE FROM empleados WHERE id_empleado = $1', [id]);
    return rowCount > 0;
  });
}

module.exports = { listar, obtenerPorId, obtenerDetalle, crear, actualizar, eliminar, COLUMNAS_EDITABLES };
