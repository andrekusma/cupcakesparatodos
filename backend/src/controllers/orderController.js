const { query } = require('../config/db');

function asArray(v) { return Array.isArray(v) ? v : []; }
function synthCodeFromId(id) { return `CPT-${String(id || '').padStart(6, '0')}`; }

async function createOrder(req, res) {
  const userId = req.user?.id;
  const items = asArray(req.body?.items).map(i => ({
    cupcake_id: Number(i.cupcake_id),
    quantidade: Number(i.quantidade || 1),
  }));
  const payment_method = String(req.body?.payment_method || '').toLowerCase() === 'card' ? 'card' : 'pix';

  if (!userId) return res.status(401).json({ message: 'Não autenticado' });
  if (!items.length) return res.status(400).json({ message: 'Carrinho vazio' });

  try {
    const ids = items.map(i => i.cupcake_id);
    const ph = ids.map((_, i) => `$${i + 1}`).join(',');
    const { rows: cup } = await query(`SELECT id, preco_cents FROM cupcakes WHERE id IN (${ph})`, ids);

    const priceMap = new Map(cup.map(c => [Number(c.id), Number(c.preco_cents || 0)]));
    let total_cents = 0;
    const enriched = items.map(it => {
      const preco_unit_cents = priceMap.get(it.cupcake_id) || 0;
      total_cents += preco_unit_cents * it.quantidade;
      return { ...it, preco_unit_cents };
    });

    const { rows: ord } = await query(
      `INSERT INTO orders (user_id, payment_method, total_cents)
       VALUES ($1,$2,$3)
       RETURNING id, user_id, payment_method, total_cents, created_at`,
      [userId, payment_method, total_cents]
    );
    const order = ord[0];

    for (const it of enriched) {
      await query(
        `INSERT INTO order_items (order_id, cupcake_id, quantidade, preco_unit_cents)
         VALUES ($1,$2,$3,$4)`,
        [order.id, it.cupcake_id, it.quantidade, it.preco_unit_cents]
      );
    }

    return res.status(201).json({
      id: order.id,
      code: synthCodeFromId(order.id),
      payment_method: order.payment_method,
      total_cents: Number(order.total_cents || 0),
      created_at: order.created_at,
    });
  } catch (err) {
    console.error('createOrder error:', err);
    return res.status(500).json({ message: 'Erro ao criar pedido' });
  }
}

async function getMyOrders(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Não autenticado' });

  try {
    const { rows: orders } = await query(
      `SELECT id, payment_method, total_cents, created_at
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    if (!orders.length) return res.json([]);

    const orderIds = orders.map(o => o.id);
    const ph = orderIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows: items } = await query(
      `SELECT oi.order_id, oi.cupcake_id, oi.quantidade, oi.preco_unit_cents,
              c.nome, c.image_url
       FROM order_items oi
       JOIN cupcakes c ON c.id = oi.cupcake_id
       WHERE oi.order_id IN (${ph})
       ORDER BY oi.id`,
      orderIds
    );

    const itemsByOrder = items.reduce((acc, it) => {
      (acc[it.order_id] = acc[it.order_id] || []).push({
        cupcake_id: it.cupcake_id,
        quantidade: it.quantidade,
        nome: it.nome,
        image_url: it.image_url,
        price_cents: it.preco_unit_cents
      });
      return acc;
    }, {});

    const result = orders.map(o => ({
      id: o.id,
      code: synthCodeFromId(o.id),
      payment_method: o.payment_method || null,
      total_cents: Number(o.total_cents || 0),
      created_at: o.created_at,
      items: itemsByOrder[o.id] || []
    }));

    return res.json(result);
  } catch (err) {
    console.error('getMyOrders error:', err);
    return res.status(500).json({ message: 'Erro ao carregar pedidos' });
  }
}

module.exports = { createOrder, getMyOrders };
