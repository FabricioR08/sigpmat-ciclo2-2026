const pool = require('../config/db');

// Listas para llenar los selectores de los formularios
async function departamentosActivos() {
  const { rows } = await pool.query(
    'SELECT id_departamento, nombre, tipo_area FROM departamentos WHERE estado = TRUE ORDER BY nombre'
  );
  return rows;
}

async function especialidadesActivas() {
  const { rows } = await pool.query(
    'SELECT id_especialidad, nombre FROM especialidades WHERE estado = TRUE ORDER BY nombre'
  );
  return rows;
}

module.exports = { departamentosActivos, especialidadesActivas };
