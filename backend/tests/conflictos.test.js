const {
  duracionHoras,
  buscarConflictoHorario,
  inicioSemana,
  excedeHorasSemanales,
  empleadoAusente,
  validarAsignacion,
} = require('../src/services/conflictos.service');

const turno = (fecha, ini, fin, extra = {}) => ({
  fecha_turno: fecha, hora_inicio: ini, hora_fin: fin, horas_programadas: duracionHoras(ini, fin), ...extra,
});

describe('Duración de turnos', () => {
  test('turno diurno 06:00-14:00 dura 8 horas', () => {
    expect(duracionHoras('06:00', '14:00')).toBe(8);
  });
  test('turno nocturno 22:00-06:00 dura 8 horas (cruza la medianoche)', () => {
    expect(duracionHoras('22:00', '06:00')).toBe(8);
  });
});

describe('RF-06: conflicto de horario', () => {
  test('detecta traslape en el mismo día', () => {
    const existentes = [turno('2026-11-02', '06:00', '14:00')];
    const nuevo = turno('2026-11-02', '12:00', '20:00');
    expect(buscarConflictoHorario(nuevo, existentes)).not.toBeNull();
  });

  test('turnos consecutivos (14:00 fin y 14:00 inicio) NO son conflicto', () => {
    const existentes = [turno('2026-11-02', '06:00', '14:00')];
    const nuevo = turno('2026-11-02', '14:00', '22:00');
    expect(buscarConflictoHorario(nuevo, existentes)).toBeNull();
  });

  test('turno nocturno se traslapa con el turno de la madrugada siguiente', () => {
    const existentes = [turno('2026-11-02', '22:00', '06:00')];
    const nuevo = turno('2026-11-03', '04:00', '10:00');
    expect(buscarConflictoHorario(nuevo, existentes)).not.toBeNull();
  });

  test('turnos en días distintos no entran en conflicto', () => {
    const existentes = [turno('2026-11-02', '06:00', '14:00')];
    const nuevo = turno('2026-11-03', '06:00', '14:00');
    expect(buscarConflictoHorario(nuevo, existentes)).toBeNull();
  });
});

describe('RF-06: máximo de 48 horas semanales', () => {
  const semana = ['02', '03', '04', '05', '06'].map((d) => turno(`2026-11-${d}`, '06:00', '14:00')); // 40 h

  test('el lunes de la semana de 2026-11-04 es 2026-11-02', () => {
    expect(inicioSemana('2026-11-04')).toBe('2026-11-02');
    expect(inicioSemana('2026-11-08')).toBe('2026-11-02'); // domingo
  });

  test('40 h + 8 h = 48 h NO excede el máximo', () => {
    expect(excedeHorasSemanales(turno('2026-11-07', '06:00', '14:00'), semana)).toBe(false);
  });

  test('48 h + 8 h = 56 h SÍ excede el máximo', () => {
    const conSabado = [...semana, turno('2026-11-07', '06:00', '14:00')]; // 48 h
    expect(excedeHorasSemanales(turno('2026-11-08', '06:00', '14:00'), conSabado)).toBe(true);
  });

  test('las horas de otra semana no se cuentan', () => {
    expect(excedeHorasSemanales(turno('2026-11-09', '06:00', '14:00'), semana)).toBe(false);
  });
});

describe('RF-07: ausencias aprobadas', () => {
  const permisos = [{ fecha_inicio: '2026-11-10', fecha_fin: '2026-11-12' }];

  test('el empleado ausente no puede recibir turno en esas fechas', () => {
    expect(empleadoAusente(turno('2026-11-11', '06:00', '14:00'), permisos)).toBe(true);
  });
  test('fuera del rango de la ausencia sí puede', () => {
    expect(empleadoAusente(turno('2026-11-13', '06:00', '14:00'), permisos)).toBe(false);
  });
  test('un turno nocturno que termina dentro de la ausencia también se bloquea', () => {
    expect(empleadoAusente(turno('2026-11-09', '22:00', '06:00'), permisos)).toBe(true);
  });
});

describe('Validación completa de una asignación', () => {
  const base = {
    turno: { estado: 'abierto', cupos_requeridos: 2, id_especialidad_requerida: 1,
             fecha_turno: '2026-11-02', hora_inicio: '06:00', hora_fin: '14:00' },
    empleado: { estado_laboral: 'activo' },
    asignaciones: [],
    permisos: [],
    tieneEspecialidad: true,
    cuposOcupados: 0,
  };

  test('asignación válida cuando se cumplen todas las reglas', () => {
    expect(validarAsignacion(base)).toEqual({ valido: true, motivos: [] });
  });

  test('acumula todos los motivos de rechazo', () => {
    const r = validarAsignacion({
      ...base,
      empleado: { estado_laboral: 'suspendido' },
      tieneEspecialidad: false,
      asignaciones: [turno('2026-11-02', '08:00', '16:00')],
    });
    const codigos = r.motivos.map((m) => m.codigo);
    expect(r.valido).toBe(false);
    expect(codigos).toEqual(expect.arrayContaining(['EMPLEADO_NO_ACTIVO', 'SIN_ESPECIALIDAD', 'CONFLICTO_HORARIO']));
  });

  test('rechaza cuando el turno ya no tiene cupos', () => {
    const r = validarAsignacion({ ...base, cuposOcupados: 2 });
    expect(r.motivos.map((m) => m.codigo)).toContain('SIN_CUPOS');
  });
});
