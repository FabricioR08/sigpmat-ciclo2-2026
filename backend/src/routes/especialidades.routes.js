const express = require('express');
const { autenticar, requerirRol } = require('../middleware/auth');
const service = require('../services/especialidades.service');

const router = express.Router();
router.use(autenticar);

router.get('/', async (req, res, next) => {
  try {
    const datos = await service.listar();
    return res.json(datos);
  } catch (err) {
    return next(err);
  }
});

router.post('/', requerirRol('administrador'), async (req, res, next) => {
  try {
    const creado = await service.crear(req.body);
    return res.status(201).json(creado);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: err.message,
        ...(err.errores ? { errores: err.errores } : {}),
      });
    }
    return next(err);
  }
});

router.put('/:id', requerirRol('administrador'), async (req, res, next) => {
  try {
    const actualizado = await service.actualizar(req.params.id, req.body);
    return res.json(actualizado);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: err.message,
        ...(err.errores ? { errores: err.errores } : {}),
      });
    }
    return next(err);
  }
});

router.patch('/:id/estado', requerirRol('administrador'), async (req, res, next) => {
  try {
    const actualizado = await service.cambiarEstado(req.params.id, req.body);
    return res.json(actualizado);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: err.message,
        ...(err.errores ? { errores: err.errores } : {}),
      });
    }
    return next(err);
  }
});

module.exports = router;