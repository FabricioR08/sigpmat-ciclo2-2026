const router = require('express').Router();
const { autenticar, requerirRol } = require('../middleware/auth');
const empleados = require('../services/empleados.service');
const repo = require('../repositories/empleados.repository');
const auditoria = require('../repositories/auditoria.repository');

router.use(autenticar);

function idDeRuta(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'El identificador debe ser un número entero positivo.' });
    return null;
  }
  return id;
}

const registrar = (req, accion, id) => auditoria.registrar({
  idUsuario: req.usuario.id, accion, tabla: 'empleados', registro: id, ip: req.ip,
});

// RF-04: GET /api/empleados?nombre=&tipo=&estado=&departamento=&especialidad=&pagina=
router.get('/', async (req, res, next) => {
  try { res.json(await empleados.listar(req.query)); } catch (e) { next(e); }
});

// GET /api/empleados/:id (con especialidades y departamento)
router.get('/:id', async (req, res, next) => {
  try {
    const id = idDeRuta(req, res);
    if (!id) return undefined;
    const empleado = await repo.obtenerDetalle(id);
    if (!empleado) return res.status(404).json({ error: 'El empleado no existe.' });
    return res.json(empleado);
  } catch (e) { return next(e); }
});

// RF-03: POST /api/empleados (administrador y jefe de área)
router.post('/', requerirRol('administrador', 'jefe de área'), async (req, res, next) => {
  try {
    const r = await empleados.crear(req.body || {});
    if (!r.ok) return res.status(r.codigo).json({ errores: r.errores });
    await registrar(req, 'crear', r.empleado.id_empleado);
    return res.status(201).json(r.empleado);
  } catch (e) { return next(e); }
});

// Modificacion: PUT /api/empleados/:id (administrador y jefe de area)
router.put('/:id', requerirRol('administrador', 'jefe de área'), async (req, res, next) => {
  try {
    const id = idDeRuta(req, res);
    if (!id) return undefined;
    const r = await empleados.actualizar(id, req.body || {});
    if (!r.ok) return res.status(r.codigo).json({ errores: r.errores });
    await registrar(req, 'editar', id);
    return res.json(r.empleado);
  } catch (e) { return next(e); }
});

// Eliminacion: DELETE /api/empleados/:id (solo administrador)
router.delete('/:id', requerirRol('administrador'), async (req, res, next) => {
  try {
    const id = idDeRuta(req, res);
    if (!id) return undefined;
    const r = await empleados.eliminar(id);
    if (!r.ok) return res.status(r.codigo).json({ errores: r.errores });
    await registrar(req, 'eliminar', id);
    return res.json({ mensaje: 'Empleado eliminado.' });
  } catch (e) { return next(e); }
});

module.exports = router;
