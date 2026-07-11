const express = require("express");
const router = express.Router();
const clienteController = require("../controllers/clienteController");
const { verificarToken, soloAdministradores } = require('../middlewares/authMiddleware');

router.get("/", verificarToken, clienteController.getClientes);
router.post("/", verificarToken, clienteController.createCliente);
router.put("/:id", verificarToken, clienteController.updateCliente);
router.patch("/estado/:id", verificarToken, clienteController.cambiarEstadoCliente);
router.get("/consulta/:tipo/:documento", verificarToken, clienteController.consultarDocumento);
router.get("/buscar", verificarToken, clienteController.buscarCliente);
router.get("/consultar/:tipo/:documento", verificarToken, clienteController.consultarDocumento);

router.delete("/:id", verificarToken, soloAdministradores, clienteController.deleteCliente);

module.exports = router;