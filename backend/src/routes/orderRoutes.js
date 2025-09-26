// backend/src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { createOrder, listMyOrders } = require('../controllers/orderController');

router.post('/', requireAuth, createOrder);
router.get('/my', requireAuth, listMyOrders);

module.exports = router;
