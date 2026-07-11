const express = require("express");
const router = express.Router();
const { generarReporte, exportarExcelReporte } = require("../controllers/reporteController");
const { verificarToken, soloAdministradores } = require('../middlewares/authMiddleware');

router.post("/generar", verificarToken, soloAdministradores, generarReporte);
router.get("/exportar-excel", verificarToken, soloAdministradores, exportarExcelReporte);

module.exports = router;