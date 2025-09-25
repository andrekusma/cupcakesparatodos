const path = require('path');
const fs = require('fs');
const url = require('url');
const { query } = require('../config/db');
const { UPLOAD_DIR } = require('../middleware/upload');

function publicBase(req) {
  return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

async function listCupcakes(_req, res) {
  try {
    const { rows } = await query(
      `SELECT id, nome, descricao, preco_cents, estoque, image_url
         FROM cupcakes
        ORDER BY id DESC`
    );
    return res.json(rows);
  } catch {
    return res.status(500).json({ message: 'Erro ao listar' });
  }
}

async function createCupcake(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Imagem é obrigatória (campo image)' });

    const nome = (req.body.nome || '').trim();
    if (!nome) return res.status(400).json({ message: 'Campo "nome" é obrigatório' });

    const descricao = (req.body.descricao || '').trim();
    const preco_cents = Number.isInteger(Number(req.body.preco_cents))
      ? parseInt(req.body.preco_cents, 10)
      : 0;
    const estoque = Number.isInteger(Number(req.body.estoque))
      ? parseInt(req.body.estoque, 10)
      : 0;

    const relative = `/uploads/${req.file.filename}`;
    const image_url = `${publicBase(req)}${relative}`;

    const { rows } = await query(
      `INSERT INTO cupcakes (nome, descricao, preco_cents, estoque, image_url)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, nome, descricao, preco_cents, estoque, image_url`,
      [nome, descricao, preco_cents, estoque, image_url]
    );

    return res.status(201).json(rows[0]);
  } catch {
    return res.status(500).json({ message: 'Erro ao criar' });
  }
}

async function deleteCupcake(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const get = await query('SELECT image_url FROM cupcakes WHERE id=$1', [id]);
    if (!get.rows.length) return res.status(404).json({ message: 'Cupcake não encontrado' });

    await query('DELETE FROM cupcakes WHERE id=$1', [id]);

    // remove arquivo físico correspondente, se existir
    try {
      const imageUrl = get.rows[0].image_url || '';
      const pathname = url.parse(imageUrl).pathname || '';
      const filename = path.basename(pathname);
      const filePath = path.join(UPLOAD_DIR, filename);
      fs.promises.unlink(filePath).catch(() => {});
    } catch {}

    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ message: 'Erro ao excluir' });
  }
}

module.exports = { listCupcakes, createCupcake, deleteCupcake };
