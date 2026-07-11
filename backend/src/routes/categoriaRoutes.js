const express = require("express");
const router = express.Router();
const categoriaController = require("../controllers/categoriaController");
const {
  verificarToken,
  soloAdministradores,
} = require("../middlewares/authMiddleware");

router.get("/", verificarToken, categoriaController.getCategorias);

router.post(
  "/",
  verificarToken,
  soloAdministradores,
  categoriaController.createCategoria,
);
router.put(
  "/:id",
  verificarToken,
  soloAdministradores,
  categoriaController.updateCategoria,
);
router.patch(
  "/estado/:id",
  verificarToken,
  soloAdministradores,
  categoriaController.cambiarEstadoCategoria,
);

module.exports = router;