const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { createOrder, getMyOrders } = require('../controllers/orderController');

router.post('/', requireAuth, createOrder);
router.get('/my', requireAuth, getMyOrders);

module.exports = router;
