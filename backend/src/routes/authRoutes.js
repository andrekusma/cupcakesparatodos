const express = require('express');
const { authRequired } = require('../middleware/auth');
const { login, register, getMe, updateMe } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', authRequired, getMe);
router.put('/me', authRequired, updateMe);

module.exports = router;
