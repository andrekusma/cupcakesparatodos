const { query } = require('../config/db');

function genCode() {
  return 'CPT-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function createOrder(req, res) {
  const { items, payment_method } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Itens ausentes' });
  }
  try {
    const ids = items.map(i => Number(i.cupcake_id)).filter(Boolean);
    const mapQty = new Map(items.map(i => [Number(i.cupcake_id), Number(i.quantidade || 1)]));
    const { rows: prods } = await query(
      `SELECT id, preco_cents FROM cupcakes WHERE id = ANY($1::int[])`,
      [ids]
    );
    let total = 0;
    prods.forEach(p => { total += (p.preco_cents || 0) * (mapQty.get(p.id) || 0); });

    const ins = await query(
      `INSERT INTO orders (user_id, total_cents)
       VALUES ($1,$2) RETURNING id, user_id, total_cents, created_at`,
      [req.user.id, total]
    );
    const order = ins.rows[0];

    for (const p of prods) {
      const q = mapQty.get(p.id) || 0;
      if (q > 0) {
        await query(
          `INSERT INTO order_items (order_id, cupcake_id, quantidade, preco_unit_cents)
           VALUES ($1,$2,$3,$4)`,
          [order.id, p.id, q, p.preco_cents]
        );
      }
    }

    const code = genCode();
    return res.status(201).json({ id: order.id, code, total_cents: order.total_cents, created_at: order.created_at, payment_method: payment_method || null });
  } catch (e) {
    return res.status(500).json({ message: 'Erro ao criar pedido' });
  }
}

module.exports = { createOrder };
