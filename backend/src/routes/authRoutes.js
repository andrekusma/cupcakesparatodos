// backend/src/routes/authRoutes.js
import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

// rota de registro de novo usuário (clientes)
router.post('/register', register);

// rota de login (admin ou cliente)
router.post('/login', login);

export { router as authRouter };