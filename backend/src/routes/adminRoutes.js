const express = require('express');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const { authRequired } = require('../middleware/auth');
const { createCupcake, deleteCupcake } = require('../controllers/cupcakeController');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Ação restrita a administradores' });
  }
  next();
}

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const rnd = crypto.randomBytes(6).toString('base64url');
    const name = `cup_${Date.now()}_${rnd}${ext || '.png'}`;
    cb(null, name);
  },
});

const fileFilter = (_req, file, cb) => {
  const ok = /image\/(png|jpe?g)$/i.test(file.mimetype || '');
  cb(ok ? null : new Error('Apenas PNG/JPEG'), ok);
};

const upload = multer({ storage, fileFilter });

// POST /api/admin/cupcakes  (multipart, campo "image")
router.post('/cupcakes', authRequired, requireAdmin, upload.single('image'), createCupcake);

// DELETE /api/admin/cupcakes/:id
router.delete('/cupcakes/:id', authRequired, requireAdmin, deleteCupcake);

module.exports = router;
