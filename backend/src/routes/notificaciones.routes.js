const router = require('express').Router();
const { autenticar } = require('../middleware/auth');
const notificaciones = require('../services/notificaciones.service');

router.use(autenticar);

// GET /api/notificaciones?no_leidas=&limite=
router.get('/', async (req, res, next) => {
  try {
    const r = await notificaciones.listar(req.usuario.id, req.query);
    return res.json(r);
  } catch (e) {
    return next(e);
  }
});

// PATCH /api/notificaciones/leer-todas
router.patch('/leer-todas', async (req, res, next) => {
  try {
    const r = await notificaciones.marcarTodasLeidas(req.usuario.id);
    return res.json(r);
  } catch (e) {
    return next(e);
  }
});

// PATCH /api/notificaciones/:id/leer
router.patch('/:id/leer', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'El identificador debe ser un número entero positivo.' });
    }
    const r = await notificaciones.marcarLeida(id, req.usuario.id);
    if (!r.ok) return res.status(r.codigo).json({ errores: r.errores });
    return res.json(r.notificacion);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;