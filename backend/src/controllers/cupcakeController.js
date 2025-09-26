const { query } = require('../config/db');

/**
 * GET /api/cupcakes
 */
async function listCupcakes(req, res) {
  try {
    const q = (req.query.q || '').trim();
    let sql = `
      SELECT id, nome, descricao, preco_cents, image_url, estoque
      FROM cupcakes
    `;
    const params = [];

    if (q) {
      sql += ` WHERE (unaccent(lower(nome)) LIKE unaccent(lower($1)) OR unaccent(lower(descricao)) LIKE unaccent(lower($1))) `;
      params.push(`%${q}%`);
    }

    sql += ` ORDER BY id DESC`;

    const { rows } = await query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('Erro listCupcakes:', err);
    return res.status(500).json({ message: 'Erro ao listar cupcakes' });
  }
}

/**
 * GET /api/cupcakes/:id
 * Retorna um cupcake específico
 */
async function getCupcakeById(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const { rows } = await query(
      `SELECT id, nome, descricao, preco_cents, image_url, estoque
       FROM cupcakes
       WHERE id = $1`,
      [id]
    );

    if (!rows[0]) return res.status(404).json({ message: 'Cupcake não encontrado' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('Erro getCupcakeById:', err);
    return res.status(500).json({ message: 'Erro ao buscar cupcake' });
  }
}

/**
 */
function normalizeCupcake(row) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao ?? '',
    preco_cents: Number(row.preco_cents ?? 0),
    image_url: row.image_url || null,
    estoque: Number(row.estoque ?? 0),
  };
}

module.exports = {
  listCupcakes,
  getCupcakeById,
  normalizeCupcake, // útil se você quiser reutilizar em outros controllers
};
