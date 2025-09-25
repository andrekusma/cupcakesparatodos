const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function toUserResponse(row) {
  const role = row.role || 'customer';
  return {
    id: row.id,
    email: row.email,
    role,
    isAdmin: role === 'admin'
  };
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Informe email e password' });
    }

    const exists = await query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [email]);
    if (exists.rows.length) return res.status(409).json({ message: 'E-mail já cadastrado' });

    const hash = await bcrypt.hash(password, 10);

    const insert = await query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [email, hash, 'customer']
    );

    const user = insert.rows[0];
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(201).json({ token, user: toUserResponse(user) });
  } catch (e) {
    return res.status(500).json({ message: 'Erro ao registrar' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Informe email e password' });
    }

    const sel = await query(
      `SELECT id, email, password_hash, role
         FROM users
        WHERE email = $1
        LIMIT 1`,
      [email]
    );
    if (!sel.rows.length) return res.status(401).json({ message: 'Credenciais inválidas' });

    const row = sel.rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas' });

    const token = jwt.sign({ sub: row.id, role: row.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ token, user: toUserResponse(row) });
  } catch (e) {
    return res.status(500).json({ message: 'Erro ao autenticar' });
  }
}

module.exports = { register, login };
