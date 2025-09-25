const multer = require('multer');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  (process.env.NODE_ENV === 'production' ? '/data/uploads' : path.join(__dirname, '..', '..', 'uploads'));

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(png|jpe?g)/i.test(file.mimetype || '');
    cb(ok ? null : new Error('Apenas PNG/JPEG'), ok);
  }
});

module.exports = { upload, UPLOAD_DIR };
