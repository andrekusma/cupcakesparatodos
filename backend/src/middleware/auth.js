import jwt from 'jsonwebtoken';

export function withAuth(req, res, next){
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if(!token) return res.status(401).json({ message:'Token ausente' });
  try{
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  }catch(e){
    return res.status(401).json({ message:'Token inválido' });
  }
}

export function requireRole(role){
  return (req, res, next) => {
    if(!req.user) return res.status(401).json({ message:'Não autenticado' });
    if(req.user.role !== role) return res.status(403).json({ message:'Proibido' });
    next();
  };
}
