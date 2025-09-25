const express = require('express');
const router = express.Router();

const { upload } = require('../middleware/upload');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const cupcakeController = require('../controllers/cupcakeController');

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
