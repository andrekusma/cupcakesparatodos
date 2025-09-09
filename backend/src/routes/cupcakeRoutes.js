import { Router } from 'express';
import { index, show, store, updateOne, destroy } from '../controllers/cupcakeController.js';

export const cupcakeRouter = Router();

// GET /api/cupcakes?search=choco&sort=preco_cents&order=desc&limit=20&offset=0
cupcakeRouter.get('/', index);
// GET /api/cupcakes/:id
cupcakeRouter.get('/:id', show);
// POST /api/cupcakes
cupcakeRouter.post('/', store);
// PUT /api/cupcakes/:id
cupcakeRouter.put('/:id', updateOne);
// DELETE /api/cupcakes/:id
cupcakeRouter.delete('/:id', destroy);
```