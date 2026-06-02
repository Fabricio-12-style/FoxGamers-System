const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./routes/authRoutes");

const app = express();
const clienteRoutes = require("./routes/clienteRoutes");
const userRoutes = require("./routes/userRoutes");
const inventarioRoutes = require("./routes/inventarioRoutes");
const categoriaRoutes = require("./routes/categoriaRoutes");
const productoRoutes = require("./routes/productoRoutes");
const ventaRoutes = require("./routes/ventaRoutes");
const proveedorRoutes = require("./routes/proveedorRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const perfilRoutes = require("./routes/perfilRoutes");
const webConfigRoutes = require("./routes/webConfigRoutes");

// Middlewares
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/perfiles", perfilRoutes);
app.use("/api/permisos", perfilRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/ventas", ventaRoutes);
app.use("/api/proveedores", proveedorRoutes);
app.use("/api/config-web", webConfigRoutes);


app.get("/test", (req, res) => {
  res.json({ message: "Server is working" });
});

console.log(
  "Routes mounted: /api/auth, /api/usuarios, /api/perfiles, /api/permisos, /api/inventario, /api/clientes, /api/ventas, /api/categorias, /api/productos, /api/dashboard, /api/config-web  ",
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de FOX GAMERS corriendo en puerto ${PORT}`);
});
