const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role || 'user' },
    process.env.JWT_SECRET || 'devsecret',
    { expiresIn: '7d' }
  );
}

async function register(req, res) {
  try {
    const { email, password, nome, telefone, endereco } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'E-mail e senha são obrigatórios' });
    }

    const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rowCount > 0) {
      return res.status(409).json({ message: 'E-mail já cadastrado' });
    }

    const hash = await bcrypt.hash(password, 10);
    const ins = await query(
      `INSERT INTO users (email, password_hash, role, nome, telefone, endereco)
       VALUES ($1,$2,'user',$3,$4,$5)
       RETURNING id, email, role, nome, telefone, endereco`,
      [email, hash, nome || null, telefone || null, endereco || null]
    );

    const user = ins.rows[0];
    const token = signToken(user);
    return res.status(201).json({ token, user });
  } catch {
    return res.status(500).json({ message: 'Erro ao cadastrar' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'E-mail e senha são obrigatórios' });
    }
    const db = await query(
      `SELECT id, email, password_hash, role, nome, telefone, endereco
         FROM users
        WHERE email = $1`,
      [email]
    );
    if (db.rowCount === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    const u = db.rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    const user = {
      id: u.id, email: u.email, role: u.role,
      nome: u.nome, telefone: u.telefone, endereco: u.endereco
    };
    const token = signToken(user);
    return res.json({ token, user });
  } catch {
    return res.status(500).json({ message: 'Erro no login' });
  }
}

async function changePassword(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Não autenticado' });

  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Campos obrigatórios: current_password, new_password' });
  }

  try {
    const db = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (db.rowCount === 0) return res.status(404).json({ message: 'Usuário não encontrado' });

    const ok = await bcrypt.compare(current_password, db.rows[0].password_hash);
    if (!ok) return res.status(401).json({ message: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);

    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: 'Erro ao alterar senha' });
  }
}

module.exports = { register, login, changePassword };
