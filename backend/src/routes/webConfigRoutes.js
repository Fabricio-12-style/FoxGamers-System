const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getConfigPublica,
  actualizarLogo,
  actualizarBanner,
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
    cb(null, "logo-" + uniqueSuffix);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("El archivo debe ser una imagen válida."), false);
  }
};

const upload = multer({ storage, fileFilter });

router.get("/publica", getConfigPublica);
router.post("/logo", upload.single("logo"), actualizarLogo);
router.post("/banner/:idBanner", upload.single("banner"), actualizarBanner);

module.exports = router;
