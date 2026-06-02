const express = require("express");
const router = express.Router();
const ventaController = require("../controllers/ventaController");

router.post("/finalizar", ventaController.finalizarVenta);
router.get("/", ventaController.getVentas);
router.get("/:id", ventaController.getVentaById);
router.patch("/anular/:id", ventaController.anularVenta);

module.exports = router;
