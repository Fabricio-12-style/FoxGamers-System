const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getConfigPublica,
  actualizarLogo,
  actualizarBanner,
  establecerLogoPrincipal,
  eliminarLogo,
  toggleSliderEstado,
  eliminarSlider,
} = require("../controllers/webConfigController");

const dir = "./uploads/web";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Formato denegado. El servidor solo admite archivos de imagen válidos (JPG o PNG).",
      ),
      false,
    );
  }
};

const upload = multer({ storage, fileFilter });

router.get("/publica", getConfigPublica);
router.post("/logo", upload.single("logo"), actualizarLogo);
router.put("/logo/activo/:id", establecerLogoPrincipal);
router.delete("/logo/:id", eliminarLogo);
router.post("/slider", upload.single("slider"), actualizarBanner);
router.put("/slider/estado/:id", toggleSliderEstado);
router.delete("/slider/:id", eliminarSlider);

module.exports = router;