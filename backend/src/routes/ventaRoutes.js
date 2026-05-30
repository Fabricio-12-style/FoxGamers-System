const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/ventaController');

router.post('/finalizar', ventaController.finalizarVenta);

module.exports = router;