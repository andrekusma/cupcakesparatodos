const path = require('path');
const { query } = require('../config/db');

async function listCupcakes(_req, res) {
  try {
    const { rows } = await query('SELECT * FROM cupcakes ORDER BY id DESC');
    return res.json(rows);
  } catch {
    return res.status(500).json({ message: 'Erro ao listar cupcakes' });
  }
}

async function createCupcake(req, res) {
  const { nome, descricao, preco_cents, estoque } = req.body || {};
  if (!nome || !preco_cents) return res.status(400).json({ message: 'Dados insuficientes' });

  let image_url = null;
  if (req.file) {
    const filename = path.basename(req.file.filename);
    image_url = `/uploads/${filename}`;
  }

  try {
    const { rows } = await query(
      `INSERT INTO cupcakes (nome, descricao, preco_cents, estoque, image_url)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [nome, descricao || null, Number(preco_cents), Number(estoque || 0), image_url]
    );
    return res.status(201).json(rows[0]);
  } catch {
    return res.status(500).json({ message: 'Erro ao criar cupcake' });
  }
}

async function deleteCupcake(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID inválido' });
  try {
    await query('DELETE FROM cupcakes WHERE id=$1', [id]);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ message: 'Erro ao excluir cupcake' });
  }
}

module.exports = { listCupcakes, createCupcake, deleteCupcake };
