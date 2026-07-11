const express = require("express");
const router = express.Router();
const ventaController = require("../controllers/ventaController");
const { verificarToken } = require('../middlewares/authMiddleware');

router.post("/finalizar", verificarToken, ventaController.finalizarVenta);
router.get("/", verificarToken, ventaController.getVentas);
router.get("/:id", verificarToken, ventaController.getVentaById);
router.post("/enviar-ticket/:id", verificarToken, ventaController.enviarTicketPorCorreo);

router.patch("/anular/:id", verificarToken, ventaController.anularVenta);

module.exports = router;