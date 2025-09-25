const path = require('path');
const fs = require('fs');
const { query } = require('../config/db');

function toPublicPath(absPath) {
  // Arquivos salvos em UPLOAD_DIR são servidos em /uploads/<arquivo>
  const fileName = path.basename(absPath || '');
  return fileName ? `/uploads/${fileName}` : null;
}

async function listCupcakes(_req, res) {
  try {
    const db = await query(
      `SELECT id, nome, descricao, preco_cents, estoque, image_url
         FROM cupcakes
        ORDER BY id DESC`
    );
    return res.json(db.rows);
  } catch {
    return res.status(500).json({ message: 'Erro ao listar cupcakes' });
  }
}

async function createCupcake(req, res) {
  try {
    const { nome, descricao, preco_cents, estoque } = req.body || {};
    if (!nome || !descricao || !preco_cents) {
      return res.status(400).json({ message: 'Campos obrigatórios: nome, descricao, preco_cents' });
    }

    let imageUrl = null;
    if (req.file && req.file.path) {
      imageUrl = toPublicPath(req.file.path);
    }

    const ins = await query(
      `INSERT INTO cupcakes (nome, descricao, preco_cents, estoque, image_url)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, nome, descricao, preco_cents, estoque, image_url`,
      [nome, descricao, Number(preco_cents), Number(estoque || 0), imageUrl]
    );
    return res.status(201).json(ins.rows[0]);
  } catch (e) {
    return res.status(500).json({ message: 'Erro ao criar cupcake' });
  }
}

async function deleteCupcake(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    // Opcional: apagar arquivo da imagem, se existir
    const cur = await query('SELECT image_url FROM cupcakes WHERE id = $1', [id]);
    await query('DELETE FROM cupcakes WHERE id = $1', [id]);

    // Tentar remover arquivo físico (não falhar se não existir)
    const imageUrl = cur.rows?.[0]?.image_url;
    if (imageUrl && imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', '..', imageUrl.replace(/^\/+/, ''));
      fs.promises.unlink(filePath).catch(() => {});
    }

    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ message: 'Erro ao excluir cupcake' });
  }
}

module.exports = { listCupcakes, createCupcake, deleteCupcake };
