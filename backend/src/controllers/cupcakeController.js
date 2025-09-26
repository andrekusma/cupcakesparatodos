const { query } = require('../config/db');

// Colunas esperadas na tabela: id, nome, descricao, preco_cents, image_url, estoque, created_at
async function listCupcakes(_req, res) {
  try {
    const sql = `
      SELECT id, nome, descricao, preco_cents, image_url, estoque
      FROM cupcakes
      ORDER BY id DESC
    `;
    const { rows } = await query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Erro listCupcakes:', err);
    res.status(500).json({ message: 'Erro ao listar cupcakes' });
  }
}

module.exports = { listCupcakes };
