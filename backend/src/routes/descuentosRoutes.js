const express = require("express");
const router = express.Router();
const descuentoController = require("../controllers/descuentosController");
const { verificarToken, soloAdministradores } = require('../middlewares/authMiddleware');

router.get("/", verificarToken, descuentoController.getDescuentos);
router.get("/vigentes", descuentoController.getDescuentosVigentes);
router.get("/buscar-producto", verificarToken, descuentoController.buscarProductosDsc); 
router.get("/:id", verificarToken, descuentoController.getDescuentoById);
router.post("/", verificarToken, soloAdministradores, descuentoController.createDescuento);
router.put("/:id", verificarToken, soloAdministradores, descuentoController.updateDescuento);
router.delete("/:id", verificarToken, soloAdministradores, descuentoController.deleteDescuento);

module.exports = router;