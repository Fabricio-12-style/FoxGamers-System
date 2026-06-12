const express = require("express");
const router = express.Router();
const {
  obtenerEmpresa,
  guardarEmpresa,
} = require("../controllers/empresaController");

router.get("/publica", obtenerEmpresa);
router.post("/guardar", guardarEmpresa);

module.exports = router;
