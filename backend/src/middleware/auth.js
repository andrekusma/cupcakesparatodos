const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Não autenticado' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    req.user = { id: payload.id, role: payload.role || 'user' };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}

module.exports = { requireAuth };
