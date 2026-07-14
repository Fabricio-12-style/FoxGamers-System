const { getConnection, sql } = require("../config/db");

class EmpresaRepository {
  async obtenerConfiguracion() {
    const pool = await getConnection();
    const result = await pool
      .request()
      .query("SELECT TOP 1 * FROM Empresa WHERE EmpresaID = 1");
    return result.recordset[0];
  }

  async upsertEmpresa(data) {
    const pool = await getConnection();
    await pool
      .request()
      .input("ruc", sql.VarChar, data.RUC)
      .input("razon", sql.VarChar, data.RazonSocial)
      .input("comercial", sql.VarChar, data.NombreComercial)
      .input("dir", sql.VarChar, data.Direccion)
      .input("tel", sql.VarChar, data.Telefono || null)
      .input("corr", sql.VarChar, data.Correo || null)
      .input("web", sql.VarChar, data.Web || null).query(`
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
  }
}
module.exports = new EmpresaRepository();
