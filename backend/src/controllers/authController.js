import { query } from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import jwt from 'jsonwebtoken';

export async function register(req, res, next) {
  try {
    console.log('📥 [REGISTER] Body recebido:', req.body); // <-- LOG NOVO

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Informe e-mail e senha' });
    const { rows: exist } = await query('SELECT id FROM users WHERE email=$1', [email]);
    if (exist.length) return res.status(409).json({ message: 'E-mail já cadastrado' });

    const password_hash = await hashPassword(password);
    const { rows } = await query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1,$2,$3) RETURNING id, email, role',
      [email, password_hash, 'customer']
    );

    const user = rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user });
  } catch (e) {
    next(e);
  }
}

export async function login(req, res, next) {
  try {
    console.log('📥 [LOGIN] Body recebido:', req.body); // <-- LOG NOVO

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Informe e-mail e senha' });

    const { rows } = await query('SELECT id, email, password_hash, role FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) {
    next(e);
  }
}