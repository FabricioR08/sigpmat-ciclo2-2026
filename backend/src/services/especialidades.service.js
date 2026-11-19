const repo = require('../repositories/especialidades.repository');

function validarId(idRaw) {
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('El identificador de la especialidad no es válido.');
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
  const descripcion =
    body.descripcion !== undefined
      ? String(body.descripcion).trim()
      : actual?.descripcion ?? '';
  const estado =
    body.estado !== undefined
      ? normalizarEstado(body.estado, true)
      : actual?.estado ?? true;

  if (!nombre) errores.push('El nombre de la especialidad es obligatorio.');

  if (errores.length > 0) {
    const err = new Error(errores[0]);
    err.statusCode = 400;
    err.errores = errores;
    throw err;
  }

  return {
    nombre,
    descripcion: descripcion || null,
    estado,
  };
}

async function listar() {
  return repo.listarTodas();
}

async function crear(body) {
  const datos = validarPayload(body);
  return repo.crear(datos);
}

async function actualizar(idRaw, body) {
  const id = validarId(idRaw);
  const existente = await repo.buscarPorId(id);
  if (!existente) {
    const err = new Error('Especialidad no encontrada.');
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
    const err = new Error('Especialidad no encontrada.');
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