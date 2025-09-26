// backend/src/controllers/orderController.js
const { query } = require('../config/db');

function genCode() {
  return 'CPT-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
}

function genDeterministicCode(orderId, createdAt) {
  const ts = createdAt ? new Date(createdAt).getTime().toString(36).toUpperCase() : 'NA';
  return `CPT-${String(orderId).padStart(4, '0')}-${ts}`;
}

exports.createOrder = async (req, res) => {
  const userId = req.user?.id;
  const { items, payment_method, code } = req.body;

  if (!userId) return res.status(401).json({ message: 'Não autenticado' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Itens do pedido inválidos' });
  }
  const pm = String(payment_method || '').toLowerCase();
  if (!['pix', 'card'].includes(pm)) {
    return res.status(400).json({ message: 'Forma de pagamento inválida' });
  }

  try {
    await query('BEGIN');

    const ids = items.map(i => Number(i.cupcake_id)).filter(Boolean);
    const { rows: cupcakes } = await query(
      `SELECT id, preco_cents FROM cupcakes WHERE id = ANY($1)`,
      [ids]
    );
    const byId = new Map(cupcakes.map(c => [c.id, c]));

    let total = 0;
    const orderItems = [];
    for (const it of items) {
      const cid = Number(it.cupcake_id);
      const qty = Math.max(1, Number(it.quantidade || 1));
      const found = byId.get(cid);
      if (!found) {
        await query('ROLLBACK');
        return res.status(400).json({ message: `Cupcake ${cid} não encontrado` });
      }
      const unit = Number(found.preco_cents || 0);
      total += unit * qty;
      orderItems.push({ cupcake_id: cid, quantidade: qty, preco_unit_cents: unit });
    }

    const { rows: orderRows } = await query(
      `INSERT INTO orders (user_id, total_cents, payment_method)
       VALUES ($1, $2, $3) RETURNING id, created_at, payment_method`,
      [userId, total, pm]
    );
    const order = orderRows[0];

    const values = [];
    const params = [];
    let p = 1;
    for (const oi of orderItems) {
      values.push(`($${p++}, $${p++}, $${p++}, $${p++})`);
      params.push(order.id, oi.cupcake_id, oi.quantidade, oi.preco_unit_cents);
    }
    await query(
      `INSERT INTO order_items (order_id, cupcake_id, quantidade, preco_unit_cents)
       VALUES ${values.join(',')}`,
      params
    );

    await query('COMMIT');

    const orderCode = code || genCode();
    return res.status(201).json({
      order_id: order.id,
      code: orderCode,
      total_cents: total,
      payment_method: order.payment_method
    });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('createOrder error:', err);
    return res.status(500).json({ message: 'Erro ao criar pedido' });
  }
};

exports.getMyOrders = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Não autenticado' });

  try {
    const { rows } = await query(
      `SELECT
         o.id              AS order_id,
         o.total_cents     AS total_cents,
         COALESCE(o.payment_method, 'pix') AS payment_method,
         o.created_at      AS created_at,
         oi.id             AS order_item_id,
         oi.cupcake_id     AS cupcake_id,
         oi.quantidade     AS quantidade,
         oi.preco_unit_cents AS preco_unit_cents,
         c.nome            AS cupcake_nome,
         c.image_url       AS cupcake_image_url
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN cupcakes c     ON c.id = oi.cupcake_id
       WHERE o.user_id = $1
       ORDER BY o.id DESC, oi.id ASC`,
      [userId]
    );

    const byOrder = new Map();
    for (const r of rows) {
      if (!byOrder.has(r.order_id)) {
        byOrder.set(r.order_id, {
          id: r.order_id,
          code: genDeterministicCode(r.order_id, r.created_at),
          total_cents: Number(r.total_cents || 0),
          payment_method: r.payment_method,
          created_at: r.created_at,
          items: []
        });
      }
      if (r.order_item_id) {
        byOrder.get(r.order_id).items.push({
          id: r.order_item_id,
          cupcake_id: r.cupcake_id,
          nome: r.cupcake_nome,
          image_url: r.cupcake_image_url,
          quantidade: Number(r.quantidade || 1),
          preco_unit_cents: Number(r.preco_unit_cents || 0)
        });
      }
    }

    return res.json(Array.from(byOrder.values()));
  } catch (err) {
    console.error('getMyOrders error:', err);
    return res.status(500).json({ message: 'Erro ao listar pedidos' });
  }
};
