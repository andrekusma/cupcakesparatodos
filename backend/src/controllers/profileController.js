const { query } = require('../config/db');

async function getMe(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Não autenticado' });

  try {
    const db = await query(
      `SELECT id, email, role, nome, telefone, endereco
         FROM users
        WHERE id = $1`,
      [userId]
    );
    if (db.rowCount === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
    return res.json(db.rows[0]);
  } catch {
    return res.status(500).json({ message: 'Erro ao carregar perfil' });
  }
}

async function updateMe(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Não autenticado' });

  const { nome, telefone, endereco } = req.body || {};
  try {
    const upd = await query(
      `UPDATE users
          SET nome = $1,
              telefone = $2,
              endereco = $3
        WHERE id = $4
      RETURNING id, email, role, nome, telefone, endereco`,
      [nome || null, telefone || null, endereco || null, userId]
    );
    return res.json(upd.rows[0]);
  } catch {
    return res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
}

/**
 * Remoção segura da conta:
 * - Anonimizar e desativar a conta mantendo integridade de pedidos vinculados.
 * - Alternativa a DELETE físico (que pode quebrar FKs em orders).
 */
async function deleteMe(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Não autenticado' });

  try {
    // Anonimizar dados e invalidar acesso
    const anonEmail = `deleted-${userId}-${Date.now()}@example.com`;
    await query(
      `UPDATE users
          SET email = $1,
              nome = NULL,
              telefone = NULL,
              endereco = NULL,
              role = 'deleted',
              password_hash = '$2a$10$invalidinvalidinvalidinvalidinva8S5kK' -- hash dummy inválido
        WHERE id = $2`,
      [anonEmail, userId]
    );

    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: 'Erro ao remover conta' });
  }
}

module.exports = { getMe, updateMe, deleteMe };
