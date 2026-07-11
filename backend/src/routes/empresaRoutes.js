const express = require("express");
const router = express.Router();
const { obtenerEmpresa, guardarEmpresa } = require("../controllers/empresaController");
const { verificarToken, soloAdministradores } = require('../middlewares/authMiddleware');

router.get("/publica", obtenerEmpresa); 

router.post("/guardar", verificarToken, soloAdministradores, guardarEmpresa);

module.exports = router;