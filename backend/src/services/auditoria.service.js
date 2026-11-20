const repo = require('../repositories/auditoria.repository');

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

async function listar(query = {}) {
  const errores = [];
  const idUsuario = query.id_usuario ? Number(query.id_usuario) : undefined;
  const limiteRaw = query.limite ? Number(query.limite) : 100;

  if (idUsuario !== undefined && (!Number.isInteger(idUsuario) || idUsuario <= 0)) {
    errores.push('id_usuario debe ser un número entero positivo.');
  }
  if (query.desde && !FECHA_REGEX.test(query.desde)) {
    errores.push('desde debe tener el formato AAAA-MM-DD.');
  }
  if (query.hasta && !FECHA_REGEX.test(query.hasta)) {
    errores.push('hasta debe tener el formato AAAA-MM-DD.');
  }
  if (query.limite !== undefined && (!Number.isInteger(limiteRaw) || limiteRaw <= 0 || limiteRaw > 500)) {
    errores.push('limite debe ser un entero entre 1 y 500.');
  }

  if (errores.length) return { ok: false, codigo: 400, errores };

  const registros = await repo.listar({
    idUsuario,
    accion: query.accion ? String(query.accion).trim() : undefined,
    tabla: query.tabla ? String(query.tabla).trim() : undefined,
    desde: query.desde,
    hasta: query.hasta,
    limite: limiteRaw,
  });

  return { ok: true, registros };
}

module.exports = { listar };