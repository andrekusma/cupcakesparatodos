const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const { query } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const id = 'cup_' + Date.now() + '_' + crypto.randomBytes(6).toString('base64url');
    const ext = path.extname(file.originalname || '.png') || '.png';
    cb(null, `${id}${ext}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(png|jpe?g)/i.test(file.mimetype);
    if (!ok) return cb(new Error('Apenas PNG/JPEG'));
    cb(null, true);
  }
});

router.post('/cupcakes', requireAuth, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { nome, descricao, preco_cents, estoque } = req.body;
    if (!nome || !preco_cents) return res.status(400).json({ message: 'Campos obrigatórios ausentes' });
    const image_url = req.file ? '/uploads/' + req.file.filename : null;
    const { rows } = await query(
      `INSERT INTO cupcakes (nome, descricao, preco_cents, image_url, estoque)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, nome, descricao, preco_cents, image_url, estoque`,
      [String(nome), descricao || null, Number(preco_cents), image_url, Number(estoque || 0)]
    );
    return res.status(201).json(rows[0]);
  } catch {
    return res.status(500).json({ message: 'Erro ao criar cupcake' });
  }
});

router.delete('/cupcakes/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const cur = await query('SELECT image_url FROM cupcakes WHERE id=$1', [id]);
    const img = cur.rows[0]?.image_url;

    await query('DELETE FROM cupcakes WHERE id=$1', [id]);

    if (img && img.startsWith('/uploads/')) {
      const filePath = path.join(uploadDir, path.basename(img));
      fs.promises.unlink(filePath).catch(() => {});
    }
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ message: 'Erro ao excluir cupcake' });
  }
});

module.exports = router;
