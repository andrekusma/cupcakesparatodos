const express = require('express');
const { authRequired } = require('../middleware/auth');
const { createOrder } = require('../controllers/orderController');

const router = express.Router();

router.post('/', authRequired, createOrder);

module.exports = router;
