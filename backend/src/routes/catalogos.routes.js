const router = require('express').Router();
const { autenticar } = require('../middleware/auth');
const catalogos = require('../repositories/catalogos.repository');
const { TIPOS, ESTADOS } = require('../services/empleados.service');

router.use(autenticar);

// GET /api/catalogos: opciones para los formularios del frontend
router.get('/', async (req, res, next) => {
  try {
    const [departamentos, especialidades] = await Promise.all([
      catalogos.departamentosActivos(),
      catalogos.especialidadesActivas(),
    ]);
    res.json({ departamentos, especialidades, tipos_empleado: TIPOS, estados_laborales: ESTADOS });
  } catch (e) { next(e); }
});

module.exports = router;
