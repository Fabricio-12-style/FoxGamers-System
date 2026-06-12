const { getConnection, sql } = require("../config/db");

const obtenerEmpresa = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .query("SELECT TOP 1 * FROM Empresa WHERE EmpresaID = 1");
    if (result.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, mensaje: "Configuración no encontrada." });
    }
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error("Error al obtener datos de la empresa:", error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error crítico en el servidor." });
  }
};

const guardarEmpresa = async (req, res) => {
  const {
    RUC,
    RazonSocial,
    NombreComercial,
    Direccion,
    Telefono,
    Correo,
    Web,
  } = req.body;
  try {
    const pool = await getConnection();
    await pool
      .request()
      .input("ruc", sql.VarChar, RUC)
      .input("razon", sql.VarChar, RazonSocial)
      .input("comercial", sql.VarChar, NombreComercial)
      .input("dir", sql.VarChar, Direccion)
      .input("tel", sql.VarChar, Telefono || null)
      .input("corr", sql.VarChar, Correo || null)
      .input("web", sql.VarChar, Web || null).query(`
        MERGE Empresa AS Target
        USING (SELECT 1 AS EmpresaID) AS Source
        ON (Target.EmpresaID = Source.EmpresaID)
        WHEN MATCHED THEN
          UPDATE SET RUC = @ruc, RazonSocial = @razon, NombreComercial = @comercial, 
                     Direccion = @dir, Telefono = @tel, Correo = @corr, Web = @web, FechaActualizacion = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (EmpresaID, RUC, RazonSocial, NombreComercial, Direccion, Telefono, Correo, Web)
          VALUES (1, @ruc, @razon, @comercial, @dir, @tel, @corr, @web);
      `);
    res.json({
      success: true,
      mensaje: "Datos de la empresa actualizados correctamente globalmente.",
    });
  } catch (error) {
    console.error("Error al guardar datos de la empresa:", error);
    res
      .status(500)
      .json({
        success: false,
        mensaje: "Error al registrar cambios en la base de datos.",
      });
  }
};

module.exports = { obtenerEmpresa, guardarEmpresa };
