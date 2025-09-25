const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function userToResponse(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role || (u.is_admin ? 'admin' : 'user'),
    isAdmin: !!(u.role === 'admin' || u.is_admin === true)
  };
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Informe name, email e password' });
    }

    const exists = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (exists.rows.length) return res.status(409).json({ message: 'E-mail já cadastrado' });

    const hash = await bcrypt.hash(password, 10);
    const insert = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, email, role`,
      [name, email, hash, 'user']
    );

    const user = insert.rows[0];
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.status(201).json({ token, user: userToResponse(user) });
  } catch {
    return res.status(500).json({ message: 'Erro ao registrar' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Informe email e password' });
    }

    const q = await query(
      `SELECT id, name, email, password_hash, role,
              CASE WHEN role='admin' THEN true ELSE false END AS is_admin
         FROM users
        WHERE email = $1
        LIMIT 1`,
      [email]
    );
    if (!q.rows.length) return res.status(401).json({ message: 'Credenciais inválidas' });

    const row = q.rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas' });

    const token = jwt.sign({ sub: row.id, role: row.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ token, user: userToResponse(row) });
  } catch {
    return res.status(500).json({ message: 'Erro ao autenticar' });
  }
}

module.exports = { register, login };
