// backend/src/middleware/upload.js
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_');
    const stamp = Date.now();
    cb(null, `${base}_${stamp}${ext}`);
  }
});

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ok = /image\/(png|jpe?g)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Apenas PNG/JPEG são permitidos'), ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
