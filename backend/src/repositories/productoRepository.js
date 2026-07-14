const { getConnection, sql } = require("../config/db");

class ProductoRepository {
  async listar(busqueda = "") {
    const pool = await getConnection();
    const request = pool.request();
    let query = "";

    if (busqueda && busqueda.trim() !== "") {
      request.input("search", sql.VarChar, `%${busqueda.trim()}%`);
      query = `SELECT p.ProductoID, p.Codigo, p.Nombre, p.ModeloBase, p.Atributo, p.StockActual, p.StockMinimo, p.PrecioCompra, p.PrecioVenta, p.Activo, p.ImagenURL, p.Descripcion, c.Nombre AS NombreCategoria, c.CategoriaID FROM Inventario p LEFT JOIN Categoria c ON p.CategoriaID = c.CategoriaID WHERE p.ModeloBase LIKE @search OR p.Atributo LIKE @search OR p.Codigo LIKE @search ORDER BY p.ProductoID DESC`;
    } else {
      query = `SELECT TOP 5 p.ProductoID, p.Codigo, p.Nombre, p.ModeloBase, p.Atributo, p.StockActual, p.StockMinimo, p.PrecioCompra, p.PrecioVenta, p.Activo, p.ImagenURL, p.Descripcion, c.Nombre AS NombreCategoria, c.CategoriaID FROM Inventario p LEFT JOIN Categoria c ON p.CategoriaID = c.CategoriaID ORDER BY CASE WHEN p.StockActual <= p.StockMinimo THEN 0 ELSE 1 END ASC, p.ProductoID DESC`;
    }
    const result = await request.query(query);
    return result.recordset;
  }

  async obtenerNombreCategoria(catId) {
    const pool = await getConnection();
    const res = await pool
      .request()
      .input("catId", sql.Int, catId)
      .query("SELECT Nombre FROM Categoria WHERE CategoriaID = @catId");
    return res.recordset[0]?.Nombre || "General";
  }

  async crear(data) {
    const pool = await getConnection();
    await pool
      .request()
      .input("CatID", sql.Int, data.CategoriaID)
      .input("Cod", sql.VarChar, data.Codigo)
      .input("Nom", sql.VarChar, data.NombreFinal)
      .input("Desc", sql.VarChar, data.Descripcion)
      .input("PC", sql.Decimal(18, 2), data.PrecioCompra)
      .input("PV", sql.Decimal(18, 2), data.PrecioVenta)
      .input("SMin", sql.Int, data.StockMinimo)
      .input("Mod", sql.VarChar, data.ModeloBase)
      .input("Atr", sql.VarChar, data.Atributo)
      .input("Img", sql.VarChar(sql.MAX), data.ImagenURL)
      .query(
        `INSERT INTO Inventario (CategoriaID, Codigo, Nombre, Descripcion, StockActual, StockMinimo, PrecioCompra, PrecioVenta, Activo, FechaCreacion, ModeloBase, Atributo, ImagenURL) VALUES (@CatID, @Cod, @Nom, @Desc, 0, @SMin, @PC, @PV, 1, GETDATE(), @Mod, @Atr, @Img)`,
      );
  }

  async actualizar(id, data) {
    const pool = await getConnection();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("CatID", sql.Int, data.CategoriaID)
      .input("Cod", sql.VarChar, data.Codigo)
      .input("Nom", sql.VarChar, data.NombreFinal)
      .input("Desc", sql.VarChar, data.Descripcion)
      .input("PC", sql.Decimal(18, 2), data.PrecioCompra)
      .input("PV", sql.Decimal(18, 2), data.PrecioVenta)
      .input("SMin", sql.Int, data.StockMinimo)
      .input("Mod", sql.VarChar, data.ModeloBase)
      .input("Atr", sql.VarChar, data.Atributo)
      .input("Img", sql.VarChar(sql.MAX), data.ImagenURL)
      .input("Activo", sql.Bit, data.Activo)
      .query(
        `UPDATE Inventario SET CategoriaID=@CatID, Codigo=@Cod, Nombre=@Nom, Descripcion=@Desc, PrecioCompra=@PC, PrecioVenta=@PV, StockMinimo=@SMin, ModeloBase=@Mod, Atributo=@Atr, ImagenURL=@Img, Activo=@Activo WHERE ProductoID = @id`,
      );
  }

  async cambiarEstado(id, estado) {
    const pool = await getConnection();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("estado", sql.Bit, estado)
      .query("UPDATE Inventario SET Activo = @estado WHERE ProductoID = @id");
  }

  async eliminar(id) {
    const pool = await getConnection();
    await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Inventario WHERE ProductoID = @id");
  }

  async ajustarStockTransaction(data) {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      if (data.tipoAjuste === "SALIDA") {
        const check = await transaction
          .request()
          .input("id", sql.Int, data.idProducto)
          .query("SELECT StockActual FROM Inventario WHERE ProductoID = @id");
        if (check.recordset[0].StockActual < data.cantAjuste)
          throw new Error("INSUFFICIENT_STOCK");
      }
      const operador = data.tipoAjuste === "ENTRADA" ? "+" : "-";
      await transaction
        .request()
        .input("id", sql.Int, data.idProducto)
        .input("cant", sql.Int, data.cantAjuste)
        .query(
          `UPDATE Inventario SET StockActual = StockActual ${operador} @cant WHERE ProductoID = @id`,
        );
      await transaction
        .request()
        .input("pId", sql.Int, data.idProducto)
        .input("uId", sql.Int, data.idUsuario)
        .input("tipo", sql.VarChar, data.tipoAjuste)
        .input("cant", sql.Int, data.cantAjuste)
        .input("mot", sql.VarChar, data.motivo)
        .input("provId", sql.Int, data.proveedorID || null)
        .query(
          `INSERT INTO HistorialInventario (ProductoID, UsuarioID, TipoMovimiento, Cantidad, Motivo, ProveedorID, FechaMovimiento) VALUES (@pId, @uId, @tipo, @cant, @mot, @provId, GETDATE())`,
        );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async listarPOS() {
    const pool = await getConnection();
    return (
      await pool
        .request()
        .query(
          "SELECT ProductoID, Codigo, Nombre, ModeloBase, Atributo, StockActual, PrecioVenta, Activo, CategoriaID, ImagenURL FROM Inventario WHERE Activo = 1",
        )
    ).recordset;
  }

  async listarWeb() {
    const pool = await getConnection();
    return (
      await pool
        .request()
        .query(
          "SELECT p.ProductoID, p.Codigo, p.Nombre, p.ModeloBase, p.Atributo, p.StockActual, p.PrecioVenta, p.Activo, p.ImagenURL, p.Descripcion, c.Nombre AS CategoriaNombre, p.CategoriaID FROM Inventario p INNER JOIN Categoria c ON p.CategoriaID = c.CategoriaID WHERE p.Activo = 1 ORDER BY p.ProductoID DESC",
        )
    ).recordset;
  }

  async obtenerKardex(id) {
    const pool = await getConnection();
    return (
      await pool
        .request()
        .input("id", sql.Int, id)
        .query(
          `SELECT FORMAT(h.FechaMovimiento, 'dd/MM/yyyy HH:mm') AS fecha, u.NombreUsuario AS usuario, h.TipoMovimiento AS tipo, h.Cantidad AS cant, CASE WHEN pr.RazonSocial IS NOT NULL THEN h.Motivo + ' | Prov: ' + pr.RazonSocial ELSE h.Motivo END AS motivo FROM HistorialInventario h INNER JOIN Usuario u ON h.UsuarioID = u.UsuarioID LEFT JOIN Proveedor pr ON h.ProveedorID = pr.ProveedorID WHERE h.ProductoID = @id ORDER BY h.FechaMovimiento DESC`,
        )
    ).recordset;
  }
}
module.exports = new ProductoRepository();