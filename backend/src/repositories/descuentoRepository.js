const { getConnection, sql } = require("../config/db");

class DescuentoRepository {
  async getAll() {
    const pool = await getConnection();
    return (await pool.request().query(`
            SELECT d.*, CASE WHEN d.AplicaA = 'CATEGORIA' THEN c.Nombre WHEN d.AplicaA = 'PRODUCTO' THEN i.Nombre ELSE 'General' END AS NombreReferencia
            FROM Descuento d
            LEFT JOIN Categoria c ON d.AplicaA = 'CATEGORIA' AND d.ReferenciaID = c.CategoriaID
            LEFT JOIN Inventario i ON d.AplicaA = 'PRODUCTO' AND d.ReferenciaID = i.ProductoID
            ORDER BY d.FechaCreacion DESC`)).recordset;
  }

  async getById(id) {
    const pool = await getConnection();
    return (await pool.request().input("id", sql.Int, id).query("SELECT d.*, CASE WHEN d.AplicaA = 'CATEGORIA' THEN c.Nombre WHEN d.AplicaA = 'PRODUCTO' THEN i.Nombre ELSE 'General' END AS NombreReferencia FROM Descuento d LEFT JOIN Categoria c ON d.AplicaA = 'CATEGORIA' AND d.ReferenciaID = c.CategoriaID LEFT JOIN Inventario i ON d.AplicaA = 'PRODUCTO' AND d.ReferenciaID = i.ProductoID WHERE DescuentoID = @id")).recordset[0];
  }

  async getVigentes() {
    const pool = await getConnection();
    return (await pool.request().query("SELECT DescuentoID, Nombre, TipoDescuento, Valor, AplicaA, ReferenciaID FROM Descuento WHERE Activo = 1")).recordset;
  }

  async create(data) {
    const pool = await getConnection();
    await pool.request()
      .input("Nombre", sql.VarChar, data.Nombre).input("Desc", sql.VarChar, data.Descripcion)
      .input("Tipo", sql.VarChar, data.TipoDescuento).input("Valor", sql.Decimal(18, 2), data.Valor)
      .input("FI", sql.Date, data.FechaInicio).input("FF", sql.Date, data.FechaFin)
      .input("Apl", sql.VarChar, data.AplicaA).input("Ref", sql.Int, data.ReferenciaID)
      .input("Modo", sql.VarChar, data.ModoControl).input("Act", sql.Bit, data.ModoControl === 'FORZAR_ON' ? 1 : 0)
      .query(`INSERT INTO Descuento (Nombre, Descripcion, TipoDescuento, Valor, FechaInicio, FechaFin, AplicaA, ReferenciaID, ModoControl, Activo, FechaCreacion) 
                    VALUES (@Nombre, @Desc, @Tipo, @Valor, @FI, @FF, @Apl, @Ref, @Modo, @Act, GETDATE())`);
  }

  async update(id, data) {
    const pool = await getConnection();
    await pool.request()
      .input("id", sql.Int, id).input("Nombre", sql.VarChar, data.Nombre).input("Desc", sql.VarChar, data.Descripcion)
      .input("Tipo", sql.VarChar, data.TipoDescuento).input("Valor", sql.Decimal(18, 2), data.Valor)
      .input("FI", sql.Date, data.FechaInicio).input("FF", sql.Date, data.FechaFin)
      .input("Apl", sql.VarChar, data.AplicaA).input("Ref", sql.Int, data.ReferenciaID)
      .input("Modo", sql.VarChar, data.ModoControl).input("Act", sql.Bit, data.ModoControl === 'FORZAR_ON' ? 1 : 0)
      .query(`UPDATE Descuento SET Nombre=@Nombre, Descripcion=@Desc, TipoDescuento=@Tipo, Valor=@Valor, FechaInicio=@FI, FechaFin=@FF, AplicaA=@Apl, ReferenciaID=@Ref, ModoControl=@Modo, Activo=@Act WHERE DescuentoID=@id`);
  }

  async delete(id) {
    const pool = await getConnection();
    await pool.request().input("id", sql.Int, id).query("DELETE FROM Descuento WHERE DescuentoID = @id");
  }

  // 🚀 NUEVO: Buscador ultra rápido para el Autocomplete
  async buscarProductos(q) {
    const pool = await getConnection();
    return (await pool.request()
      .input("q", sql.VarChar, `%${q}%`)
      .query("SELECT TOP 10 ProductoID, Codigo, Nombre, PrecioVenta FROM Inventario WHERE (Nombre LIKE @q OR Codigo LIKE @q) AND Activo = 1")).recordset;
  }
}
module.exports = new DescuentoRepository();