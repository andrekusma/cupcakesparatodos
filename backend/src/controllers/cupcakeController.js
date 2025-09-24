import { query } from '../config/db.js';

export async function getCupcakes(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM cupcakes ORDER BY id DESC');
    res.json(rows);
  } catch (e) { next(e); }
}

export async function createCupcake(req, res, next) {
  try {
    const { nome, preco_cents, estoque } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Imagem é obrigatória' });

    const image_url = `/uploads/${req.file.filename}`;
    const { rows } = await query(
      'INSERT INTO cupcakes (nome, preco_cents, estoque, image_url) VALUES ($1,$2,$3,$4) RETURNING *',
      [nome, preco_cents, estoque, image_url]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
}

export async function updateCupcake(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, preco_cents, estoque } = req.body;
    const { rows } = await query(
      'UPDATE cupcakes SET nome=$1, preco_cents=$2, estoque=$3 WHERE id=$4 RETURNING *',
      [nome, preco_cents, estoque, id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Cupcake não encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
}

export async function deleteCupcake(req, res, next) {
  try {
    const { id } = req.params;
    await query('DELETE FROM cupcakes WHERE id=$1', [id]);
    res.status(204).end();
  } catch (e) { next(e); }
}