const { getConnection, sql } = require("../config/db");

class ProveedorRepository {
  async listar() {
    const pool = await getConnection();
    const result = await pool.request().query(`
            SELECT ProveedorID, RazonSocial, RUC, Direccion, Telefono, Correo, Contacto, Activo, FechaCreacion
            FROM Proveedor
            ORDER BY ProveedorID DESC
        `);
    return result.recordset;
  }

  async crear(data) {
    const pool = await getConnection();
    await pool
      .request()
      .input("RazonSocial", sql.VarChar, data.RazonSocial)
      .input("RUC", sql.VarChar, data.RUC)
      .input("Direccion", sql.VarChar, data.Direccion || "")
      .input("Telefono", sql.VarChar, data.Telefono || "")
      .input("Correo", sql.VarChar, data.Correo || "")
      .input("Contacto", sql.VarChar, data.Contacto || "").query(`
                INSERT INTO Proveedor (RazonSocial, RUC, Direccion, Telefono, Correo, Contacto, Activo, FechaCreacion)
                VALUES (@RazonSocial, @RUC, @Direccion, @Telefono, @Correo, @Contacto, 1, GETDATE())
            `);
  }

  async actualizar(id, data) {
    const pool = await getConnection();
    await pool
      .request()
      .input("ID", sql.Int, id)
      .input("RazonSocial", sql.VarChar, data.RazonSocial)
      .input("RUC", sql.VarChar, data.RUC)
      .input("Direccion", sql.VarChar, data.Direccion || "")
      .input("Telefono", sql.VarChar, data.Telefono || "")
      .input("Correo", sql.VarChar, data.Correo || "")
      .input("Contacto", sql.VarChar, data.Contacto || "").query(`
                UPDATE Proveedor 
                SET RazonSocial = @RazonSocial, RUC = @RUC, Direccion = @Direccion, 
                    Telefono = @Telefono, Correo = @Correo, Contacto = @Contacto 
                WHERE ProveedorID = @ID
            `);
  }

  async cambiarEstado(id, estado) {
    const pool = await getConnection();
    await pool
      .request()
      .input("ID", sql.Int, id)
      .input("Estado", sql.Bit, estado)
      .query("UPDATE Proveedor SET Activo = @Estado WHERE ProveedorID = @ID");
  }

  async eliminar(id) {
    const pool = await getConnection();
    await pool
      .request()
      .input("ID", sql.Int, id)
      .query("DELETE FROM Proveedor WHERE ProveedorID = @ID");
  }
}

module.exports = new ProveedorRepository();