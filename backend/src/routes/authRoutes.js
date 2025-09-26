const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/authController') || {};
const auth = require('../middleware/auth');

function pick(...names) {
  for (const n of names) {
    if (typeof ctrl[n] === 'function') return ctrl[n];
  }
  return null;
}

function notImpl(name) {
  return (_req, res) => res.status(500).json({ message: `Handler não implementado: ${name}` });
}

const hLogin          = pick('login', 'loginUser', 'signin')                 || notImpl('login');
const hRegister       = pick('register', 'registerUser', 'signup')           || notImpl('register');
const hGetMe          = pick('getMe', 'me', 'profile', 'getProfile')         || notImpl('getMe');
const hUpdateMe       = pick('updateMe', 'updateProfile', 'updateUser')      || notImpl('updateMe');
const hChangePassword = pick('changePassword', 'changePass', 'setPassword')  || notImpl('changePassword');
const hDeleteMe       = pick('deleteMe', 'removeMe', 'deleteAccount')        || notImpl('deleteMe');

router.post('/login', hLogin);
router.post('/register', hRegister);
router.get('/me', auth.requireAuth, hGetMe);
router.put('/me', auth.requireAuth, hUpdateMe);
router.post('/change-password', auth.requireAuth, hChangePassword);
router.delete('/me', auth.requireAuth, hDeleteMe);

module.exports = router;
