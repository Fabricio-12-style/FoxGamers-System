const express = require("express");
const router = express.Router();
const perfilController = require("../controllers/perfilController");
const { verificarToken, soloAdministradores } = require('../middlewares/authMiddleware');

router.get("/", verificarToken, soloAdministradores, perfilController.getPerfiles);
router.get("/:id", verificarToken, soloAdministradores, perfilController.getPermisosPerfil);
router.post('/', verificarToken, soloAdministradores, perfilController.createPerfil);
router.put("/:id", verificarToken, soloAdministradores, perfilController.updatePerfil);
router.put("/bloquear/:id", verificarToken, soloAdministradores, perfilController.toggleBlockPerfil);
router.delete("/:id", verificarToken, soloAdministradores, perfilController.deletePerfil);
router.post("/guardar", verificarToken, soloAdministradores, perfilController.guardarPermisosPerfil);

module.exports = router;