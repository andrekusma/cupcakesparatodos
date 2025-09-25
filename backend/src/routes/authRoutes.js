const express = require('express');
const { register, login } = require('../controllers/authController');
const { getMe, updateMe } = require('../controllers/profileController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/auth/register', express.json(), register);
router.post('/auth/login', express.json(), login);

// Perfil
router.get('/auth/me', requireAuth, getMe);
router.put('/auth/me', requireAuth, express.json(), updateMe);

module.exports = router;
