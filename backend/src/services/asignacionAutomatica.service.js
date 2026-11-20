const repo = require('../repositories/asignaciones.repository');
const empleadosRepo = require('../repositories/empleados.repository');
const { validarAsignacion, duracionHoras } = require('./conflictos.service');
const asignacionesService = require('./asignaciones.service');
const { obtenerEstrategia } = require('./strategies/asignacionStrategy.factory');

/**
 * Propone y/o aplica asignaciones automáticas para un turno usando Strategy + conflictos.service.
 * @param {object} params
 * @param {number} params.idTurno
 * @param {string} [params.estrategia='menor_carga']
 * @param {boolean} [params.aplicar=false]
 */
async function ejecutarAsignacionAutomatica({ idTurno, estrategia = 'menor_carga', aplicar = false }) {
  const turno = await repo.obtenerTurno(idTurno);
  if (!turno) {
    return {
      ok: false,
      codigo: 404,
      errores: ['El turno no existe.'],
    };
  }

  const estrategiaInstancia = obtenerEstrategia(estrategia);

  // Obtiene empleados activos (con margen amplio para evaluar elegibilidad completa)
  const { empleados } = await empleadosRepo.listar({
    estado: 'activo',
    limite: 500,
    desplazamiento: 0,
  });

  const cuposActuales = await repo.contarCuposOcupados(idTurno);
  const cuposDisponibles = Math.max(0, Number(turno.cupos_requeridos) - Number(cuposActuales));
  const horasTurno = duracionHoras(turno.hora_inicio, turno.hora_fin);

  // Recolecta datos necesarios para validar cada candidato con conflictos.service.js
  const candidatosConContexto = await Promise.all(
    empleados.map(async (emp) => {
      const [asignacionesVigentes, permisos, tieneEspecialidad] = await Promise.all([
        repo.asignacionesVigentes(emp.id_empleado),
        repo.permisosAprobados(emp.id_empleado),
        turno.id_especialidad_requerida
          ? repo.tieneEspecialidad(emp.id_empleado, turno.id_especialidad_requerida)
          : Promise.resolve(true),
      ]);

      return {
        empleado: emp,
        asignacionesVigentes,
        permisos,
        tieneEspecialidad,
      };
    })
  );

  // Ordena por estrategia (menor carga horaria semanal)
  const ordenados = estrategiaInstancia.ordenar({
    turno,
    candidatos: candidatosConContexto,
  });

  const elegibles = [];
  const descartados = [];

  for (const item of ordenados) {
    const validacion = validarAsignacion({
      turno,
      empleado: item.empleado,
      asignaciones: item.asignacionesVigentes,
      permisos: item.permisos,
      tieneEspecialidad: item.tieneEspecialidad,
      cuposOcupados: cuposActuales + elegibles.length,
    });

    if (validacion.valido) {
      elegibles.push({
        id_empleado: item.empleado.id_empleado,
        codigo_empleado: item.empleado.codigo_empleado,
        nombre_completo: `${item.empleado.nombres} ${item.empleado.apellidos}`,
        tipo_empleado: item.empleado.tipo_empleado,
        horas_semanales_actuales: item.horasSemanales,
        horas_turno: horasTurno,
        horas_semanales_proyectadas: item.horasSemanales + horasTurno,
      });
    } else {
      descartados.push({
        id_empleado: item.empleado.id_empleado,
        codigo_empleado: item.empleado.codigo_empleado,
        nombre_completo: `${item.empleado.nombres} ${item.empleado.apellidos}`,
        horas_semanales_actuales: item.horasSemanales,
        motivos: validacion.motivos,
      });
    }
  }

  const seleccionados = elegibles.slice(0, cuposDisponibles);
  const asignacionesCreadas = [];
  const fallosAlAplicar = [];

  if (aplicar && seleccionados.length > 0) {
    for (const candidato of seleccionados) {
      const res = await asignacionesService.asignar({
        idTurno,
        idEmpleado: candidato.id_empleado,
        origen: 'automática',
      });
      if (res.ok) {
        asignacionesCreadas.push(res.asignacion);
      } else {
        fallosAlAplicar.push({
          id_empleado: candidato.id_empleado,
          motivos: res.motivos,
        });
      }
    }
  }

  return {
    ok: true,
    turno: {
      id_turno: turno.id_turno,
      nombre_turno: turno.nombre_turno,
      fecha_turno: turno.fecha_turno,
      hora_inicio: turno.hora_inicio,
      hora_fin: turno.hora_fin,
      cupos_requeridos: turno.cupos_requeridos,
      cupos_ocupados_previos: cuposActuales,
      cupos_disponibles: cuposDisponibles,
      estado: turno.estado,
    },
    estrategia: estrategiaInstancia.nombre,
    aplicado: Boolean(aplicar),
    propuestos: seleccionados,
    elegibles_adicionales: elegibles.slice(cuposDisponibles),
    descartados,
    asignaciones_creadas: asignacionesCreadas,
    fallos_al_aplicar: fallosAlAplicar,
  };
}

module.exports = { ejecutarAsignacionAutomatica };