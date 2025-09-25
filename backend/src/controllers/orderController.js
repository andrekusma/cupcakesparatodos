const { query, pool } = require('../config/db');

// payload esperado:
// { items: [{ cupcake_id: number, quantidade: number }], payment_method: 'pix'|'card', code?: string }
async function createOrder(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Não autenticado' });

  const { items, payment_method, code } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Itens do pedido ausentes' });
  }
  if (!['pix', 'card'].includes(String(payment_method))) {
    return res.status(400).json({ message: 'Forma de pagamento inválida' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Busca preços e valida cupcakes
    const ids = items.map(i => parseInt(i.cupcake_id, 10)).filter(Number.isInteger);
    if (ids.length !== items.length) throw new Error('IDs inválidos');
    const dbRes = await client.query(
      `SELECT id, preco_cents, estoque FROM cupcakes WHERE id = ANY($1::int[])`,
      [ids]
    );
    if (dbRes.rows.length !== items.length) {
      return res.status(400).json({ message: 'Algum cupcake não existe' });
    }

    // Calcula total e prepara itens
    let totalCents = 0;
    const byId = new Map(dbRes.rows.map(r => [r.id, r]));
    const lineItems = items.map(i => {
      const q = Math.max(1, parseInt(i.quantidade, 10) || 1);
      const row = byId.get(i.cupcake_id);
      const unit = parseInt(row.preco_cents, 10) || 0;
      totalCents += unit * q;
      return { cupcake_id: i.cupcake_id, quantidade: q, preco_unit_cents: unit };
    });

    // status simulado
    const status = payment_method === 'card' ? 'paid' : 'pending';

    // cria pedido
    const insOrder = await client.query(
      `INSERT INTO orders (user_id, total_cents, status)
       VALUES ($1,$2,$3)
       RETURNING id, user_id, total_cents, status, created_at`,
      [userId, totalCents, status]
    );
    const order = insOrder.rows[0];

    // insere itens
    const values = [];
    const placeholders = [];
    lineItems.forEach((li, idx) => {
      const b = idx * 3;
      values.push(order.id, li.cupcake_id, li.quantidade);
      placeholders.push(`($${b + 1}, $${b + 2}, $${b + 3})`);
    });
    await client.query(
      `INSERT INTO order_items (order_id, cupcake_id, quantidade)
       VALUES ${placeholders.join(',')}`,
      values
    );

    // atualiza preços unitários (se tiver a coluna preco_unit_cents)
    try {
      const values2 = [];
      const placeholders2 = [];
      lineItems.forEach((li, idx) => {
        const b = idx * 3;
        values2.push(order.id, li.cupcake_id, li.preco_unit_cents);
        placeholders2.push(`($${b + 1}, $${b + 2}, $${b + 3})`);
      });
      await client.query(
        `UPDATE order_items AS oi
           SET preco_unit_cents = v.preco_unit_cents
          FROM (VALUES ${placeholders2.join(',')})
               AS v(order_id, cupcake_id, preco_unit_cents)
         WHERE oi.order_id = v.order_id AND oi.cupcake_id = v.cupcake_id`,
        values2
      );
    } catch { /* se a coluna não existir, ignora */ }

    await client.query('COMMIT');

    return res.status(201).json({
      id: order.id,
      code: code || null,          // o front manda o código que exibiu ao cliente
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

    // carrega itens
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
