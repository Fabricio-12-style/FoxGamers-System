const express = require("express");
const router = express.Router();
const controller = require("../controllers/reporteController");
const { verificarToken, soloAdministradores } = require('../middlewares/authMiddleware');

router.get("/general", verificarToken, soloAdministradores, controller.getReporteGeneral);
router.get("/cajeros", verificarToken, soloAdministradores, controller.getReporteCajeros);
router.get("/exportar-cajeros-excel", verificarToken, controller.exportarExcelCajeros);
router.get("/exportar-excel", verificarToken, soloAdministradores, controller.exportarExcelReporte);
router.get("/inventario", verificarToken, soloAdministradores, controller.getReporteInventario);
router.get("/exportar-inventario-excel", verificarToken, soloAdministradores, controller.exportarExcelInventario);
router.get("/utilidades", verificarToken, soloAdministradores, controller.getReporteUtilidades);
router.get("/exportar-utilidades-excel", verificarToken, soloAdministradores, controller.exportarExcelUtilidades);
router.get("/flujo-caja", verificarToken, soloAdministradores, controller.getReporteFlujoCaja);
router.get("/exportar-flujo-excel", verificarToken, soloAdministradores, controller.exportarExcelFlujoCaja);

module.exports = router;