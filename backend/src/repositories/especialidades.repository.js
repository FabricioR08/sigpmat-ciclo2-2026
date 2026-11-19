const pool = require('../config/db');

async function listarTodas() {
  const { rows } = await pool.query(
    `SELECT *
     FROM especialidades
     ORDER BY nombre ASC`
  );
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    `SELECT *
     FROM especialidades
     WHERE id_especialidad = $1`,
    [id]
  );
  return rows[0] || null;
}

async function crear(datos) {
  const { rows } = await pool.query(
    `INSERT INTO especialidades (nombre, descripcion, estado)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [datos.nombre, datos.descripcion, datos.estado]
  );
  return rows[0];
}

async function actualizar(id, datos) {
  const { rows } = await pool.query(
    `UPDATE especialidades
     SET nombre = $1,
         descripcion = $2,
         estado = $3
     WHERE id_especialidad = $4
     RETURNING *`,
    [datos.nombre, datos.descripcion, datos.estado, id]
  );
  return rows[0] || null;
}

async function cambiarEstado(id, estado) {
  const { rows } = await pool.query(
    `UPDATE especialidades
     SET estado = $1
     WHERE id_especialidad = $2
     RETURNING *`,
    [estado, id]
  );
  return rows[0] || null;
}

module.exports = {
  listarTodas,
  buscarPorId,
  crear,
  actualizar,
  cambiarEstado,
};