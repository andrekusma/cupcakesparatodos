const express = require('express');
const router = express.Router();
const { listCupcakes } = require('../controllers/cupcakeController');

router.get('/', listCupcakes);

module.exports = router;
