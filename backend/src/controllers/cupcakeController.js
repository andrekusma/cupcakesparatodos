import {


const est = Number(estoque);
if (isNaN(est) || est < 0) return res.status(400).json({ message: 'Estoque inválido' });


const img = sanitizeUrl(image_url);
if (image_url !== undefined && img === null) {
return res.status(400).json({ message: 'image_url inválida. Use http(s) completo.' });
}


const created = await createCupcake({ nome, descricao, preco_cents: cents, estoque: est, image_url: img ?? null });
res.status(201).json(created);
} catch (err) { next(err); }
}


export async function updateOne(req, res, next) {
try {
const id = Number(req.params.id);
const { nome, descricao, preco, preco_cents, estoque, image_url } = req.body;


let cents;
if (preco_cents !== undefined) cents = Number(preco_cents);
else if (preco !== undefined) cents = parseMoneyToCents(preco);


const payload = {
nome,
descricao,
preco_cents: cents,
estoque: estoque !== undefined ? Number(estoque) : undefined,
image_url: sanitizeUrl(image_url),
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