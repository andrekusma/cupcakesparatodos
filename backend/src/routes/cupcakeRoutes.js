const express = require('express');
const router = express.Router();

const cupcakeController = require('../controllers/cupcakeController');

router.get('/cupcakes', cupcakeController.listCupcakes);

module.exports = router;
