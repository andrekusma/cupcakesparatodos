const express = require('express');
const { listCupcakes } = require('../controllers/cupcakeController');

const router = express.Router();

// Público
router.get('/cupcakes', listCupcakes);

module.exports = router;
