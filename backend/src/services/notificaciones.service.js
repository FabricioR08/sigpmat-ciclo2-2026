const repo = require('../repositories/notificaciones.repository');

async function listar(idUsuario, query = {}) {
  const soloNoLeidas =
    query.no_leidas === 'true' || query.no_leidas === true || query.leida === 'false';
  const limiteRaw = query.limite ? Number(query.limite) : 50;
  const limite = Number.isInteger(limiteRaw) && limiteRaw > 0 && limiteRaw <= 200 ? limiteRaw : 50;

  const notificaciones = await repo.listarPorUsuario(idUsuario, { soloNoLeidas, limite });
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  return { ok: true, notificaciones, noLeidas };
}

async function notificarUsuario({ idUsuario, titulo, mensaje }) {
  if (!idUsuario || !titulo || !mensaje) return null;
  return repo.crear({
    idUsuario,
    titulo: String(titulo).slice(0, 100),
    mensaje: String(mensaje).slice(0, 500),
  });
}

async function marcarLeida(idNotificacion, idUsuario) {
  const actualizada = await repo.marcarLeida(idNotificacion, idUsuario);
  if (!actualizada) {
    return { ok: false, codigo: 404, errores: ['Notificación no encontrada.'] };
  }
  return { ok: true, notificacion: actualizada };
}

async function marcarTodasLeidas(idUsuario) {
  const actualizadas = await repo.marcarTodasLeidas(idUsuario);
  return { ok: true, actualizadas };
}

module.exports = {
  listar,
  notificarUsuario,
  marcarLeida,
  marcarTodasLeidas,
};