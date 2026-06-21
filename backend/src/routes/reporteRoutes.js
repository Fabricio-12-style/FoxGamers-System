const express = require("express");
const router = express.Router();
const { generarReporte } = require("../controllers/reporteController");

router.post("/generar", generarReporte);

module.exports = router;
