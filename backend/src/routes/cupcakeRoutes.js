const express = require('express');
const { listCupcakes } = require('../controllers/cupcakeController');

const router = express.Router();

router.get('/', listCupcakes);

module.exports = router;
