CREATE TABLE IF NOT EXISTS cupcakes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT,
  preco_cents INTEGER NOT NULL CHECK (preco_cents >= 0),
  estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at ON cupcakes;
CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON cupcakes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed opcional
INSERT INTO cupcakes (nome, descricao, preco_cents, estoque)
VALUES
  ('Chocolate', 'Delicioso cupcake de chocolate', 500, 20),
  ('Baunilha', 'Clássico cupcake de baunilha', 400, 25),
  ('Morango', 'Cobertura de morango fresca', 600, 15)
ON CONFLICT DO NOTHING;