const express = require("express");
const router = express.Router();
const productoController = require("../controllers/productoController");
const uploadProducto = require("../config/multerConfig");
const { verificarToken, soloAdministradores } = require('../middlewares/authMiddleware');

router.get("/", verificarToken, productoController.getProductos);
router.get("/pos", verificarToken, productoController.getProductosPOS);
router.get("/kardex/:id", verificarToken, productoController.getKardex);
router.get("/publicos", productoController.getProductosWebPublica); // Podría no llevar token si se muestra en una web externa

router.post("/", verificarToken, soloAdministradores, uploadProducto.single("imagen"), productoController.createProducto);
router.put("/:id", verificarToken, soloAdministradores, uploadProducto.single("imagen"), productoController.updateProducto);
router.patch("/estado/:id", verificarToken, soloAdministradores, productoController.cambiarEstadoProducto);
router.post("/ajuste", verificarToken, soloAdministradores, productoController.ajustarStock);
router.delete("/:id", verificarToken, soloAdministradores, productoController.deleteProducto);

module.exports = router;