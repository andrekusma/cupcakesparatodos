const { query } = require('../config/db');

function arr(a){ return Array.isArray(a) ? a : []; }

async function createOrder(req, res){
  const userId = req.user?.id;
  const items = arr(req.body?.items).map(i => ({
    cupcake_id: Number(i.cupcake_id),
    quantidade: Number(i.quantidade || 1),
  }));
  const payment_method = String(req.body?.payment_method || '').toLowerCase() === 'card' ? 'card' : 'pix';
  const code = (req.body?.code || null);

  if (!userId) return res.status(401).json({ message: 'Não autenticado' });
  if (!items.length) return res.status(400).json({ message: 'Carrinho vazio' });

  try{
    const ids = items.map(i => i.cupcake_id);
    const params = ids.map((_,i)=>`$${i+1}`).join(',');
    const { rows: cup } = await query(`SELECT id, preco_cents FROM cupcakes WHERE id IN (${params})`, ids);
    const priceMap = new Map(cup.map(c => [Number(c.id), Number(c.preco_cents || 0)]));

    let total_cents = 0;
    for (const it of items){
      const p = priceMap.get(it.cupcake_id) || 0;
      total_cents += p * it.quantidade;
    }

    const { rows: ord } = await query(
      `INSERT INTO orders (user_id, code, payment_method, total_cents)
       VALUES ($1,$2,$3,$4)
       RETURNING id, code, payment_method, total_cents, created_at`,
      [userId, code, payment_method, total_cents]
    );
    const order = ord[0];

    for (const it of items){
      await query(
        `INSERT INTO order_items (order_id, cupcake_id, quantidade)
         VALUES ($1,$2,$3)`,
        [order.id, it.cupcake_id, it.quantidade]
      );
    }

    return res.status(201).json({
      id: order.id,
      code: order.code,
      payment_method: order.payment_method,
      total_cents: Number(order.total_cents || 0),
      created_at: order.created_at
    });
  } catch(err){
    console.error('createOrder error:', err);
    return res.status(500).json({ message: 'Erro ao criar pedido' });
  }
}

async function getMyOrders(req, res){
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Não autenticado' });

  try{
    const { rows } = await query(
      `
      SELECT
        o.id,
        o.code,
        o.payment_method,
        o.total_cents,
        o.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'cupcake_id', oi.cupcake_id,
              'quantidade', oi.quantidade,
              'nome', c.nome,
              'image_url', c.image_url,
              'price_cents', c.preco_cents
            )
            ORDER BY oi.id
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN cupcakes c ON c.id = oi.cupcake_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      `,
      [userId]
    );

    return res.json(rows.map(r => ({
      id: r.id,
      code: r.code,
      payment_method: r.payment_method,
      total_cents: Number(r.total_cents || 0),
      created_at: r.created_at,
      items: Array.isArray(r.items) ? r.items : [],
    })));
  } catch(err){
    console.error('getMyOrders error:', err);
    return res.status(500).json({ message: 'Erro ao carregar pedidos' });
  }
}

module.exports = { createOrder, getMyOrders };
