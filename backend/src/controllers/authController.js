const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

function pickUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    nome: row.nome || null,
    telefone: row.telefone || null,
    endereco_logradouro: row.endereco_logradouro || null,
    endereco_numero: row.endereco_numero || null,
    endereco_bairro: row.endereco_bairro || null,
    endereco_cidade: row.endereco_cidade || null,
    endereco_uf: row.endereco_uf || null,
    endereco_cep: row.endereco_cep || null,
    is_admin: !!row.is_admin
  };
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET ausente');
  return jwt.sign(
    { id: user.id, email: user.email, is_admin: !!user.is_admin },
    secret,
    { expiresIn: '8h' }
  );
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Informe e-mail e senha' });
  try {
    const { rows } = await query('SELECT * FROM users WHERE email=$1 LIMIT 1', [email]);
    const u = rows[0];
    if (!u) return res.status(401).json({ message: 'Usuário ou senha inválidos' });
    const ok = await bcrypt.compare(password, u.senha);
    if (!ok) return res.status(401).json({ message: 'Usuário ou senha inválidos' });
    const token = signToken(u);
    return res.json({ token, user: pickUserRow(u) });
  } catch (e) {
    return res.status(500).json({ message: 'Erro no login' });
  }
}

async function register(req, res) {
  const { email, password, nome } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Dados insuficientes' });
  try {
    const exists = await query('SELECT 1 FROM users WHERE email=$1 LIMIT 1', [email]);
    if (exists.rowCount) return res.status(409).json({ message: 'E-mail já cadastrado' });
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (email, senha, nome, is_admin)
       VALUES ($1,$2,$3,false)
       RETURNING *`,
      [email, hash, nome || null]
    );
    const u = rows[0];
    const token = signToken(u);
    return res.status(201).json({ token, user: pickUserRow(u) });
  } catch {
    return res.status(500).json({ message: 'Erro ao cadastrar' });
  }
}

async function getMe(req, res) {
  try {
    const { rows } = await query('SELECT * FROM users WHERE id=$1 LIMIT 1', [req.user.id]);
    const u = rows[0];
    if (!u) return res.status(404).json({ message: 'Não encontrado' });
    return res.json(pickUserRow(u));
  } catch {
    return res.status(500).json({ message: 'Erro ao carregar perfil' });
  }
}

async function updateMe(req, res) {
  const b = req.body || {};
  try {
    const { rows } = await query(
      `UPDATE users SET
         nome = COALESCE($2,nome),
         telefone = COALESCE($3,telefone),
         endereco_logradouro = COALESCE($4,endereco_logradouro),
         endereco_numero = COALESCE($5,endereco_numero),
         endereco_bairro = COALESCE($6,endereco_bairro),
         endereco_cidade = COALESCE($7,endereco_cidade),
         endereco_uf = COALESCE($8,endereco_uf),
         endereco_cep = COALESCE($9,endereco_cep)
       WHERE id = $1
       RETURNING *`,
      [
        req.user.id,
        b.nome ?? null,
        b.telefone ?? null,
        b.endereco_logradouro ?? null,
        b.endereco_numero ?? null,
        b.endereco_bairro ?? null,
        b.endereco_cidade ?? null,
        b.endereco_uf ?? null,
        b.endereco_cep ?? null
      ]
    );
    const u = rows[0];
    return res.json(pickUserRow(u));
  } catch {
    return res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
}

module.exports = { login, register, getMe, updateMe };
