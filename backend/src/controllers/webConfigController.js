const { getConnection, sql } = require("../config/db");
const fs = require("fs");
const path = require("path");

// 1. OBTENER CONFIGURACIÓN COMPLETA (Banners + Galería de Logos)
const getConfigPublica = async (req, res) => {
  try {
    const pool = await getConnection();
    
    const confRes = await pool.request().query(`
      SELECT TOP 1 Banner1URL, Banner2URL, Banner3URL FROM ConfiguracionWeb ORDER BY ConfigID DESC
    `);
    
    const logosRes = await pool.request().query(`
      SELECT LogoID, ImagenURL, Activo FROM GaleriaLogos ORDER BY LogoID DESC
    `);

    res.json({
      ...(confRes.recordset[0] || { Banner1URL: null, Banner2URL: null, Banner3URL: null }),
      logos: logosRes.recordset 
    });
  } catch (error) {
    console.error("Error en getConfigPublica:", error);
    res.status(500).json({ success: false, mensaje: "Error al obtener la configuración." });
  }
};

// 2. SUBIR NUEVO LOGO (A la galería)
const actualizarLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, mensaje: "No hay imagen." });

    const logoURL = `/uploads/web/${req.file.filename}`;
    const pool = await getConnection();

    await pool.request()
      .input("url", sql.VarChar(sql.MAX), logoURL)
      .query("INSERT INTO GaleriaLogos (ImagenURL, Activo) VALUES (@url, 0)");

    res.json({ success: true, mensaje: "Logo agregado a la galería.", logoURL });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: "Error de servidor." });
  }
};

// 3. ESTABLECER LOGO COMO PRINCIPAL (NUEVO)
const establecerLogoPrincipal = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getConnection();
        
        await pool.request().query("UPDATE GaleriaLogos SET Activo = 0");
        
        await pool.request()
            .input("id", sql.Int, id)
            .query("UPDATE GaleriaLogos SET Activo = 1 WHERE LogoID = @id");

        await pool.request().input("id", sql.Int, id).query(`
            UPDATE ConfiguracionWeb 
            SET LogoURL = (SELECT ImagenURL FROM GaleriaLogos WHERE LogoID = @id), 
                FechaActualizacion = GETDATE() 
            WHERE ConfigID = 1
        `);

        res.json({ success: true, mensaje: "Logo principal actualizado." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, mensaje: "Error al cambiar el logo activo." });
    }
};

// 4. ELIMINAR LOGO DE LA GALERÍA (NUEVO)
const eliminarLogo = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getConnection();
        
        const imgRes = await pool.request().input("id", sql.Int, id).query("SELECT ImagenURL, Activo FROM GaleriaLogos WHERE LogoID = @id");
        if (imgRes.recordset.length === 0) return res.status(404).json({ success: false });
        
        if (imgRes.recordset[0].Activo) {
            return res.status(400).json({ success: false, mensaje: "No puedes eliminar el logo que está en uso actualmente." });
        }

        const url = imgRes.recordset[0].ImagenURL;
        if (url) {
            const nom = url.split("/").pop();
            const ruta = path.join(__dirname, "..", "uploads", "web", nom);
            if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
        }

        await pool.request().input("id", sql.Int, id).query("DELETE FROM GaleriaLogos WHERE LogoID = @id");

        res.json({ success: true, mensaje: "Logo eliminado correctamente." });
    } catch(error) {
         console.error(error);
         res.status(500).json({ success: false, mensaje: "Error al eliminar." });
    }
};

// 5. ACTUALIZAR BANNERS DINÁMICAMENTE (Queda idéntico, tu lógica era perfecta)
const actualizarBanner = async (req, res) => {
  try {
    const { idBanner } = req.params;
    if (!req.file) return res.status(400).json({ success: false, mensaje: "No se cargó ninguna imagen." });

    if (idBanner !== "1" && idBanner !== "2" && idBanner !== "3") {
      return res.status(400).json({ success: false, mensaje: "Identificador de banner inválido." });
    }

    const bannerURL = `/uploads/web/${req.file.filename}`;
    const pool = await getConnection();
    const columna = `Banner${idBanner}URL`;

    const antiguoRes = await pool.request().query(`SELECT TOP 1 ${columna} FROM ConfiguracionWeb WHERE ConfigID = 1`);
    const antiguoBannerUrl = antiguoRes.recordset[0]?.[columna];

    if (antiguoBannerUrl && antiguoBannerUrl.includes("/uploads/web/")) {
      const nombreArchivo = antiguoBannerUrl.split("/").pop();
      const rutaArchivo = path.join(__dirname, "..", "uploads", "web", nombreArchivo); 
      if (fs.existsSync(rutaArchivo)) fs.unlinkSync(rutaArchivo);
    }

    await pool.request()
      .input("url", sql.VarChar(sql.MAX), bannerURL)
      .query(`UPDATE ConfiguracionWeb SET ${columna} = @url, FechaActualizacion = GETDATE() WHERE ConfigID = 1`);

    res.json({ success: true, mensaje: `Banner ${idBanner} actualizado correctamente.`, bannerURL });
  } catch (error) {
    console.error("Error en actualizarBanner:", error);
    res.status(500).json({ success: false, mensaje: "Error crítico al procesar el banner." });
  }
};

module.exports = { 
    getConfigPublica, 
    actualizarLogo, 
    establecerLogoPrincipal, 
    eliminarLogo, 
    actualizarBanner 
};