const express = require("express");
const router = express.Router();
const categoriaController = require("../controllers/categoriaController");
const {
  verificarToken,
  soloAdministradores,
} = require("../middlewares/authMiddleware");

router.get("/", verificarToken, categoriaController.getCategorias);
router.get("/activas", verificarToken, categoriaController.getCategoriasActivas);

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

router.delete(
  "/:id",
  verificarToken,
  soloAdministradores,
  categoriaController.deleteCategoria,
);

module.exports = router;