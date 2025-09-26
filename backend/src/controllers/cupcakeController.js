const path = require('path');
const { query } = require('../config/db');

function norm(row) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    preco_cents: row.preco_cents,
    estoque: row.estoque,
    image_url: row.image_url,
  };
}

async function listCupcakes(_req, res) {
  try {
    const r = await query(
      'SELECT id, nome, descricao, preco_cents, estoque, image_url FROM cupcakes ORDER BY id DESC'
    );
    return res.json(r.rows.map(norm));
  } catch (err) {
    console.error('listCupcakes error:', err);
    return res.status(500).json({ message: 'Erro ao listar cupcakes' });
  }
}

async function createCupcake(req, res) {
  try {
    const { nome, descricao, preco_cents, estoque } = req.body || {};
    if (!nome || !preco_cents) {
      return res.status(400).json({ message: 'Campos obrigatórios: nome e preco_cents' });
    }

    let image_url = null;
    if (req.file && req.file.filename) {
      image_url = path.posix.join('/uploads', req.file.filename);
    }

    const r = await query(
      `INSERT INTO cupcakes (nome, descricao, preco_cents, estoque, image_url)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, nome, descricao, preco_cents, estoque, image_url`,
      [
        String(nome),
        descricao ?? null,
        Number(preco_cents),
        estoque == null ? 0 : Number(estoque),
        image_url,
      ]
    );

    return res.status(201).json(norm(r.rows[0]));
  } catch (err) {
    console.error('createCupcake error:', err);
    return res.status(500).json({ message: 'Erro ao criar cupcake' });
  }
}

async function deleteCupcake(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    await query('DELETE FROM cupcakes WHERE id = $1', [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('deleteCupcake error:', err);
    return res.status(500).json({ message: 'Erro ao excluir cupcake' });
  }
}

module.exports = { listCupcakes, createCupcake, deleteCupcake };
