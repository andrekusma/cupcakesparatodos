import { query } from '../config/db.js';

export async function listCupcakes({ search, sort = 'nome', order = 'asc', limit = 50, offset = 0 }) {
  const allowedSort = ['nome', 'preco_cents', 'estoque', 'criado_em'];
  const sortCol = allowedSort.includes(sort) ? sort : 'nome';
  const ord = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  const params = [];
  let where = '';
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE (LOWER(nome) LIKE LOWER($${params.length}) OR LOWER(descricao) LIKE LOWER($${params.length}))`;
  }
  params.push(limit);
  params.push(offset);

  const sql = `
    SELECT id, nome, descricao, preco_cents, estoque, criado_em, atualizado_em
    FROM cupcakes
    ${where}
    ORDER BY ${sortCol} ${ord}
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const { rows } = await query(sql, params);
  return rows;
}

export async function getCupcakeById(id) {
  const { rows } = await query('SELECT * FROM cupcakes WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createCupcake({ nome, descricao = '', preco_cents, estoque = 0 }) {
  const { rows } = await query(
    `INSERT INTO cupcakes (nome, descricao, preco_cents, estoque)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [nome, descricao, preco_cents, estoque]
  );
  return rows[0];
}

export async function updateCupcake(id, { nome, descricao, preco_cents, estoque }) {
  const fields = [];
  const params = [];
  let idx = 1;

  if (nome !== undefined) { fields.push(`nome = $${idx++}`); params.push(nome); }
  if (descricao !== undefined) { fields.push(`descricao = $${idx++}`); params.push(descricao); }
  if (preco_cents !== undefined) { fields.push(`preco_cents = $${idx++}`); params.push(preco_cents); }
  if (estoque !== undefined) { fields.push(`estoque = $${idx++}`); params.push(estoque); }

  if (fields.length === 0) return getCupcakeById(id);

  params.push(id);
  const sql = `UPDATE cupcakes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
  const { rows } = await query(sql, params);
  return rows[0] || null;
}

export async function deleteCupcake(id) {
  const { rowCount } = await query('DELETE FROM cupcakes WHERE id = $1', [id]);
  return rowCount > 0;
}