const express = require('express');
const router = express.Router();

const { upload } = require('../middleware/upload');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/cupcakeController');

router.post('/admin/cupcakes', requireAuth, requireAdmin, upload.single('image'), ctrl.createCupcake);
router.delete('/admin/cupcakes/:id', requireAuth, requireAdmin, ctrl.deleteCupcake);

module.exports = router;
