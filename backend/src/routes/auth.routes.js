const router = require('express').Router();
const auth = require('../services/auth.service');

// RF-01: POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { usuario, clave } = req.body || {};
    if (!usuario || !clave) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
    }
    const r = await auth.iniciarSesion(usuario, clave, req.ip);
    if (!r.ok) return res.status(r.codigo).json({ error: r.error });
    return res.json({ token: r.token, usuario: r.usuario });
  } catch (e) { return next(e); }
});

module.exports = router;
