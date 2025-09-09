import { Router } from 'express';
import { index, show } from '../controllers/cupcakeController.js';

export const cupcakeRouter = Router();
cupcakeRouter.get('/', index);
cupcakeRouter.get('/:id', show);
