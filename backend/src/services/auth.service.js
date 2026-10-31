const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarios = require('../repositories/usuarios.repository');
const auditoria = require('../repositories/auditoria.repository');

// RF-01: bloqueo temporal tras 5 intentos fallidos durante 15 minutos
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;
const intentos = new Map(); // usuario -> { cuenta, hasta }

function estaBloqueado(clave) {
  const r = intentos.get(clave);
  if (!r || !r.hasta) return false;
  if (Date.now() > r.hasta) { intentos.delete(clave); return false; }
  return true;
}

function registrarFallo(clave) {
  const r = intentos.get(clave) || { cuenta: 0, hasta: null };
  r.cuenta += 1;
  if (r.cuenta >= MAX_INTENTOS) r.hasta = Date.now() + BLOQUEO_MS;
  intentos.set(clave, r);
  return r.cuenta >= MAX_INTENTOS;
}

async function iniciarSesion(identificador, clave, ip) {
  const llave = String(identificador).toLowerCase();

  if (estaBloqueado(llave)) {
    return { ok: false, codigo: 423, error: 'Cuenta bloqueada temporalmente. Intente de nuevo en 15 minutos.' };
  }

  const usuario = await usuarios.buscarPorUsuarioOCorreo(identificador);
  const claveValida = usuario ? await bcrypt.compare(clave, usuario.clave_hash) : false;

  // Mensaje genérico: no revela cual de los dos datos fallo
  if (!usuario || !claveValida) {
    const seBloqueo = registrarFallo(llave);
    if (usuario) {
      await auditoria.registrar({
        idUsuario: usuario.id_usuario, accion: seBloqueo ? 'bloqueo_temporal' : 'login_fallido',
        tabla: 'usuarios', registro: usuario.id_usuario, ip,
      });
    }
    return { ok: false, codigo: 401, error: 'Credenciales invalidas.' };
  }

  if (usuario.estado !== 'activo') {
    return { ok: false, codigo: 403, error: 'La cuenta está inactiva o bloqueada. Contacte al administrador.' };
  }

  intentos.delete(llave);
  await usuarios.actualizarUltimoAcceso(usuario.id_usuario);
  await auditoria.registrar({
    idUsuario: usuario.id_usuario, accion: 'login', tabla: 'usuarios', registro: usuario.id_usuario, ip,
  });

  const token = jwt.sign(
    { id: usuario.id_usuario, usuario: usuario.usuario, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
  return { ok: true, token, usuario: { id: usuario.id_usuario, usuario: usuario.usuario, rol: usuario.rol } };
}

module.exports = { iniciarSesion };
