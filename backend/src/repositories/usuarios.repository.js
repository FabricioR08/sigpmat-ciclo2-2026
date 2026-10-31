const pool = require('../config/db');

async function buscarPorUsuarioOCorreo(valor) {
  const { rows } = await pool.query(
    `SELECT u.id_usuario, u.usuario, u.correo, u.clave_hash, u.estado, r.nombre_rol AS rol
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
      WHERE u.usuario = $1 OR u.correo = $1`,
    [valor]
  );
  return rows[0] || null;
}

async function actualizarUltimoAcceso(idUsuario) {
  await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = $1', [idUsuario]);
}

module.exports = { buscarPorUsuarioOCorreo, actualizarUltimoAcceso };
