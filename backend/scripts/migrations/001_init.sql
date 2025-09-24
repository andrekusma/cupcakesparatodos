BEGIN;

-- Tabela de usuários (admin e clientes)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer', -- 'admin' ou 'customer'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de cupcakes
CREATE TABLE IF NOT EXISTS cupcakes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  preco_cents INTEGER NOT NULL,
  estoque INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de pedidos (simulação do carrinho/compra)
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Itens de cada pedido
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  cupcake_id INTEGER REFERENCES cupcakes(id),
  quantidade INTEGER NOT NULL,
  preco_unit_cents INTEGER NOT NULL
);

COMMIT;