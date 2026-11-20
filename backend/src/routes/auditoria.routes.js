const router = require('express').Router();
const { autenticar, requerirRol } = require('../middleware/auth');
const auditoria = require('../services/auditoria.service');

router.use(autenticar);

// GET /api/auditoria?id_usuario=&accion=&tabla=&desde=&hasta=&limite=
router.get('/', requerirRol('administrador', 'jefe de área'), async (req, res, next) => {
  try {
    const r = await auditoria.listar(req.query);
    if (!r.ok) return res.status(r.codigo).json({ errores: r.errores });
    return res.json(r.registros);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;