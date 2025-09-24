// backend/src/routes/cupcakeRoutes.js
import express from 'express';
import { getCupcakes, createCupcake, updateCupcake, deleteCupcake } from '../controllers/cupcakeController.js';
import { requireAdmin } from '../middleware/auth.js';

export const cupcakeRouter = express.Router();

// GET: público - qualquer visitante pode listar os cupcakes
cupcakeRouter.get('/', getCupcakes);

// As rotas abaixo exigem que o usuário seja admin
cupcakeRouter.post('/', requireAdmin, createCupcake);
cupcakeRouter.put('/:id', requireAdmin, updateCupcake);
cupcakeRouter.delete('/:id', requireAdmin, deleteCupcake);