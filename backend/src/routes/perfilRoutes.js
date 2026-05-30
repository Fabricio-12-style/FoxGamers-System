const express = require("express");
const router = express.Router();
const perfilController = require("../controllers/perfilController");

router.get("/", perfilController.getPerfiles);
router.put("/bloquear/:id", perfilController.toggleBlockPerfil);
router.delete("/:id", perfilController.deletePerfil);
router.put("/:id", perfilController.updatePerfil);
router.get("/:id", perfilController.getPermisosPerfil);
router.post("/guardar", perfilController.guardarPermisosPerfil);
router.put("/bloquear/:id", perfilController.toggleBlockPerfil);
router.post('/', perfilController.createPerfil);

module.exports = router;
