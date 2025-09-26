const { query } = require('../config/db');

function requireItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('Lista de itens vazia');
    err.status = 400;
    throw err;
  }
}

function normalizePayment(p) {
  const v = String(p || '').toLowerCase().trim();
  if (v === 'pix') return 'pix';
  if (v === 'card' || v === 'cartao' || v === 'cartão' || v === 'credito' || v === 'crédito') return 'card';
  return null;
}

exports.createOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Não autenticado' });

    const { items, payment_method, code } = req.body || {};
    requireItems(items);

    const pay = normalizePayment(payment_method);
    if (!pay) return res.status(400).json({ message: 'Forma de pagamento inválida' });

    await query('BEGIN');

    const priceMap = new Map();
    const ids = items.map(i => Number(i.cupcake_id)).filter(Boolean);
    if (ids.length) {
      const { rows } = await query(
        `SELECT id, preco_cents, estoque FROM cupcakes WHERE id = ANY($1::int[])`,
        [ids]
      );
      rows.forEach(r => priceMap.set(r.id, { preco_cents: Number(r.preco_cents || 0), estoque: Number(r.estoque || 0) }));
    }

    let totalCents = 0;
    const safeItems = [];

    for (const it of items) {
      const cupcakeId = Number(it.cupcake_id);
      const qty = Math.max(1, Number(it.quantidade || 1));
      const pr = priceMap.get(cupcakeId);
      if (!pr) {
        await query('ROLLBACK');
        return res.status(400).json({ message: `Cupcake ${cupcakeId} inválido` });
      }
      if (pr.estoque != null && pr.estoque < qty) {
        await query('ROLLBACK');
        return res.status(409).json({ message: `Estoque insuficiente para o cupcake ${cupcakeId}` });
      }
      totalCents += pr.preco_cents * qty;
      safeItems.push({ cupcake_id: cupcakeId, quantidade: qty, preco_unit_cents: pr.preco_cents });
    }

    const insertOrderSql = `
      INSERT INTO orders (user_id, code, payment_method, total_cents)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, code, payment_method, total_cents, created_at
    `;
    const { rows: orderRows } = await query(insertOrderSql, [userId, code || null, pay, totalCents]);
    const order = orderRows[0];

    for (const it of safeItems) {
      await query(
        `INSERT INTO order_items (order_id, cupcake_id, quantidade, preco_unit_cents)
         VALUES ($1, $2, $3, $4)`,
        [order.id, it.cupcake_id, it.quantidade, it.preco_unit_cents]
      );

      await query(
        `UPDATE cupcakes
           SET estoque = CASE
                           WHEN estoque IS NULL THEN NULL
                           ELSE GREATEST(estoque - $1, 0)
                         END
         WHERE id = $2`,
        [it.quantidade, it.cupcake_id]
      );
    }

    await query('COMMIT');

    return res.status(201).json({
      id: order.id,
      code: order.code,
      payment_method: order.payment_method,
      total_cents: order.total_cents,
      created_at: order.created_at
    });
  } catch (err) {
    try { await query('ROLLBACK'); } catch {}
    console.error('createOrder error:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Erro ao criar pedido' });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Não autenticado' });

    const sql = `
      SELECT
        o.id,
        o.code,
        o.payment_method,
        o.total_cents,
        o.created_at,
        oi.id   AS order_item_id,
        oi.quantidade,
        oi.preco_unit_cents,
        c.id    AS cupcake_id,
        c.nome,
        c.preco_cents,
        c.image_url
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN cupcakes c     ON c.id = oi.cupcake_id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC, o.id DESC, oi.id ASC
    `;
    const { rows } = await query(sql, [userId]);

    const byOrder = new Map();
    for (const r of rows) {
      if (!byOrder.has(r.id)) {
        byOrder.set(r.id, {
          id: r.id,
          code: r.code,
          payment_method: r.payment_method,
          total_cents: Number(r.total_cents || 0),
          created_at: r.created_at,
          items: []
        });
      }
      if (r.order_item_id) {
        byOrder.get(r.id).items.push({
          id: r.order_item_id,
          cupcake_id: r.cupcake_id,
          nome: r.nome,
          quantidade: Number(r.quantidade || 0),
          preco_unit_cents: Number(r.preco_unit_cents || r.preco_cents || 0),
          image_url: r.image_url
        });
      }
    }

    return res.json(Array.from(byOrder.values()));
  } catch (err) {
    console.error('getMyOrders error:', err);
    return res.status(500).json({ message: 'Erro ao listar pedidos' });
  }
};
