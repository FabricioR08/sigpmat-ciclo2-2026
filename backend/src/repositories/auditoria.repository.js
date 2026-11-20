const pool = require('../config/db');

// Bitácora de acciones críticas (RNF-02)
async function registrar({ idUsuario, accion, tabla, registro, ip }) {
  await pool.query(
    `INSERT INTO auditoria_sistema (id_usuario, accion, tabla_afectada, registro_afectado, ip_origen)
     VALUES ($1, $2, $3, $4, $5)`,
    [idUsuario, accion, tabla, String(registro), ip || null]
  );
}

async function listar({ idUsuario, accion, tabla, desde, hasta, limite = 100 } = {}) {
  const condiciones = [];
  const valores = [];

  if (idUsuario) {
    valores.push(idUsuario);
    condiciones.push(`a.id_usuario = $${valores.length}`);
  }
  if (accion) {
    valores.push(`%${accion}%`);
    condiciones.push(`a.accion ILIKE $${valores.length}`);
  }
  if (tabla) {
    valores.push(tabla);
    condiciones.push(`a.tabla_afectada = $${valores.length}`);
  }
  if (desde) {
    valores.push(desde);
    condiciones.push(`a.fecha_accion::date >= $${valores.length}`);
  }
  if (hasta) {
    valores.push(hasta);
    condiciones.push(`a.fecha_accion::date <= $${valores.length}`);
  }

  valores.push(limite);
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT a.id_auditoria, a.id_usuario, u.usuario, a.accion, a.tabla_afectada,
            a.registro_afectado, a.fecha_accion, a.ip_origen
       FROM auditoria_sistema a
       LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
       ${donde}
      ORDER BY a.fecha_accion DESC, a.id_auditoria DESC
      LIMIT $${valores.length}`,
    valores
  );
  return rows;
}

module.exports = { registrar, listar };