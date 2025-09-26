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

/**
 * Tenta buscar o usuário por e-mail em até 3 “formatos” de esquema:
 * A) senha_hash + role
 * B) password_hash + role
 * C) senha_hash/password_hash + is_admin (boolean) -> role derivada
 */
async function selectUserByEmail(email) {
  // A) Esquema “oficial” do projeto
  try {
    const r = await query(
      `SELECT id,email,senha_hash AS pass_hash,nome,telefone,endereco,
              COALESCE(role, 'user') AS role
         FROM users
        WHERE email = $1`,
      [email]
    );
    if (r.rowCount > 0) return r.rows[0];
  } catch (e) {
    // 42703 = undefined_column -> tenta próximo formato
    if (e && e.code !== '42703') throw e;
  }

  // B) password_hash + role
  try {
    const r = await query(
      `SELECT id,email,password_hash AS pass_hash,nome,telefone,endereco,
              COALESCE(role, 'user') AS role
         FROM users
        WHERE email = $1`,
      [email]
    );
    if (r.rowCount > 0) return r.rows[0];
  } catch (e) {
    if (e && e.code !== '42703') throw e;
  }

  // C) is_admin (boolean) com senha_hash OU password_hash
  // Primeiro tenta senha_hash
  try {
    const r = await query(
      `SELECT id,email,senha_hash AS pass_hash,nome,telefone,endereco,
              CASE WHEN is_admin THEN 'admin' ELSE 'user' END AS role
         FROM users
        WHERE email = $1`,
      [email]
    );
    if (r.rowCount > 0) return r.rows[0];
  } catch (e) {
    if (e && e.code !== '42703') throw e;
  }

  // Depois tenta password_hash com is_admin
  try {
    const r = await query(
      `SELECT id,email,password_hash AS pass_hash,nome,telefone,endereco,
              CASE WHEN is_admin THEN 'admin' ELSE 'user' END AS role
         FROM users
        WHERE email = $1`,
      [email]
    );
    if (r.rowCount > 0) return r.rows[0];
  } catch (e) {
    if (e && e.code !== '42703') throw e;
  }

  // Não achou em nenhum formato
  return null;
}

async function register(req, res) {
  try {
    const { email, password, nome = null, telefone = null, endereco = null } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'E-mail e senha são obrigatórios' });

    const exists = await query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (exists.rowCount > 0) return res.status(409).json({ message: 'E-mail já cadastrado' });

    const hash = await bcrypt.hash(password, 10);

    // Tenta inserir no formato padrão (senha_hash)
    let inserted;
    try {
      const ins = await query(
        `INSERT INTO users (email, senha_hash, nome, telefone, endereco, role)
         VALUES ($1,$2,$3,$4,$5,'user')
         RETURNING id,email,nome,telefone,endereco,role`,
        [email, hash, nome, telefone, endereco]
      );
      inserted = ins.rows[0];
    } catch (e) {
      if (e && e.code !== '42703') throw e;
      // Fallback: password_hash
      const ins2 = await query(
        `INSERT INTO users (email, password_hash, nome, telefone, endereco, role)
         VALUES ($1,$2,$3,$4,$5,'user')
         RETURNING id,email,nome,telefone,endereco,role`,
        [email, hash, nome, telefone, endereco]
      );
      inserted = ins2.rows[0];
    }

    const user = toUserDTO(inserted);
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

    const row = await selectUserByEmail(email);
    if (!row) return res.status(401).json({ message: 'Credenciais inválidas' });

    if (!row.pass_hash) {
      console.error('login error: coluna de hash de senha não encontrada para este usuário');
      return res.status(500).json({ message: 'Configuração de senha inválida' });
    }

    const ok = await bcrypt.compare(password, row.pass_hash);
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
    // Busca compatível com role ou is_admin
    let u;
    try {
      const r = await query(
        `SELECT id,email,nome,telefone,endereco,COALESCE(role,'user') AS role
           FROM users WHERE id = $1`,
        [req.user.id]
      );
      u = r.rows[0];
    } catch (e) {
      if (e && e.code !== '42703') throw e;
      const r2 = await query(
        `SELECT id,email,nome,telefone,endereco,
                CASE WHEN is_admin THEN 'admin' ELSE 'user' END AS role
           FROM users WHERE id = $1`,
        [req.user.id]
      );
      u = r2.rows[0];
    }

    if (!u) return res.status(404).json({ message: 'Usuário não encontrado' });
    return res.json(toUserDTO(u));
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
       RETURNING id,email,nome,telefone,endereco`,
      [req.user.id, nome, telefone, endereco]
    );

    // Role pode estar em role ou is_admin; monta ao final
    let roleValue = 'user';
    try {
      const rRole = await query(`SELECT COALESCE(role,'user') AS role FROM users WHERE id = $1`, [req.user.id]);
      if (rRole.rowCount > 0) roleValue = rRole.rows[0].role || 'user';
    } catch (e) {
      if (e && e.code === '42703') {
        const rRole2 = await query(
          `SELECT CASE WHEN is_admin THEN 'admin' ELSE 'user' END AS role FROM users WHERE id = $1`,
          [req.user.id]
        );
        if (rRole2.rowCount > 0) roleValue = rRole2.rows[0].role || 'user';
      } else {
        throw e;
      }
    }

    const row = up.rows[0];
    return res.json(toUserDTO({ ...row, role: roleValue }));
  } catch (err) {
    console.error('updateMe error:', err);
    return res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
}

async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password) return res.status(400).json({ message: 'Preencher as senhas' });

    // Tenta senha_hash primeiro, depois password_hash
    let passRow, useCol = 'senha_hash';
    try {
      const r = await query('SELECT senha_hash FROM users WHERE id = $1', [req.user.id]);
      if (r.rowCount > 0) passRow = r.rows[0];
    } catch (e) {
      if (e && e.code !== '42703') throw e;
    }
    if (!passRow) {
      useCol = 'password_hash';
      const r2 = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      if (r2.rowCount > 0) passRow = r2.rows[0];
    }
    if (!passRow) return res.status(500).json({ message: 'Configuração de senha inválida' });

    const ok = await bcrypt.compare(current_password, passRow[useCol]);
    if (!ok) return res.status(401).json({ message: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(new_password, 10);
    await query(`UPDATE users SET ${useCol} = $2 WHERE id = $1`, [req.user.id, hash]);
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
