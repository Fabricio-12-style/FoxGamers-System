const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');

router.get('/', productoController.getProductos); 
router.post('/', productoController.createProducto);
router.put('/:id', productoController.updateProducto);
router.patch('/estado/:id', productoController.cambiarEstadoProducto);
router.post('/ajuste', productoController.ajustarStock);
router.get('/kardex/:id', productoController.getKardex);
router.delete('/:id', productoController.deleteProducto);

module.exports = router;