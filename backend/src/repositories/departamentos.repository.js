const pool = require('../config/db');

async function listarTodos() {
  const { rows } = await pool.query(
    `SELECT *
     FROM departamentos
     ORDER BY nombre ASC`
  );
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    `SELECT *
     FROM departamentos
     WHERE id_departamento = $1`,
    [id]
  );
  return rows[0] || null;
}

async function crear(datos) {
  const { rows } = await pool.query(
    `INSERT INTO departamentos (
       nombre,
       tipo_area,
       ubicacion,
       capacidad_minima_dia,
       capacidad_minima_noche,
       estado
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      datos.nombre,
      datos.tipo_area,
      datos.ubicacion,
      datos.capacidad_minima_dia,
      datos.capacidad_minima_noche,
      datos.estado,
    ]
  );
  return rows[0];
}

async function actualizar(id, datos) {
  const { rows } = await pool.query(
    `UPDATE departamentos
     SET nombre = $1,
         tipo_area = $2,
         ubicacion = $3,
         capacidad_minima_dia = $4,
         capacidad_minima_noche = $5,
         estado = $6
     WHERE id_departamento = $7
     RETURNING *`,
    [
      datos.nombre,
      datos.tipo_area,
      datos.ubicacion,
      datos.capacidad_minima_dia,
      datos.capacidad_minima_noche,
      datos.estado,
      id,
    ]
  );
  return rows[0] || null;
}

async function cambiarEstado(id, estado) {
  const { rows } = await pool.query(
    `UPDATE departamentos
     SET estado = $1
     WHERE id_departamento = $2
     RETURNING *`,
    [estado, id]
  );
  return rows[0] || null;
}

module.exports = {
  listarTodos,
  buscarPorId,
  crear,
  actualizar,
  cambiarEstado,
};