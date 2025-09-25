const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { requireAuth, requireAdmin } = require('../middleware/auth');
const cupcakeController = require('../controllers/cupcakeController');

const router = express.Router();

// Configuração do diretório de uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const name = `cup_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  }
});
const fileFilter = (_req, file, cb) => {
  if (/image\/(png|jpe?g)/i.test(file.mimetype)) return cb(null, true);
  return cb(new Error('Apenas PNG/JPEG são aceitos'));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Rotas administrativas (protegidas)
router.post(
  '/admin/cupcakes',
  requireAuth,
  requireAdmin,
  upload.single('image'),
  cupcakeController.createCupcake
);

router.delete(
  '/admin/cupcakes/:id',
  requireAuth,
  requireAdmin,
  cupcakeController.deleteCupcake
);

module.exports = router;
