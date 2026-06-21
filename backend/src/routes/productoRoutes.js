const express = require("express");
const router = express.Router();
const productoController = require("../controllers/productoController");

const uploadProducto = require("../config/multerConfig");

router.get("/", productoController.getProductos);

router.post(
  "/",
  uploadProducto.single("imagen"),
  productoController.createProducto,
);

router.put(
  "/:id",
  uploadProducto.single("imagen"),
  productoController.updateProducto,
);

router.patch("/estado/:id", productoController.cambiarEstadoProducto);
router.post("/ajuste", productoController.ajustarStock);
router.get("/kardex/:id", productoController.getKardex);
router.delete("/:id", productoController.deleteProducto);
router.get("/pos", productoController.getProductosPOS);

module.exports = router;
