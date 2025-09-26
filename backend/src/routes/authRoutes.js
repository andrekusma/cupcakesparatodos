const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');
const {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  deleteMe,
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);

router.get('/me', authRequired, getMe);
router.put('/me', authRequired, updateMe);
router.post('/change-password', authRequired, changePassword);
router.delete('/me', authRequired, deleteMe);

module.exports = router;
