/**
 * Reglas de negocio para la asignacion de turnos (RF-06, RF-07).
 * Son funciones puras (no tocan la base de datos), por eso
 * podemos probar facilmente con pruebas unitarias.
 */
const MAX_HORAS_SEMANA = 48;

function aMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function sumarDias(fecha, dias) {
  const [y, m, d] = fecha.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}

/** El turno cruza la medianoche cuando la hora de fin es menor o igual a la de inicio (ej. 22:00-06:00). */
function cruzaMedianoche(horaInicio, horaFin) {
  return aMinutos(horaFin) <= aMinutos(horaInicio);
}

/** Convierte un turno en un intervalo absoluto (minutos desde 1970, UTC). */
function intervalo(fecha, horaInicio, horaFin) {
  const [y, m, d] = fecha.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d) / 60000;
  const inicio = base + aMinutos(horaInicio);
  let fin = base + aMinutos(horaFin);
  if (fin <= inicio) fin += 24 * 60;
  return { inicio, fin };
}

function duracionHoras(horaInicio, horaFin) {
  const { inicio, fin } = intervalo('2000-01-01', horaInicio, horaFin);
  return (fin - inicio) / 60;
}

/** Devuelve la primera asignacion existente que se traslapa con el turno nuevo, o null. */
function buscarConflictoHorario(nuevo, existentes) {
  const a = intervalo(nuevo.fecha_turno, nuevo.hora_inicio, nuevo.hora_fin);
  return (
    existentes.find((e) => {
      const b = intervalo(e.fecha_turno, e.hora_inicio, e.hora_fin);
      return a.inicio < b.fin && b.inicio < a.fin;
    }) || null
  );
}

/** Lunes de la semana a la que pertenece la fecha (formato YYYY-MM-DD). */
function inicioSemana(fecha) {
  const [y, m, d] = fecha.split('-').map(Number);
  const dia = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  const desdeLunes = (dia + 6) % 7;
  return sumarDias(fecha, -desdeLunes);
}

/** Suma las horas ya programadas en la misma semana (lunes a domingo) del turno nuevo. */
function horasEnSemana(fecha, existentes) {
  const semana = inicioSemana(fecha);
  return existentes
    .filter((e) => inicioSemana(e.fecha_turno) === semana)
    .reduce((total, e) => total + Number(e.horas_programadas), 0);
}

/** true si agregar el turno nuevo supera el maximo semanal (48 h). */
function excedeHorasSemanales(nuevo, existentes, max = MAX_HORAS_SEMANA) {
  const horasNuevo = duracionHoras(nuevo.hora_inicio, nuevo.hora_fin);
  return horasEnSemana(nuevo.fecha_turno, existentes) + horasNuevo > max;
}

/** true si el empleado tiene un permiso/vacacion/incapacidad aprobado que cubre el turno. */
function empleadoAusente(nuevo, permisosAprobados) {
  const dias = [nuevo.fecha_turno];
  if (cruzaMedianoche(nuevo.hora_inicio, nuevo.hora_fin)) {
    dias.push(sumarDias(nuevo.fecha_turno, 1));
  }
  return permisosAprobados.some((p) =>
    dias.some((dia) => p.fecha_inicio <= dia && dia <= p.fecha_fin)
  );
}

/**
 * Aplica todas las reglas y devuelve { valido, motivos }.
 * contexto: { turno, empleado, asignaciones, permisos, tieneEspecialidad, cuposOcupados }
 */
function validarAsignacion(contexto) {
  const { turno, empleado, asignaciones, permisos, tieneEspecialidad, cuposOcupados } = contexto;
  const motivos = [];

  if (turno.estado !== 'abierto') {
    motivos.push({ codigo: 'TURNO_NO_ABIERTO', mensaje: `El turno está ${turno.estado}.` });
  }
  if (cuposOcupados >= turno.cupos_requeridos) {
    motivos.push({ codigo: 'SIN_CUPOS', mensaje: 'El turno ya tiene todos sus cupos cubiertos.' });
  }
  if (empleado.estado_laboral !== 'activo') {
    motivos.push({ codigo: 'EMPLEADO_NO_ACTIVO', mensaje: `El empleado está ${empleado.estado_laboral}.` });
  }
  if (turno.id_especialidad_requerida && !tieneEspecialidad) {
    motivos.push({ codigo: 'SIN_ESPECIALIDAD', mensaje: 'El empleado no tiene la especialidad requerida.' });
  }
  if (empleadoAusente(turno, permisos)) {
    motivos.push({ codigo: 'AUSENCIA_APROBADA', mensaje: 'El empleado tiene una ausencia aprobada en esa fecha.' });
  }
  const choque = buscarConflictoHorario(turno, asignaciones);
  if (choque) {
    motivos.push({
      codigo: 'CONFLICTO_HORARIO',
      mensaje: `Se traslapa con otro turno el ${choque.fecha_turno} (${String(choque.hora_inicio).slice(0, 5)}-${String(choque.hora_fin).slice(0, 5)}).`,
    });
  }
  if (excedeHorasSemanales(turno, asignaciones)) {
    motivos.push({ codigo: 'EXCEDE_48H', mensaje: `Superaría el máximo de ${MAX_HORAS_SEMANA} horas semanales.` });
  }

  return { valido: motivos.length === 0, motivos };
}

module.exports = {
  MAX_HORAS_SEMANA,
  duracionHoras,
  buscarConflictoHorario,
  inicioSemana,
  horasEnSemana,
  excedeHorasSemanales,
  empleadoAusente,
  validarAsignacion,
};
