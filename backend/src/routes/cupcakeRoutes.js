const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/cupcakeController');

router.get('/cupcakes', ctrl.listCupcakes);

module.exports = router;
