const express = require('express');
const router = express.Router();
const proveedorController = require('../controllers/proveedorController');
const { verificarToken, soloAdministradores } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, proveedorController.getProveedores);
router.get('/consulta/:ruc', verificarToken, proveedorController.consultarRUC);

router.post('/', verificarToken, soloAdministradores, proveedorController.createProveedor);
router.put('/:id', verificarToken, soloAdministradores, proveedorController.updateProveedor);
router.patch('/estado/:id', verificarToken, soloAdministradores, proveedorController.cambiarEstadoProveedor);
router.delete('/:id', verificarToken, soloAdministradores, proveedorController.eliminarProveedor);

module.exports = router;