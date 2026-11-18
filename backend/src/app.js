const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
app.use(express.json());

app.get('/api/salud', (req, res) => res.json({ estado: 'ok', sistema: 'SIGPMAT' }));

// Carga automatica de rutas: cada archivo "nombre.routes.js" de la carpeta routes
// queda disponible en /api/nombre. Así nadie necesita editar este archivo al agregar un módulo.
fs.readdirSync(path.join(__dirname, 'routes'))
  .filter((archivo) => archivo.endsWith('.routes.js'))
  .forEach((archivo) => {
    app.use(`/api/${archivo.replace('.routes.js', '')}`, require(`./routes/${archivo}`));
  });

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// Manejo central de errores (incluye violaciones de restricciones de PostgreSQL)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
  if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un registro con ese valor único.', detalle: err.detail });
  if (err.code === '23503') return res.status(400).json({ error: 'Referencia a un registro que no existe.', detalle: err.detail });
  if (err.code === '23514') return res.status(400).json({ error: 'Un valor no cumple las reglas de la base de datos.', detalle: err.constraint });
  if (['22007', '22008', '22P02'].includes(err.code)) return res.status(400).json({ error: 'Un valor tiene un formato inválido (fecha o número).' });
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor.' });
});

module.exports = app;
