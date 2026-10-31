// Asigna una contraseña de PRUEBA con bcrypt (factor 12) a los usuarios del seed.
// Uso: npm run seed:passwords
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

const CLAVE_PRUEBA = 'Sigpmat2026!';

(async () => {
  const hash = await bcrypt.hash(CLAVE_PRUEBA, 12);
  const r = await pool.query('UPDATE usuarios SET clave_hash = $1', [hash]);
  console.log(`Contraseña de prueba asignada a ${r.rowCount} usuarios: ${CLAVE_PRUEBA}`);
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
