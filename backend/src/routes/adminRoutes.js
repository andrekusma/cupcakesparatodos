const express = require('express');
const multer = require('multer');
const path = require('path');
const { authRequired, requireAdmin } = require('../middleware/auth');
const { createCupcake, deleteCupcake } = require('../controllers/cupcakeController');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const safe = `cup_${Date.now()}_${Math.random().toString(36).slice(2,10)}${ext}`;
    cb(null, safe);
  }
});
const upload = multer({ storage });

const router = express.Router();

router.post('/cupcakes', authRequired, requireAdmin, upload.single('image'), createCupcake);
router.delete('/cupcakes/:id', authRequired, requireAdmin, deleteCupcake);

module.exports = router;
