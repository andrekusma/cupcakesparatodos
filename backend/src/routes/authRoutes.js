const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/login', ctrl.login);
router.post('/register', ctrl.register);
router.get('/me', auth.requireAuth, ctrl.getMe);
router.put('/me', auth.requireAuth, ctrl.updateMe);
router.post('/change-password', auth.requireAuth, ctrl.changePassword);
router.delete('/me', auth.requireAuth, ctrl.deleteMe);

module.exports = router;
