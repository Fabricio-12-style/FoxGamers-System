const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads/web");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage: storage });

const {
  getConfigPublica,
  actualizarLogo,
  establecerLogoPrincipal,
  eliminarLogo,
  crearSlider,
  actualizarSlider,
  toggleSliderEstado,
  eliminarSlider,
} = require("../controllers/webConfigController");

const { verificarToken, soloAdministradores } = require("../middlewares/authMiddleware");


router.get("/publica", getConfigPublica);

router.post("/logo", verificarToken, soloAdministradores, upload.single("logo"), actualizarLogo);
router.put("/logo/activo/:id", verificarToken, soloAdministradores, establecerLogoPrincipal);
router.delete("/logo/:id", verificarToken, soloAdministradores, eliminarLogo);

router.post("/slider", verificarToken, soloAdministradores, upload.single("slider"), crearSlider);
router.put("/slider/:id", verificarToken, soloAdministradores, upload.single("slider"), actualizarSlider);
router.put("/slider/estado/:id", verificarToken, soloAdministradores, toggleSliderEstado);
router.delete("/slider/:id", verificarToken, soloAdministradores, eliminarSlider);

module.exports = router;