const pool = require('../config/db');

async function listarPorUsuario(idUsuario, { soloNoLeidas = false, limite = 50 } = {}) {
  const condiciones = ['id_usuario = $1'];
  const valores = [idUsuario];

  if (soloNoLeidas) {
    condiciones.push('leida = FALSE');
  }

  valores.push(limite);
  const { rows } = await pool.query(
    `SELECT id_notificacion, id_usuario, titulo, mensaje, leida, fecha_envio
       FROM notificaciones
      WHERE ${condiciones.join(' AND ')}
      ORDER BY fecha_envio DESC, id_notificacion DESC
      LIMIT $${valores.length}`,
    valores
  );
  return rows;
}

async function crear({ idUsuario, titulo, mensaje }) {
  const { rows } = await pool.query(
    `INSERT INTO notificaciones (id_usuario, titulo, mensaje)
     VALUES ($1, $2, $3)
     RETURNING id_notificacion, id_usuario, titulo, mensaje, leida, fecha_envio`,
    [idUsuario, titulo, mensaje]
  );
  return rows[0];
}

async function marcarLeida(idNotificacion, idUsuario) {
  const { rows } = await pool.query(
    `UPDATE notificaciones
        SET leida = TRUE
      WHERE id_notificacion = $1 AND id_usuario = $2
     RETURNING id_notificacion, id_usuario, titulo, mensaje, leida, fecha_envio`,
    [idNotificacion, idUsuario]
  );
  return rows[0] || null;
}

async function marcarTodasLeidas(idUsuario) {
  const { rowCount } = await pool.query(
    `UPDATE notificaciones
        SET leida = TRUE
      WHERE id_usuario = $1 AND leida = FALSE`,
    [idUsuario]
  );
  return rowCount;
}

module.exports = {
  listarPorUsuario,
  crear,
  marcarLeida,
  marcarTodasLeidas,
};