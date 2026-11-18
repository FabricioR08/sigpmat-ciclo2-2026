const router = require('express').Router();
const { autenticar, requerirRol } = require('../middleware/auth');
const asignaciones = require('../services/asignaciones.service');
const auditoria = require('../repositories/auditoria.repository');

router.use(autenticar);

const registrar = (req, accion, id) => auditoria.registrar({
  idUsuario: req.usuario.id, accion, tabla: 'asignaciones_turno', registro: id, ip: req.ip,
});

// GET /api/asignaciones?id_turno=&id_empleado=&estado=&desde=&hasta=  (administrador y jefe de área)
router.get('/', requerirRol('administrador', 'jefe de área'), async (req, res, next) => {
  try {
    const r = await asignaciones.listar(req.query);
    if (!r.ok) return res.status(400).json({ errores: r.errores });
    return res.json(r.asignaciones);
  } catch (e) { return next(e); }
});

// GET /api/asignaciones/mias: horario del empleado que inició sesion (cualquier rol)
router.get('/mias', async (req, res, next) => {
  try {
    const r = await asignaciones.misTurnos(req.usuario.id, req.query);
    if (!r.ok) return res.status(r.codigo).json({ errores: r.errores });
    return res.json(r.asignaciones);
  } catch (e) { return next(e); }
});

// RF-06: POST /api/asignaciones  { id_turno, id_empleado }
router.post('/', requerirRol('administrador', 'jefe de área'), async (req, res, next) => {
  try {
    const { id_turno: idTurno, id_empleado: idEmpleado } = req.body || {};
    if (!Number.isInteger(idTurno) || !Number.isInteger(idEmpleado)) {
      return res.status(400).json({ error: 'id_turno e id_empleado deben ser números enteros.' });
    }
    const r = await asignaciones.asignar({ idTurno, idEmpleado });
    if (!r.ok) return res.status(r.codigo).json({ error: 'Asignación rechazada.', motivos: r.motivos });
    await registrar(req, 'asignar_turno', r.asignacion.id_asignacion);
    return res.status(201).json(r.asignacion);
  } catch (e) { return next(e); }
});

// PATCH /api/asignaciones/:id/confirmar | /cancelar  (administrador y jefe de área)
['confirmar', 'cancelar'].forEach((accion) => {
  router.patch(`/:id/${accion}`, requerirRol('administrador', 'jefe de área'), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'El identificador debe ser un número entero positivo.' });
      }
      const r = await asignaciones.cambiarEstado(id, accion);
      if (!r.ok) return res.status(r.codigo).json({ errores: r.errores });
      await registrar(req, `${accion}_asignacion`, id);
      return res.json(r.asignacion);
    } catch (e) { return next(e); }
  });
});

module.exports = router;
