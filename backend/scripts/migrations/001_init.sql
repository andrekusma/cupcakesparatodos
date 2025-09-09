BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer', -- 'admin' | 'customer'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cupcakes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  preco_cents INTEGER NOT NULL CHECK (preco_cents >= 0),
  estoque INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cupcakes_updated_at ON cupcakes;
CREATE TRIGGER cupcakes_updated_at BEFORE UPDATE ON cupcakes
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

COMMIT;
