const { getConnection, sql } = require("../config/db");

class ClienteRepository {
  async listar(terminoBusqueda = "") {
    const pool = await getConnection();
    const request = pool.request();
    let query = "";

    if (terminoBusqueda && terminoBusqueda.trim() !== "") {
      request.input("search", sql.VarChar, `%${terminoBusqueda.trim()}%`);
      query = `
                SELECT ClienteID, TipoDocumento, Documento, NombreRazonSocial, Telefono, Correo, Direccion, Activo, FORMAT(FechaCreacion, 'yyyy-MM-dd HH:mm:ss') AS FechaCreacion
                FROM Cliente WHERE Documento LIKE @search OR NombreRazonSocial LIKE @search ORDER BY FechaCreacion DESC
            `;
    } else {
      query = `
                SELECT TOP 5 ClienteID, TipoDocumento, Documento, NombreRazonSocial, Telefono, Correo, Direccion, Activo, FORMAT(FechaCreacion, 'yyyy-MM-dd HH:mm:ss') AS FechaCreacion
                FROM Cliente ORDER BY FechaCreacion DESC
            `;
    }
    const result = await request.query(query);
    return result.recordset;
  }

  async buscarPorDocumento(documento, idExcluido = null) {
    const pool = await getConnection();
    let query = "SELECT ClienteID FROM Cliente WHERE Documento = @Doc";
    const request = pool.request().input("Doc", sql.VarChar, documento);

    if (idExcluido) {
      query += " AND ClienteID != @ID";
      request.input("ID", sql.Int, idExcluido);
    }
    const result = await request.query(query);
    return result.recordset[0];
  }

  async crear(data) {
    const pool = await getConnection();
    await pool
      .request()
      .input("TipoDocumento", sql.VarChar, data.TipoDocumento)
      .input("Documento", sql.VarChar, data.Documento)
      .input("NombreRazonSocial", sql.VarChar, data.NombreRazonSocial.trim())
      .input("Telefono", sql.VarChar, data.Telefono || "")
      .input("Correo", sql.VarChar, data.Correo ? data.Correo.trim() : "")
      .input(
        "Direccion",
        sql.VarChar,
        data.Direccion ? data.Direccion.trim() : "",
      ).query(`
                INSERT INTO Cliente (TipoDocumento, Documento, NombreRazonSocial, Telefono, Correo, Direccion, Activo, FechaCreacion)
                VALUES (@TipoDocumento, @Documento, @NombreRazonSocial, @Telefono, @Correo, @Direccion, 1, GETDATE())
            `);
  }

  async actualizar(id, data) {
    const pool = await getConnection();
    await pool
      .request()
      .input("ClienteID", sql.Int, id)
      .input("TipoDocumento", sql.VarChar, data.TipoDocumento)
      .input("Documento", sql.VarChar, data.Documento)
      .input("NombreRazonSocial", sql.VarChar, data.NombreRazonSocial.trim())
      .input(
        "Direccion",
        sql.VarChar,
        data.Direccion ? data.Direccion.trim() : "",
      )
      .input("Telefono", sql.VarChar, data.Telefono || "")
      .input("Correo", sql.VarChar, data.Correo ? data.Correo.trim() : "")
      .query(`
                UPDATE Cliente SET TipoDocumento = @TipoDocumento, Documento = @Documento, NombreRazonSocial = @NombreRazonSocial, 
                Direccion = @Direccion, Telefono = @Telefono, Correo = @Correo WHERE ClienteID = @ClienteID
            `);
  }

  async cambiarEstado(id, estado) {
    const pool = await getConnection();
    await pool
      .request()
      .input("ID", sql.Int, id)
      .input("Estado", sql.Bit, estado)
      .query("UPDATE Cliente SET Activo = @Estado WHERE ClienteID = @ID");
  }

  async eliminar(id) {
    const pool = await getConnection();
    await pool
      .request()
      .input("ClienteID", sql.Int, id)
      .query("DELETE FROM Cliente WHERE ClienteID = @ClienteID");
  }

  async buscarLigeroPOS(terminoBusqueda) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("busqueda", sql.VarChar, `%${terminoBusqueda}%`).query(`
            SELECT TOP 10 ClienteID, Documento, NombreRazonSocial FROM Cliente 
            WHERE Activo = 1 AND (Documento LIKE @busqueda OR NombreRazonSocial LIKE @busqueda)
        `);
    return result.recordset;
  }
}
module.exports = new ClienteRepository();