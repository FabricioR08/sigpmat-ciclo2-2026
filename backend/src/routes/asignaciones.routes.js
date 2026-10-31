const router = require('express').Router();
const { autenticar, requerirRol } = require('../middleware/auth');
const asignaciones = require('../services/asignaciones.service');
const auditoria = require('../repositories/auditoria.repository');

router.use(autenticar);

// RF-06: POST /api/asignaciones  { id_turno, id_empleado }
router.post('/', requerirRol('administrador', 'jefe de área'), async (req, res, next) => {
  try {
    const { id_turno: idTurno, id_empleado: idEmpleado } = req.body || {};
    if (!Number.isInteger(idTurno) || !Number.isInteger(idEmpleado)) {
      return res.status(400).json({ error: 'id_turno e id_empleado deben ser números enteros.' });
    }
    const r = await asignaciones.asignar({ idTurno, idEmpleado });
    if (!r.ok) return res.status(r.codigo).json({ error: 'Asignación rechazada.', motivos: r.motivos });
    await auditoria.registrar({
      idUsuario: req.usuario.id, accion: 'asignar_turno', tabla: 'asignaciones_turno',
      registro: r.asignacion.id_asignacion, ip: req.ip,
    });
    return res.status(201).json(r.asignacion);
  } catch (e) { return next(e); }
});

module.exports = router;
