// backend/src/routes/adminRoutes.js
import express from 'express';
import {
  createCupcake,
  updateCupcake,
  deleteCupcake
} from '../controllers/cupcakeController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
import { upload } from '../middleware/upload.js';

// Todas as rotas de admin exigem autenticação
router.use(requireAuth);

// Criar cupcake
router.post('/cupcakes', requireAdmin, upload.single('image'), createCupcake);

// Atualizar cupcake
router.put('/cupcakes/:id', requireAdmin, updateCupcake);

// Excluir cupcake
router.delete('/cupcakes/:id', requireAdmin, deleteCupcake);

export { router as adminRouter };