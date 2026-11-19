const repo = require('../repositories/departamentos.repository');

function validarId(idRaw) {
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('El identificador del departamento no es válido.');
    err.statusCode = 400;
    throw err;
  }
  return id;
}

function normalizarEstado(estadoRaw, defecto = true) {
  if (typeof estadoRaw === 'boolean') return estadoRaw;
  if (estadoRaw === 'activo' || estadoRaw === 'true' || estadoRaw === 1) return true;
  if (estadoRaw === 'inactivo' || estadoRaw === 'false' || estadoRaw === 0) return false;
  return defecto;
}

function validarPayload(body, actual = null) {
  const errores = [];

  const nombre = body.nombre !== undefined ? String(body.nombre).trim() : actual?.nombre ?? '';
  const tipoArea =
    body.tipo_area !== undefined ? String(body.tipo_area).trim() : actual?.tipo_area ?? '';
  const ubicacion =
    body.ubicacion !== undefined ? String(body.ubicacion).trim() : actual?.ubicacion ?? '';

  const capDiaRaw =
    body.capacidad_minima_dia !== undefined
      ? Number(body.capacidad_minima_dia)
      : actual?.capacidad_minima_dia ?? 1;
  const capNocheRaw =
    body.capacidad_minima_noche !== undefined
      ? Number(body.capacidad_minima_noche)
      : actual?.capacidad_minima_noche ?? 1;

  const estado =
    body.estado !== undefined
      ? normalizarEstado(body.estado, true)
      : actual?.estado ?? true;

  if (!nombre) errores.push('El nombre del departamento es obligatorio.');
  if (!tipoArea) errores.push('El tipo de área es obligatorio.');
  if (!Number.isInteger(capDiaRaw) || capDiaRaw < 0) {
    errores.push('La capacidad mínima de día debe ser un entero mayor o igual a 0.');
  }
  if (!Number.isInteger(capNocheRaw) || capNocheRaw < 0) {
    errores.push('La capacidad mínima de noche debe ser un entero mayor o igual a 0.');
  }

  if (errores.length > 0) {
    const err = new Error(errores[0]);
    err.statusCode = 400;
    err.errores = errores;
    throw err;
  }

  return {
    nombre,
    tipo_area: tipoArea,
    ubicacion: ubicacion || null,
    capacidad_minima_dia: capDiaRaw,
    capacidad_minima_noche: capNocheRaw,
    estado,
  };
}

async function listar() {
  return repo.listarTodos();
}

async function crear(body) {
  const datos = validarPayload(body);
  return repo.crear(datos);
}

async function actualizar(idRaw, body) {
  const id = validarId(idRaw);
  const existente = await repo.buscarPorId(id);
  if (!existente) {
    const err = new Error('Departamento no encontrado.');
    err.statusCode = 404;
    throw err;
  }
  const datos = validarPayload(body, existente);
  return repo.actualizar(id, datos);
}

async function cambiarEstado(idRaw, body) {
  const id = validarId(idRaw);
  const existente = await repo.buscarPorId(id);
  if (!existente) {
    const err = new Error('Departamento no encontrado.');
    err.statusCode = 404;
    throw err;
  }
  const nuevoEstado =
    body && body.estado !== undefined
      ? normalizarEstado(body.estado, !existente.estado)
      : !existente.estado;
  return repo.cambiarEstado(id, nuevoEstado);
}

module.exports = {
  listar,
  crear,
  actualizar,
  cambiarEstado,
};