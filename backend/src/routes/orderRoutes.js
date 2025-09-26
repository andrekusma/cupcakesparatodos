const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');
const { createOrder, getMyOrders } = require('../controllers/orderController');

router.post('/', authRequired, createOrder);
router.get('/my', authRequired, getMyOrders);

module.exports = router;
