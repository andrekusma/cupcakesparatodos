import { Router } from 'express';
import { index, show, store, updateOne, destroy } from '../controllers/cupcakeController.js';


export const cupcakeRouter = Router();


cupcakeRouter.get('/', index);
cupcakeRouter.get('/:id', show);
cupcakeRouter.post('/', store);
cupcakeRouter.put('/:id', updateOne);
cupcakeRouter.delete('/:id', destroy);