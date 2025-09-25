const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/orderController');

router.post('/orders', requireAuth, ctrl.createOrder);
router.get('/orders/mine', requireAuth, ctrl.listMyOrders);

module.exports = router;
