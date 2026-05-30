const express = require('express');
const router = express.Router();

const proveedorController = require('../controllers/proveedorController');

router.get('/', proveedorController.getProveedores);
router.post('/', proveedorController.createProveedor);
router.put('/:id', proveedorController.updateProveedor);
router.patch('/estado/:id', proveedorController.cambiarEstadoProveedor);
router.delete('/:id', proveedorController.eliminarProveedor);
router.get('/consulta/:ruc', proveedorController.consultarRUC);

module.exports = router;