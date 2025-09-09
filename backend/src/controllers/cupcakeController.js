import {
  listCupcakes,
  getCupcakeById,
  createCupcake,
  updateCupcake,
  deleteCupcake,
} from '../models/cupcakeModel.js';

function parseMoneyToCents(v) {
  // aceita número ou string "12.34" -> 1234
  if (typeof v === 'number') return Math.round(v * 100);
  if (typeof v === 'string') return Math.round(parseFloat(v.replace(',', '.')) * 100);
  return null;
}

export async function index(req, res, next) {
  try {
    const { search, sort, order, limit = 50, offset = 0 } = req.query;
    const items = await listCupcakes({ search, sort, order, limit: Number(limit), offset: Number(offset) });
    res.json(items);
  } catch (err) { next(err); }
}

export async function show(req, res, next) {
  try {
    const item = await getCupcakeById(Number(req.params.id));
    if (!item) return res.status(404).json({ message: 'Cupcake não encontrado' });
    res.json(item);
  } catch (err) { next(err); }
}

export async function store(req, res, next) {
  try {
    const { nome, descricao = '', preco, preco_cents, estoque = 0 } = req.body;
    if (!nome) return res.status(400).json({ message: 'Campo nome é obrigatório' });

    const cents = preco_cents ?? parseMoneyToCents(preco);
    if (cents == null || isNaN(cents) || cents < 0) {
      return res.status(400).json({ message: 'Preço inválido. Envie preco (ex: 12.34) ou preco_cents (inteiro em centavos)' });
    }

    const est = Number(estoque);
    if (isNaN(est) || est < 0) return res.status(400).json({ message: 'Estoque inválido' });

    const created = await createCupcake({ nome, descricao, preco_cents: cents, estoque: est });
    res.status(201).json(created);
  } catch (err) { next(err); }
}

export async function updateOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { nome, descricao, preco, preco_cents, estoque } = req.body;

    let cents;
    if (preco_cents !== undefined) cents = Number(preco_cents);
    else if (preco !== undefined) cents = parseMoneyToCents(preco);

    const payload = {
      nome,
      descricao,
      preco_cents: cents,
      estoque: estoque !== undefined ? Number(estoque) : undefined,
    };
    const updated = await updateCupcake(id, payload);
    if (!updated) return res.status(404).json({ message: 'Cupcake não encontrado' });
    res.json(updated);
  } catch (err) { next(err); }
}

export async function destroy(req, res, next) {
  try {
    const ok = await deleteCupcake(Number(req.params.id));
    if (!ok) return res.status(404).json({ message: 'Cupcake não encontrado' });
    res.status(204).send();
  } catch (err) { next(err); }
}