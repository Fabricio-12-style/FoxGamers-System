const express = require("express");
const router = express.Router();

const { generarReporte, exportarExcelReporte } = require("../controllers/reporteController");

router.post("/generar", generarReporte);

router.get("/exportar-excel", exportarExcelReporte);

module.exports = router;