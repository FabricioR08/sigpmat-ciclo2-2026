const express = require('express');

const app = express();
app.use(express.json());

app.get('/api/salud', (req, res) => res.json({ estado: 'ok', sistema: 'SIGPMAT' }));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/empleados', require('./routes/empleados.routes'));
app.use('/api/asignaciones', require('./routes/asignaciones.routes'));

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// Manejo central de errores (incluye violaciones de restricciones de PostgreSQL)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
  if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un registro con ese valor único.', detalle: err.detail });
  if (err.code === '23503') return res.status(400).json({ error: 'Referencia a un registro que no existe.', detalle: err.detail });
  if (err.code === '23514') return res.status(400).json({ error: 'Un valor no cumple las reglas de la base de datos.', detalle: err.constraint });
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor.' });
});

module.exports = app;
