const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { verificarToken, soloAdministradores } = require('../middlewares/authMiddleware');

router.get("/resumen", verificarToken, soloAdministradores, dashboardController.getResumenKPIs);

module.exports = router;