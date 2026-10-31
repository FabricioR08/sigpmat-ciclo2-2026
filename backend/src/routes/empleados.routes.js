const router = require('express').Router();
const { autenticar, requerirRol } = require('../middleware/auth');
const empleados = require('../services/empleados.service');
const auditoria = require('../repositories/auditoria.repository');

router.use(autenticar);

// RF-04: GET /api/empleados?nombre=&tipo=&estado=&pagina=
router.get('/', async (req, res, next) => {
  try { res.json(await empleados.listar(req.query)); } catch (e) { next(e); }
});

// RF-03: POST /api/empleados (solo administrador y jefe de area)
router.post('/', requerirRol('administrador', 'jefe de área'), async (req, res, next) => {
  try {
    const r = await empleados.crear(req.body || {});
    if (!r.ok) return res.status(400).json({ errores: r.errores });
    await auditoria.registrar({
      idUsuario: req.usuario.id, accion: 'crear', tabla: 'empleados',
      registro: r.empleado.id_empleado, ip: req.ip,
    });
    return res.status(201).json(r.empleado);
  } catch (e) { return next(e); }
});

module.exports = router;
