const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");

router.get("/resumen", dashboardController.getResumenKPIs);


module.exports = router;
