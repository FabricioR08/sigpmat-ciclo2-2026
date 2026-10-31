const repo = require('../repositories/asignaciones.repository');
const empleados = require('../repositories/empleados.repository');
const { validarAsignacion, duracionHoras } = require('./conflictos.service');

async function asignar({ idTurno, idEmpleado, origen = 'manual' }) {
  const turno = await repo.obtenerTurno(idTurno);
  if (!turno) return { ok: false, codigo: 404, motivos: [{ codigo: 'TURNO_NO_EXISTE', mensaje: 'El turno no existe.' }] };

  const empleado = await empleados.obtenerPorId(idEmpleado);
  if (!empleado) return { ok: false, codigo: 404, motivos: [{ codigo: 'EMPLEADO_NO_EXISTE', mensaje: 'El empleado no existe.' }] };

  const [asignaciones, permisos, cuposOcupados, tieneEspecialidad] = await Promise.all([
    repo.asignacionesVigentes(idEmpleado),
    repo.permisosAprobados(idEmpleado),
    repo.contarCuposOcupados(idTurno),
    turno.id_especialidad_requerida
      ? repo.tieneEspecialidad(idEmpleado, turno.id_especialidad_requerida)
      : Promise.resolve(true),
  ]);

  const resultado = validarAsignacion({ turno, empleado, asignaciones, permisos, tieneEspecialidad, cuposOcupados });
  if (!resultado.valido) return { ok: false, codigo: 409, motivos: resultado.motivos };

  const asignacion = await repo.crear({
    idTurno, idEmpleado, horas: duracionHoras(turno.hora_inicio, turno.hora_fin), origen,
  });
  return { ok: true, asignacion };
}

module.exports = { asignar };
