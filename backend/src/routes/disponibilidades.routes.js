const router = require('express').Router();
const { autenticar, requerirRol } = require('../middleware/auth');
const disponibilidades = require('../services/disponibilidades.service');
const auditoria = require('../repositories/auditoria.repository');

router.use(autenticar);

const ROLES_PERMITIDOS = ['administrador', 'jefe de área', 'personal médico'];

const registrar = (req, accion, id) =>
  auditoria.registrar({
    idUsuario: req.usuario.id,
    accion,
    tabla: 'disponibilidades',
    registro: id,
    ip: req.ip,
  });

// GET /api/disponibilidades?id_empleado=&dia_semana=&tipo_disponibilidad=
router.get('/', requerirRol(...ROLES_PERMITIDOS), async (req, res, next) => {
  try {
    const r = await disponibilidades.listar(req.query, req.usuario);
    if (!r.ok) return res.status(r.codigo).json({ errores: r.errores });
    return res.json(r.disponibilidades);
  } catch (e) {
    return next(e);
  }
});

// POST /api/disponibilidades
router.post('/', requerirRol(...ROLES_PERMITIDOS), async (req, res, next) => {
  try {
    const r = await disponibilidades.crear(req.body || {}, req.usuario);
    if (!r.ok) return res.status(r.codigo).json({ errores: r.errores });
    await registrar(req, 'crear_disponibilidad', r.disponibilidad.id_disponibilidad);
    return res.status(201).json(r.disponibilidad);
  } catch (e) {
    return next(e);
  }
});

// PUT /api/disponibilidades/:id
router.put('/:id', requerirRol(...ROLES_PERMITIDOS), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'El identificador debe ser un número entero positivo.' });
    }
    const r = await disponibilidades.actualizar(id, req.body || {}, req.usuario);
    if (!r.ok) return res.status(r.codigo).json({ errores: r.errores });
    await registrar(req, 'actualizar_disponibilidad', id);
    return res.json(r.disponibilidad);
  } catch (e) {
    return next(e);
  }
});

// DELETE /api/disponibilidades/:id
router.delete('/:id', requerirRol(...ROLES_PERMITIDOS), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'El identificador debe ser un número entero positivo.' });
    }
    const r = await disponibilidades.eliminar(id, req.usuario);
    if (!r.ok) return res.status(r.codigo).json({ errores: r.errores });
    await registrar(req, 'eliminar_disponibilidad', id);
    return res.status(204).send();
  } catch (e) {
    return next(e);
  }
});

module.exports = router;