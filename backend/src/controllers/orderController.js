const { query, pool } = require('../config/db');

function asInt(v, d = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

async function createOrder(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Não autenticado' });

  const { items, payment_method, code } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Itens do pedido ausentes' });
  }
  const pm = String(payment_method || '').toLowerCase();
  if (!['pix', 'card'].includes(pm)) {
    return res.status(400).json({ message: 'Forma de pagamento inválida' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ids = items.map(i => asInt(i.cupcake_id)).filter(n => n > 0);
    if (ids.length !== items.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'IDs de cupcake inválidos' });
    }

    const dbRes = await client.query(
      `SELECT id, preco_cents, estoque FROM cupcakes WHERE id = ANY($1::int[])`,
      [ids]
    );
    if (dbRes.rows.length !== items.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Algum cupcake não existe' });
    }

    const byId = new Map(dbRes.rows.map(r => [r.id, r]));
    let totalCents = 0;
    const lineItems = items.map(i => {
      const cupcakeId = asInt(i.cupcake_id);
      const quantidade = Math.max(1, asInt(i.quantidade, 1));
      const row = byId.get(cupcakeId);
      const preco_unit_cents = asInt(row.preco_cents);
      totalCents += preco_unit_cents * quantidade;
      return { cupcake_id: cupcakeId, quantidade, preco_unit_cents };
    });

    // valida estoque
    for (const li of lineItems) {
      const row = byId.get(li.cupcake_id);
      const estoqueAtual = asInt(row.estoque, 0);
      if (estoqueAtual < li.quantidade) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: `Sem estoque suficiente do cupcake ${li.cupcake_id}`
        });
      }
    }

    const status = pm === 'card' ? 'paid' : 'pending';

    const insOrder = await client.query(
      `INSERT INTO orders (user_id, total_cents, status)
       VALUES ($1,$2,$3)
       RETURNING id, user_id, total_cents, status, created_at`,
      [userId, totalCents, status]
    );
    const order = insOrder.rows[0];

    // insere itens já com preco_unit_cents
    const values = [];
    const placeholders = [];
    lineItems.forEach((li, idx) => {
      const b = idx * 4;
      values.push(order.id, li.cupcake_id, li.quantidade, li.preco_unit_cents);
      placeholders.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4})`);
    });
    await client.query(
      `INSERT INTO order_items (order_id, cupcake_id, quantidade, preco_unit_cents)
       VALUES ${placeholders.join(',')}`,
      values
    );

    // decrementa estoque
    for (const li of lineItems) {
      await client.query(
        `UPDATE cupcakes
            SET estoque = estoque - $1, atualizado_em = NOW()
          WHERE id = $2`,
        [li.quantidade, li.cupcake_id]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({
      id: order.id,
      code: code || null,
      total_cents: order.total_cents,
      status: order.status,
      created_at: order.created_at,
      items: lineItems
    });
  } catch (e) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Erro ao criar pedido' });
  } finally {
    client.release();
  }
}

async function listMyOrders(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Não autenticado' });

  try {
    const orders = await query(
      `SELECT id, user_id, total_cents, status, created_at
         FROM orders
        WHERE user_id = $1
        ORDER BY id DESC`,
      [userId]
    );

    const ids = orders.rows.map(o => o.id);
    let mapItems = new Map();
    if (ids.length) {
      const it = await query(
        `SELECT order_id, cupcake_id, quantidade, preco_unit_cents
           FROM order_items
          WHERE order_id = ANY($1::int[])`,
        [ids]
      );
      mapItems = it.rows.reduce((m, r) => {
        if (!m.has(r.order_id)) m.set(r.order_id, []);
        m.get(r.order_id).push(r);
        return m;
      }, new Map());
    }

    const result = orders.rows.map(o => ({
      ...o,
      items: mapItems.get(o.id) || []
    }));
    return res.json(result);
  } catch {
    return res.status(500).json({ message: 'Erro ao listar pedidos' });
  }
}

module.exports = { createOrder, listMyOrders };
