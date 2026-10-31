const pool = require('../config/db');

// Bitacora de acciones críticas (RNF-02)
async function registrar({ idUsuario, accion, tabla, registro, ip }) {
  await pool.query(
    `INSERT INTO auditoria_sistema (id_usuario, accion, tabla_afectada, registro_afectado, ip_origen)
     VALUES ($1, $2, $3, $4, $5)`,
    [idUsuario, accion, tabla, String(registro), ip || null]
  );
}

module.exports = { registrar };
