const repo = require('../repositories/disponibilidades.repository');
const empleadosRepo = require('../repositories/empleados.repository');
const asignacionesRepo = require('../repositories/asignaciones.repository');

const DIAS_VALIDOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const TIPOS_VALIDOS = ['disponible', 'no disponible', 'preferente'];
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function validarPayload(datos, { requiereEmpleado = true } = {}) {
  const errores = [];

  if (requiereEmpleado) {
    const idEmp = Number(datos.id_empleado);
    if (!Number.isInteger(idEmp) || idEmp <= 0) {
      errores.push('id_empleado debe ser un número entero positivo.');
    }
  }

  if (!DIAS_VALIDOS.includes(datos.dia_semana)) {
    errores.push(`dia_semana debe ser uno de: ${DIAS_VALIDOS.join(', ')}.`);
  }

  if (!HORA_REGEX.test(String(datos.hora_inicio || ''))) {
    errores.push('hora_inicio debe tener formato HH:MM (24 horas).');
  }

  if (!HORA_REGEX.test(String(datos.hora_fin || ''))) {
    errores.push('hora_fin debe tener formato HH:MM (24 horas).');
  }

  if (
    HORA_REGEX.test(String(datos.hora_inicio || '')) &&
    HORA_REGEX.test(String(datos.hora_fin || '')) &&
    datos.hora_inicio === datos.hora_fin
  ) {
    errores.push('hora_inicio y hora_fin no pueden ser iguales.');
  }

  if (!TIPOS_VALIDOS.includes(datos.tipo_disponibilidad)) {
    errores.push(`tipo_disponibilidad debe ser uno de: ${TIPOS_VALIDOS.join(', ')}.`);
  }

  return errores;
}

async function resolverEmpleadoDeUsuario(usuario) {
  return asignacionesRepo.empleadoDeUsuario(usuario.id);
}

async function listar(query, usuario) {
  const errores = [];
  let idEmpleado = query.id_empleado ? Number(query.id_empleado) : undefined;

  if (idEmpleado !== undefined && (!Number.isInteger(idEmpleado) || idEmpleado <= 0)) {
    errores.push('id_empleado debe ser un número entero positivo.');
  }
  if (query.dia_semana && !DIAS_VALIDOS.includes(query.dia_semana)) {
    errores.push(`dia_semana debe ser uno de: ${DIAS_VALIDOS.join(', ')}.`);
  }
  if (query.tipo_disponibilidad && !TIPOS_VALIDOS.includes(query.tipo_disponibilidad)) {
    errores.push(`tipo_disponibilidad debe ser uno de: ${TIPOS_VALIDOS.join(', ')}.`);
  }
  if (errores.length) return { ok: false, codigo: 400, errores };

  // Si es personal médico, solo consulta su propia disponibilidad
  if (usuario.rol === 'personal médico') {
    const propio = await resolverEmpleadoDeUsuario(usuario);
    if (!propio) {
      return { ok: false, codigo: 404, errores: ['Su usuario no está vinculado a un empleado.'] };
    }
    idEmpleado = propio;
  }

  const registros = await repo.listar({
    idEmpleado,
    diaSemana: query.dia_semana,
    tipoDisponibilidad: query.tipo_disponibilidad,
  });

  return { ok: true, disponibilidades: registros };
}

async function crear(body, usuario) {
  let idEmpleado = body.id_empleado !== undefined ? Number(body.id_empleado) : undefined;

  if (usuario.rol === 'personal médico') {
    const propio = await resolverEmpleadoDeUsuario(usuario);
    if (!propio) {
      return { ok: false, codigo: 404, errores: ['Su usuario no está vinculado a un empleado.'] };
    }
    idEmpleado = propio;
  }

  const errores = validarPayload({ ...body, id_empleado: idEmpleado }, { requiereEmpleado: true });
  if (errores.length) return { ok: false, codigo: 400, errores };

  const empleado = await empleadosRepo.obtenerPorId(idEmpleado);
  if (!empleado) {
    return { ok: false, codigo: 404, errores: ['El empleado especificado no existe.'] };
  }

  // Evita franjas idénticas duplicadas para el mismo empleado y día
  const existentes = await repo.listar({ idEmpleado, diaSemana: body.dia_semana });
  const duplicada = existentes.some(
    (d) => d.hora_inicio === body.hora_inicio && d.hora_fin === body.hora_fin
  );
  if (duplicada) {
    return {
      ok: false,
      codigo: 409,
      errores: ['Ya existe una franja con ese mismo día y horario para este empleado.'],
    };
  }

  const creada = await repo.crear({
    idEmpleado,
    diaSemana: body.dia_semana,
    horaInicio: body.hora_inicio,
    horaFin: body.hora_fin,
    tipoDisponibilidad: body.tipo_disponibilidad,
  });

  return { ok: true, disponibilidad: creada };
}

async function actualizar(id, body, usuario) {
  const actual = await repo.obtenerPorId(id);
  if (!actual) {
    return { ok: false, codigo: 404, errores: ['El registro de disponibilidad no existe.'] };
  }

  if (usuario.rol === 'personal médico') {
    const propio = await resolverEmpleadoDeUsuario(usuario);
    if (!propio || propio !== actual.id_empleado) {
      return { ok: false, codigo: 403, errores: ['Solo puede modificar su propia disponibilidad.'] };
    }
  }

  const errores = validarPayload(body, { requiereEmpleado: false });
  if (errores.length) return { ok: false, codigo: 400, errores };

  const existentes = await repo.listar({
    idEmpleado: actual.id_empleado,
    diaSemana: body.dia_semana,
  });
  const duplicada = existentes.some(
    (d) =>
      d.id_disponibilidad !== id &&
      d.hora_inicio === body.hora_inicio &&
      d.hora_fin === body.hora_fin
  );
  if (duplicada) {
    return {
      ok: false,
      codigo: 409,
      errores: ['Ya existe otra franja con ese mismo día y horario para este empleado.'],
    };
  }

  const actualizada = await repo.actualizar(id, {
    diaSemana: body.dia_semana,
    horaInicio: body.hora_inicio,
    horaFin: body.hora_fin,
    tipoDisponibilidad: body.tipo_disponibilidad,
  });

  return { ok: true, disponibilidad: actualizada };
}

async function eliminar(id, usuario) {
  const actual = await repo.obtenerPorId(id);
  if (!actual) {
    return { ok: false, codigo: 404, errores: ['El registro de disponibilidad no existe.'] };
  }

  if (usuario.rol === 'personal médico') {
    const propio = await resolverEmpleadoDeUsuario(usuario);
    if (!propio || propio !== actual.id_empleado) {
      return { ok: false, codigo: 403, errores: ['Solo puede eliminar su propia disponibilidad.'] };
    }
  }

  await repo.eliminar(id);
  return { ok: true };
}

module.exports = {
  DIAS_VALIDOS,
  TIPOS_VALIDOS,
  listar,
  crear,
  actualizar,
  eliminar,
};