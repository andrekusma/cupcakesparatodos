const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Token ausente' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role || payload.isAdmin ? 'admin' : 'user' };
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Não autenticado' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso negado' });
  next();
}

module.exports = { requireAuth, requireAdmin };
