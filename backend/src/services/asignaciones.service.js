const repo = require('../repositories/asignaciones.repository');
const empleados = require('../repositories/empleados.repository');
const { validarAsignacion, duracionHoras } = require('./conflictos.service');

const ESTADOS = ['programado', 'confirmado', 'cancelado', 'cambiado'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

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

// Valida los filtros del listado y consulta
async function listar(query) {
  const errores = [];
  const idTurno = query.id_turno ? Number(query.id_turno) : undefined;
  const idEmpleado = query.id_empleado ? Number(query.id_empleado) : undefined;
  if (idTurno !== undefined && !Number.isInteger(idTurno)) errores.push('id_turno debe ser un número entero.');
  if (idEmpleado !== undefined && !Number.isInteger(idEmpleado)) errores.push('id_empleado debe ser un número entero.');
  if (query.estado && !ESTADOS.includes(query.estado)) errores.push(`estado debe ser uno de: ${ESTADOS.join(', ')}.`);
  if (query.desde && !FECHA.test(query.desde)) errores.push('desde debe tener el formato AAAA-MM-DD.');
  if (query.hasta && !FECHA.test(query.hasta)) errores.push('hasta debe tener el formato AAAA-MM-DD.');
  if (errores.length) return { ok: false, errores };

  const asignaciones = await repo.listar({
    idTurno, idEmpleado, estado: query.estado, desde: query.desde, hasta: query.hasta,
  });
  return { ok: true, asignaciones };
}

// Horario del empleado vinculado al usuario que inicio sesión
async function misTurnos(idUsuario, query) {
  const idEmpleado = await repo.empleadoDeUsuario(idUsuario);
  if (!idEmpleado) return { ok: false, codigo: 404, errores: ['Su usuario no está vinculado a un empleado.'] };
  const r = await listar({ ...query, id_empleado: idEmpleado });
  return r.ok ? r : { ...r, codigo: 400 };
}

const TRANSICIONES = {
  cancelar: { desde: ['programado', 'confirmado'], hacia: 'cancelado' },
  confirmar: { desde: ['programado'], hacia: 'confirmado' },
};

// Confirmar o cancelar una asignacion
async function cambiarEstado(idAsignacion, accion) {
  const regla = TRANSICIONES[accion];
  const actual = await repo.obtener(idAsignacion);
  if (!actual) return { ok: false, codigo: 404, errores: ['La asignación no existe.'] };
  if (!regla.desde.includes(actual.estado_asignacion)) {
    return {
      ok: false,
      codigo: 409,
      errores: [`No se puede ${accion} una asignación en estado "${actual.estado_asignacion}".`],
    };
  }
  await repo.cambiarEstado(idAsignacion, actual.id_turno, regla.hacia);
  return { ok: true, asignacion: await repo.obtener(idAsignacion) };
}

module.exports = { asignar, listar, misTurnos, cambiarEstado };
