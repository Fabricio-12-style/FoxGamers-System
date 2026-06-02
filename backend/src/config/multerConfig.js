const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 1. Asegurarnos de que la carpeta exista, si no, la creamos
const dirProductos = path.join(__dirname, "../../uploads/productos");
if (!fs.existsSync(dirProductos)) {
  fs.mkdirSync(dirProductos, { recursive: true });
}

// 2. Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Le decimos a Multer dónde guardar las fotos de los productos
    cb(null, dirProductos);
  },
  filename: function (req, file, cb) {
    // Generamos un nombre único para evitar que se sobrescriban archivos con el mismo nombre
    // Ejemplo: producto-16850239021-987452.jpg
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "producto-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// 3. Filtro de seguridad (Solo aceptar imágenes)
const fileFilter = (req, file, cb) => {
  const tiposPermitidos = /jpeg|jpg|png|webp/;
  const extensionCorrecta = tiposPermitidos.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimeCorrecto = tiposPermitidos.test(file.mimetype);

  if (extensionCorrecta && mimeCorrecto) {
    return cb(null, true);
  } else {
    cb(
      new Error("Solo se permiten formatos de imagen (JPEG, JPG, PNG, WEBP)"),
      false,
    );
  }
};

// 4. Exportar el middleware configurado (Límite de peso: 5MB)
const uploadProducto = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB de límite
  fileFilter: fileFilter,
});

module.exports = uploadProducto;
