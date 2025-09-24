// backend/src/middleware/auth.js
import jwt from 'jsonwebtoken';

/**
 * Middleware para verificar se o usuário está autenticado.
 * Adiciona req.user se o token for válido.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

/**
 * Middleware para verificar se o usuário é administrador.
 * Exige que o requireAuth já tenha rodado antes.
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Não autenticado' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado: apenas administradores' });
  }
  next();
}