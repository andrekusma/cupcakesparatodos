const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer (.+)$/i);
  if (!m) return res.status(401).json({ message: 'Não autenticado' });
  try {
    const payload = jwt.verify(m[1], process.env.JWT_SECRET);
    req.user = { id: payload.id, email: payload.email, is_admin: !!payload.is_admin };
    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.is_admin) return next();
  return res.status(403).json({ message: 'Acesso restrito' });
}

module.exports = { authRequired, requireAdmin };
