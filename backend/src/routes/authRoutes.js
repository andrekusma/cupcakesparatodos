const express = require('express');
const router = express.Router();

// compat: funciona se o controller estiver em CommonJS ou ESM
let authController = require('../controllers/authController');
authController = authController && authController.default ? authController.default : authController;

// rotas
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

module.exports = router;
