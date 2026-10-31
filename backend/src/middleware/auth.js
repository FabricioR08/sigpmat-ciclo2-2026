const jwt = require('jsonwebtoken');

// Verifica el token JWT del encabezado "Authorization: Bearer <token>"
function autenticar(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const [tipo, token] = encabezado.split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token requerido.' });
  }
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

// Permite el paso solo a los roles indicados (RF-02)
function requerirRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tiene permisos para esta operación.' });
    }
    return next();
  };
}

module.exports = { autenticar, requerirRol };
