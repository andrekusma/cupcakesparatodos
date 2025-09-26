const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Não autenticado' });
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: p.id, email: p.email, is_admin: !!p.is_admin };
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Não autenticado' });
  if (!req.user.is_admin) return res.status(403).json({ message: 'Acesso negado' });
  next();
}

module.exports = { requireAuth, requireAdmin };
