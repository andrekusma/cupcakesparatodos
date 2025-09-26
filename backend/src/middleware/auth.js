const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-cpt';

function authRequired(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Não autenticado' });

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id, role: payload.role || 'user' };
    next();
  } catch {
    return res.status(401).json({ message: 'Sessão inválida' });
  }
}

module.exports = { authRequired };
