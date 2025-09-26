const { query } = require('../config/db');

async function createOrder(req, res) {
  try {
    const userId = req.user.id;
    const { items, payment_method, code } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Itens do pedido inválidos' });
    }

    let totalCents = 0;
    const priced = [];
    for (const it of items) {
      const cid = Number(it.cupcake_id);
      const qty = Math.max(1, Number(it.quantidade || 1));
      const { rows } = await query('SELECT id, preco_cents FROM cupcakes WHERE id = $1', [cid]);
      if (!rows[0]) return res.status(400).json({ message: `Cupcake ${cid} não encontrado` });
      const unit = Number(rows[0].preco_cents || 0);
      totalCents += unit * qty;
      priced.push({ cupcake_id: cid, quantidade: qty, preco_unit_cents: unit });
    }

    let orderId;

    // Tenta inserir com payment_method e code; se não existir coluna, cai para alternativas.
    try {
      const ins = await query(
        'INSERT INTO orders (user_id, total_cents, payment_method, code) VALUES ($1,$2,$3,$4) RETURNING id',
        [userId, totalCents, payment_method || null, code || null]
      );
      orderId = ins.rows[0].id;
    } catch {
      try {
        const ins2 = await query(
          'INSERT INTO orders (user_id, total_cents, code) VALUES ($1,$2,$3) RETURNING id',
          [userId, totalCents, code || null]
        );
        orderId = ins2.rows[0].id;
      } catch {
        const ins3 = await query(
          'INSERT INTO orders (user_id, total_cents) VALUES ($1,$2) RETURNING id',
          [userId, totalCents]
        );
        orderId = ins3.rows[0].id;
      }
    }

    for (const it of priced) {
      await query(
        'INSERT INTO order_items (order_id, cupcake_id, quantidade, preco_unit_cents) VALUES ($1,$2,$3,$4)',
        [orderId, it.cupcake_id, it.quantidade, it.preco_unit_cents]
      );
    }

    return res.status(201).json({ id: orderId, total_cents: totalCents, payment_method: payment_method || null });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao criar pedido' });
  }
}

async function getMyOrders(req, res) {
  try {
    const userId = req.user.id;

    // Tenta selecionar payment_method; se a coluna não existir, faz um fallback sem ela.
    let orders;
    try {
      const r = await query(
        'SELECT id, user_id, total_cents, payment_method, code, created_at FROM orders WHERE user_id = $1 ORDER BY id DESC LIMIT 100',
        [userId]
      );
      orders = r.rows;
    } catch {
      const r2 = await query(
        'SELECT id, user_id, total_cents, created_at FROM orders WHERE user_id = $1 ORDER BY id DESC LIMIT 100',
        [userId]
      );
      orders = r2.rows.map(o => ({ ...o, payment_method: null, code: null }));
    }

    const result = [];
    for (const o of orders) {
      const { rows: items } = await query(
        `SELECT oi.id, oi.cupcake_id, oi.quantidade, oi.preco_unit_cents, c.nome, c.image_url
         FROM order_items oi
         LEFT JOIN cupcakes c ON c.id = oi.cupcake_id
         WHERE oi.order_id = $1
         ORDER BY oi.id ASC`,
        [o.id]
      );

      const code = o.code || `CPT-${String(o.id).padStart(6, '0')}`;
      result.push({
        id: o.id,
        code,
        payment_method: o.payment_method, // devolve exatamente o que está salvo (pix|card|null)
        total_cents: Number(o.total_cents || 0),
        created_at: o.created_at,
        items: items.map(it => ({
          id: it.id,
          cupcake_id: it.cupcake_id,
          quantidade: it.quantidade,
          preco_unit_cents: it.preco_unit_cents,
          nome: it.nome,
          image_url: it.image_url
        }))
      });
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao obter pedidos' });
  }
}

module.exports = { createOrder, getMyOrders };
