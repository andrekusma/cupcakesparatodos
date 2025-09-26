const express = require('express');
const router = express.Router();
const { listCupcakes } = require('../controllers/cupcakeController');

router.get('/', listCupcakes); // GET /api/cupcakes

module.exports = router;
