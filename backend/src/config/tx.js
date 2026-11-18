const pool = require('./db');

/**
 * Ejecuta varias consultas como una sola transaccion: o se guardan todas o ninguna.
 * Uso: await conTransaccion(async (cliente) => { await cliente.query(...); ... });
 */
async function conTransaccion(trabajo) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

module.exports = { conTransaccion };
