const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-cpt';
const JWT_EXPIRES = '7d';

function sign(u) {
  return jwt.sign({ id: u.id, role: u.role || 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function toUserDTO(row) {
  return {
    id: row.id,
    email: row.email,
    nome: row.nome || null,
    telefone: row.telefone || null,
    endereco: row.endereco || null,
    role: row.role || 'user',
  };
}

async function register(req, res) {
  try {
    const { email, password, nome = null, telefone = null, endereco = null } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'E-mail e senha são obrigatórios' });

    const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rowCount > 0) return res.status(409).json({ message: 'E-mail já cadastrado' });

    const hash = await bcrypt.hash(password, 10);
    const ins = await query(
      `INSERT INTO users (email, senha_hash, nome, telefone, endereco, role)
       VALUES ($1,$2,$3,$4,$5,'user')
       RETURNING id,email,nome,telefone,endereco,role`,
      [email, hash, nome, telefone, endereco]
    );

    const user = toUserDTO(ins.rows[0]);
    const token = sign(user);
    return res.json({ token, user });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ message: 'Erro ao registrar' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'E-mail e senha são obrigatórios' });

    const sel = await query('SELECT id,email,senha_hash,nome,telefone,endereco,role FROM users WHERE email = $1', [email]);
    if (sel.rowCount === 0) return res.status(401).json({ message: 'Credenciais inválidas' });

    const row = sel.rows[0];
    const ok = await bcrypt.compare(password, row.senha_hash);
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas' });

    const user = toUserDTO(row);
    const token = sign(user);
    return res.json({ token, user });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Erro ao entrar' });
  }
}

async function getMe(req, res) {
  try {
    const u = await query('SELECT id,email,nome,telefone,endereco,role FROM users WHERE id = $1', [req.user.id]);
    if (u.rowCount === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
    return res.json(toUserDTO(u.rows[0]));
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ message: 'Erro ao carregar perfil' });
  }
}

async function updateMe(req, res) {
  try {
    const { nome = null, telefone = null, endereco = null } = req.body || {};
    const up = await query(
      `UPDATE users SET
         nome = COALESCE($2, nome),
         telefone = COALESCE($3, telefone),
         endereco = COALESCE($4, endereco)
       WHERE id = $1
       RETURNING id,email,nome,telefone,endereco,role`,
      [req.user.id, nome, telefone, endereco]
    );
    if (up.rowCount === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
    return res.json(toUserDTO(up.rows[0]));
  } catch (err) {
    console.error('updateMe error:', err);
    return res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
}

async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password) return res.status(400).json({ message: 'Preencher as senhas' });

    const sel = await query('SELECT senha_hash FROM users WHERE id = $1', [req.user.id]);
    if (sel.rowCount === 0) return res.status(404).json({ message: 'Usuário não encontrado' });

    const ok = await bcrypt.compare(current_password, sel.rows[0].senha_hash);
    if (!ok) return res.status(401).json({ message: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET senha_hash = $2 WHERE id = $1', [req.user.id, hash]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('changePassword error:', err);
    return res.status(500).json({ message: 'Erro ao alterar senha' });
  }
}

async function deleteMe(req, res) {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.user.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('deleteMe error:', err);
    return res.status(500).json({ message: 'Erro ao remover conta' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  deleteMe,
};
