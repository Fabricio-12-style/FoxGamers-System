const { getConnection, sql } = require("../config/db");
const fs = require("fs");
const path = require("path");

// 1. OBTENER CONFIGURACIÓN COMPLETA (PÚBLICA)

const getConfigPublica = async (req, res) => {
  try {
    const pool = await getConnection();

    const confRes = await pool.request().query(`
      SELECT TOP 1 
        Banner1URL, Banner1Activo, 
        Banner2URL, Banner2Activo, 
        Banner3URL, Banner3Activo,
        LogoURL 
      FROM ConfiguracionWeb ORDER BY ConfigID DESC
    `);

    const logosRes = await pool.request().query(`
      SELECT LogoID, ImagenURL, Activo FROM GaleriaLogos ORDER BY LogoID DESC
    `);

    const data = confRes.recordset[0] || {};

    const slidersMapeados = [
      { id: 1, ImagenURL: data.Banner1URL, Activo: data.Banner1Activo ?? 1 },
      { id: 2, ImagenURL: data.Banner2URL, Activo: data.Banner2Activo ?? 1 },
      { id: 3, ImagenURL: data.Banner3URL, Activo: data.Banner3Activo ?? 1 },
    ];

    res.json({
      logos: logosRes.recordset,
      sliders: slidersMapeados,
    });
  } catch (error) {
    console.error("Error en getConfigPublica:", error);
    res.status(500).json({
      success: false,
      mensaje: "Error al obtener la configuración pública.",
    });
  }
};

// 2. GALERÍA DE LOGOS: SUBIR NUEVO LOGO

const actualizarLogo = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, mensaje: "No hay archivo cargado." });

    const logoURL = `/uploads/web/${req.file.filename}`;
    const pool = await getConnection();

    await pool
      .request()
      .input("url", sql.VarChar(sql.MAX), logoURL)
      .query("INSERT INTO GaleriaLogos (ImagenURL, Activo) VALUES (@url, 0)");

    res.json({
      success: true,
      mensaje: "Logo agregado a la galería con éxito.",
      logoURL,
    });
  } catch (error) {
    console.error("Error en actualizarLogo:", error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error de servidor al subir logo." });
  }
};

// 3. GALERÍA DE LOGOS: ESTABLECER COMO PRINCIPAL (CORREGIDO)

const establecerLogoPrincipal = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();

    await pool.request().input("id", sql.Int, id).query(`
      BEGIN TRANSACTION;
      BEGIN TRY
          UPDATE GaleriaLogos SET Activo = 0;
          
          UPDATE GaleriaLogos SET Activo = 1 WHERE LogoID = @id;
          
          UPDATE ConfiguracionWeb 
          SET LogoURL = (SELECT TOP 1 ImagenURL FROM GaleriaLogos WHERE LogoID = @id), 
              FechaActualizacion = GETDATE() 
          WHERE ConfigID = 1;
          
          COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH 
          ROLLBACK TRANSACTION;
          THROW;
      END CATCH
    `);

    res.json({
      success: true,
      mensaje: "Logo principal actualizado en todo el sistema.",
    });
  } catch (error) {
    console.error("Error crítico en establecerLogoPrincipal:", error);
    res.status(500).json({
      success: false,
      mensaje: "Error interno al cambiar el logo activo.",
    });
  }
};

// 4. GALERÍA DE LOGOS: ELIMINAR REGISTRO Y ARCHIVO

const eliminarLogo = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();

    const validacionRes = await pool.request().input("id", sql.Int, id).query(`
      SELECT ImagenURL, Activo FROM GaleriaLogos WHERE LogoID = @id;
      SELECT COUNT(*) AS TotalLogos FROM GaleriaLogos;
    `);

    const logoTarget = validacionRes.recordsets[0][0];
    const totalLogosExistentes = validacionRes.recordsets[1][0].TotalLogos;

    if (!logoTarget)
      return res
        .status(404)
        .json({ success: false, mensaje: "El logo no existe." });

    if (logoTarget.Activo || totalLogosExistentes <= 1) {
      return res.status(400).json({
        success: false,
        mensaje:
          "Operación denegada: El sistema exige mantener al menos un logo en la galería y que este no se encuentre en uso activo.",
      });
    }

    const url = logoTarget.ImagenURL;
    if (url) {
      const nom = url.split("/").pop();
      const ruta = path.join(__dirname, "..", "uploads", "web", nom);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }

    await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM GaleriaLogos WHERE LogoID = @id");
    res.json({
      success: true,
      mensaje: "Logo eliminado correctamente de la galería.",
    });
  } catch (error) {
    console.error("Error en eliminarLogo:", error);
    res.status(500).json({
      success: false,
      mensaje: "Error de servidor al ejecutar la eliminación.",
    });
  }
};

// 5. SLIDERS: CARGAR / ACTUALIZAR SLOT DE BANNER (POST)

const actualizarBanner = async (req, res) => {
  try {
    const { idBanner } = req.body;
    if (!req.file)
      return res.status(400).json({
        success: false,
        mensaje: "No se cargó ninguna imagen o archivo promocional.",
      });

    if (idBanner !== "1" && idBanner !== "2" && idBanner !== "3") {
      return res.status(400).json({
        success: false,
        mensaje: "Identificador de slot de banner inválido.",
      });
    }

    const bannerURL = `/uploads/web/${req.file.filename}`;
    const pool = await getConnection();
    const colURL = `Banner${idBanner}URL`;
    const colActivo = `Banner${idBanner}Activo`;

    const antiguoRes = await pool
      .request()
      .query(`SELECT TOP 1 ${colURL} FROM ConfiguracionWeb WHERE ConfigID = 1`);
    const antiguoBannerUrl = antiguoRes.recordset[0]?.[colURL];

    if (antiguoBannerUrl && antiguoBannerUrl.includes("/uploads/web/")) {
      const nombreArchivo = antiguoBannerUrl.split("/").pop();
      const rutaArchivo = path.join(
        __dirname,
        "..",
        "uploads",
        "web",
        nombreArchivo,
      );
      if (fs.existsSync(rutaArchivo)) fs.unlinkSync(rutaArchivo);
    }

    await pool
      .request()
      .input("url", sql.VarChar(sql.MAX), bannerURL)
      .query(
        `UPDATE ConfiguracionWeb SET ${colURL} = @url, ${colActivo} = 1, FechaActualizacion = GETDATE() WHERE ConfigID = 1`,
      );

    res.json({
      success: true,
      mensaje: `Banner Principal ${idBanner} actualizado y encendido con éxito.`,
      bannerURL,
    });
  } catch (error) {
    console.error("Error en actualizarBanner:", error);
    res.status(500).json({
      success: false,
      mensaje: "Error crítico del servidor al procesar el banner publicitario.",
    });
  }
};

// 6. SLIDERS: ACTIVAR / DESACTIVAR CAMPANAS CON ESCUDO (PUT)

const toggleSliderEstado = async (req, res) => {
  const { id } = req.params; // Slot 1, 2 o 3
  const { estado } = req.body; // Estado binario 1 o 0

  try {
    const pool = await getConnection();
    const confRes = await pool.request().query(`
      SELECT TOP 1 Banner1Activo, Banner2Activo, Banner3Activo, Banner1URL, Banner2URL, Banner3URL 
      FROM ConfiguracionWeb WHERE ConfigID = 1
    `);
    const data = confRes.recordset[0];

    if (!data)
      return res.status(404).json({
        success: false,
        mensaje: "Configuración base de la plataforma no hallada.",
      });

    let controlBanners = [
      { id: 1, url: data.Banner1URL, activo: data.Banner1Activo },
      { id: 2, url: data.Banner2URL, activo: data.Banner2Activo },
      { id: 3, url: data.Banner3URL, activo: data.Banner3Activo },
    ];

    const totalConContenidoActivo = controlBanners.filter(
      (b) => b.url && b.activo,
    ).length;

    if (
      parseInt(estado) === 0 &&
      totalConContenidoActivo <= 1 &&
      data[`Banner${id}Activo`]
    ) {
      return res.status(400).json({
        success: false,
        mensaje:
          "Operación rechazada: La Landing Page requiere obligatoriamente mantener al menos un (1) banner activo con contenido.",
      });
    }

    const colActivo = `Banner${id}Activo`;
    await pool
      .request()
      .input("estado", sql.Bit, estado)
      .query(
        `UPDATE ConfiguracionWeb SET ${colActivo} = @estado, FechaActualizacion = GETDATE() WHERE ConfigID = 1`,
      );

    res.json({
      success: true,
      mensaje: "Disponibilidad del banner promocional actualizada.",
    });
  } catch (error) {
    console.error("Error en toggleSliderEstado:", error);
    res.status(500).json({
      success: false,
      mensaje: "Error de servidor al alternar el estado del slider.",
    });
  }
};

// 7. SLIDERS: VACIAR / ELIMINAR CAMPANA DEFINITIVAMENTE (DELETE)

const eliminarSlider = async (req, res) => {
  const { id } = req.params; // Slot 1, 2 o 3
  try {
    const pool = await getConnection();
    const confRes = await pool.request().query(`
      SELECT TOP 1 Banner1Activo, Banner2Activo, Banner3Activo, Banner1URL, Banner2URL, Banner3URL 
      FROM ConfiguracionWeb WHERE ConfigID = 1
    `);
    const data = confRes.recordset[0];

    const colURL = `Banner${id}URL`;
    const colActivo = `Banner${id}Activo`;

    let controlBanners = [
      { id: 1, url: data.Banner1URL, activo: data.Banner1Activo },
      { id: 2, url: data.Banner2URL, activo: data.Banner2Activo },
      { id: 3, url: data.Banner3URL, activo: data.Banner3Activo },
    ];

    const totalConContenidoActivo = controlBanners.filter(
      (b) => b.url && b.activo,
    ).length;

    if (data[colURL] && data[colActivo] && totalConContenidoActivo <= 1) {
      return res.status(400).json({
        success: false,
        mensaje:
          "Operación rechazada: No se puede vaciar el slot de banner solicitado porque es la única promoción en línea.",
      });
    }

    const url = data[colURL];
    if (url && url.includes("/uploads/web/")) {
      const nom = url.split("/").pop();
      const ruta = path.join(__dirname, "..", "uploads", "web", nom);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }

    await pool.request().query(`
      UPDATE ConfiguracionWeb 
      SET ${colURL} = NULL, ${colActivo} = 0, FechaActualizacion = GETDATE() 
      WHERE ConfigID = 1
    `);

    res.json({
      success: true,
      mensaje: "Contenido purgado y slot de banner reiniciado correctamente.",
    });
  } catch (error) {
    console.error("Error en eliminarSlider:", error);
    res.status(500).json({
      success: false,
      mensaje: "Error crítico de servidor al intentar vaciar el slider.",
    });
  }
};

module.exports = {
  getConfigPublica,
  actualizarLogo,
  establecerLogoPrincipal,
  eliminarLogo,
  actualizarBanner,
  toggleSliderEstado,
  eliminarSlider,
};
