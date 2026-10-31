require('dotenv').config();
const { Pool, types } = require('pg');

// Devolver las columnas DATE como texto 'YYYY-MM-DD' (evita problemas de zona horaria)
types.setTypeParser(1082, (valor) => valor);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'sigpmat',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

module.exports = pool;
