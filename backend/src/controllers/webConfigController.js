const { getConnection, sql } = require("../config/db");
const fs = require("fs");
const path = require("path");

// 1. OBTENER CONFIGURACIÓN COMPLETA 
const getConfigPublica = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT TOP 1 LogoURL, Banner1URL, Banner2URL, Banner3URL FROM ConfiguracionWeb ORDER BY ConfigID DESC
    `);

    if (result.recordset.length === 0) {
      return res.json({
        LogoURL: "../shared/img/logo-placeholder.png",
        Banner1URL: null,
        Banner2URL: null,
        Banner3URL: null,
      });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Error en getConfigPublica:", error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al obtener la configuración." });
  }
};

// 2. ACTUALIZAR LOGO PRINCIPAL
const actualizarLogo = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, mensaje: "No hay imagen." });

    const urlServidor = `${req.protocol}://${req.get("host")}`;
    const logoURL = `${urlServidor}/uploads/web/${req.file.filename}`;
    const pool = await getConnection();

    const antiguoRes = await pool
      .request()
      .query("SELECT TOP 1 LogoURL FROM ConfiguracionWeb WHERE ConfigID = 1");
    const antiguoLogoUrl = antiguoRes.recordset[0]?.LogoURL;
    if (antiguoLogoUrl && antiguoLogoUrl.includes("/uploads/web/")) {
      const nom = antiguoLogoUrl.split("/").pop();
      const ruta = path.join(__dirname, "..", "uploads", "web", nom); // Corregido con ".."
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }

    await pool
      .request()
      .input("logo", sql.VarChar(sql.MAX), logoURL)
      .query(
        "UPDATE ConfiguracionWeb SET LogoURL = @logo, FechaActualizacion = GETDATE() WHERE ConfigID = 1",
      );

    res.json({ success: true, mensaje: "Logo actualizado.", logoURL });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: "Error de servidor." });
  }
};

// 3. ACTUALIZAR BANNERS DINÁMICAMENTE
const actualizarBanner = async (req, res) => {
  try {
    const { idBanner } = req.params;
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, mensaje: "No se cargó ninguna imagen." });

    if (idBanner !== "1" && idBanner !== "2" && idBanner !== "3") {
      return res
        .status(400)
        .json({ success: false, mensaje: "Identificador de banner inválido." });
    }

    const urlServidor = `${req.protocol}://${req.get("host")}`;
    const bannerURL = `${urlServidor}/uploads/web/${req.file.filename}`;
    const pool = await getConnection();

    const columna = `Banner${idBanner}URL`;

    const antiguoRes = await pool
      .request()
      .query(
        `SELECT TOP 1 ${columna} FROM ConfiguracionWeb WHERE ConfigID = 1`,
      );
    const antiguoBannerUrl = antiguoRes.recordset[0]?.[columna];

    if (antiguoBannerUrl && antiguoBannerUrl.includes("/uploads/web/")) {
      const nombreArchivo = antiguoBannerUrl.split("/").pop();
      const rutaArchivo = path.join(
        __dirname,
        "..",
        "uploads",
        "web",
        nombreArchivo,
      ); // Corregido con ".."
      if (fs.existsSync(rutaArchivo)) fs.unlinkSync(rutaArchivo);
    }

    await pool
      .request()
      .input("url", sql.VarChar(sql.MAX), bannerURL)
      .query(
        `UPDATE ConfiguracionWeb SET ${columna} = @url, FechaActualizacion = GETDATE() WHERE ConfigID = 1`,
      );

    res.json({
      success: true,
      mensaje: `Banner ${idBanner} actualizado correctamente.`,
      bannerURL,
    });
  } catch (error) {
    console.error("Error en actualizarBanner:", error);
    res
      .status(500)
      .json({
        success: false,
        mensaje: "Error crítico al procesar el banner.",
      });
  }
};

module.exports = { getConfigPublica, actualizarLogo, actualizarBanner };
