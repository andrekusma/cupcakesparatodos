// backend/src/controllers/orderController.js
const { query } = require('../config/db');

async function createOrder(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Não autenticado' });

    const { items, payment_method, code } = req.body || {};
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'Itens do pedido ausentes' });
    }
    if (!payment_method || !['pix', 'card'].includes(payment_method)) {
      return res.status(400).json({ message: 'Método de pagamento inválido' });
    }
    if (!code) return res.status(400).json({ message: 'Código do pedido ausente' });

    let total = 0;
    for (const it of items) {
      const { cupcake_id, quantidade } = it;
      const r = await query('SELECT preco_cents FROM cupcakes WHERE id=$1', [Number(cupcake_id)]);
      if (!r.rowCount) return res.status(400).json({ message: `Cupcake ${cupcake_id} inválido` });
      const price = Number(r.rows[0].preco_cents || 0);
      total += price * Number(quantidade || 1);
    }

    const insOrder = await query(
      `INSERT INTO orders (user_id, payment_method, code, total_cents)
       VALUES ($1,$2,$3,$4) RETURNING id, user_id, payment_method, code, total_cents, created_at`,
      [userId, payment_method, code, total]
    );

    const orderId = insOrder.rows[0].id;

    for (const it of items) {
      const { cupcake_id, quantidade } = it;
      const pr = await query('SELECT preco_cents FROM cupcakes WHERE id=$1', [Number(cupcake_id)]);
      const price = Number(pr.rows[0].preco_cents || 0);
      await query(
        `INSERT INTO order_items (order_id, cupcake_id, quantidade, price_cents)
         VALUES ($1,$2,$3,$4)`,
        [orderId, Number(cupcake_id), Number(quantidade || 1), price]
      );
    }

    return res.status(201).json(insOrder.rows[0]);
  } catch (e) {
    return res.status(500).json({ message: 'Erro ao criar pedido' });
  }
}

async function listMyOrders(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Não autenticado' });

    const orders = await query(
      `SELECT id, payment_method, code, total_cents, created_at
       FROM orders
       WHERE user_id=$1
       ORDER BY created_at DESC`,
      [userId]
    );

    if (!orders.rowCount) return res.json([]);

    const ids = orders.rows.map(o => o.id);
    const items = await query(
      `SELECT
         oi.order_id,
         oi.cupcake_id,
         oi.quantidade,
         oi.price_cents,
         c.nome AS cupcake_nome,
         c.image_url
       FROM order_items oi
       JOIN cupcakes c ON c.id = oi.cupcake_id
       WHERE oi.order_id = ANY($1::int[])
       ORDER BY oi.order_id DESC`,
      [ids]
    );

    const byOrder = {};
    for (const row of items.rows) {
      if (!byOrder[row.order_id]) byOrder[row.order_id] = [];
      byOrder[row.order_id].push({
        cupcake_id: row.cupcake_id,
        nome: row.cupcake_nome,
        image_url: row.image_url,
        quantidade: Number(row.quantidade),
        price_cents: Number(row.price_cents)
      });
    }

    const payload = orders.rows.map(o => ({
      id: o.id,
      payment_method: o.payment_method,
      code: o.code,
      total_cents: Number(o.total_cents),
      created_at: o.created_at,
      items: byOrder[o.id] || []
    }));

    return res.json(payload);
  } catch (e) {
    return res.status(500).json({ message: 'Erro ao listar pedidos' });
  }
}

module.exports = { createOrder, listMyOrders };
