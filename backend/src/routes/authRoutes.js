const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { login, register, getMe, updateMe, changePassword, deleteMe } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', register);
router.get('/me', requireAuth, getMe);
router.put('/me', requireAuth, updateMe);
router.post('/change-password', requireAuth, changePassword);
router.delete('/me', requireAuth, deleteMe);

module.exports = router;
