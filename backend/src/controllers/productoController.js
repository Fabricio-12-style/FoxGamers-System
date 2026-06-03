const { getConnection, sql } = require("../config/db");

// 1. Listar productos
const getProductos = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
            SELECT 
                p.ProductoID, p.Codigo, p.Nombre, p.ModeloBase, p.Atributo,
                p.StockActual, p.StockMinimo, p.PrecioCompra, p.PrecioVenta, 
                p.Activo, p.ImagenURL, p.Descripcion,
                c.Nombre AS NombreCategoria, c.CategoriaID
            FROM Inventario p
            LEFT JOIN Categoria c ON p.CategoriaID = c.CategoriaID
            ORDER BY p.ProductoID DESC
        `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error en getProductos:", error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al obtener la lista." });
  }
};

// 2. Crear producto (MODIFICADO PARA MULTER)
const createProducto = async (req, res) => {
  const {
    CategoriaID,
    Codigo,
    ModeloBase,
    Atributo,
    PrecioCompra,
    PrecioVenta,
    StockMinimo,
    Descripcion,
  } = req.body;

  const rutaImagen = req.file
    ? `/uploads/productos/${req.file.filename}`
    : null;

  // 3. Validaciones financieras y de negocio
  if (!Codigo || !ModeloBase || !CategoriaID) {
    return res.status(400).json({
      success: false,
      mensaje: "Código, Modelo y Categoría son obligatorios.",
    });
  }
  if (parseFloat(PrecioCompra) < 0 || parseFloat(PrecioVenta) < 0) {
    return res.status(400).json({
      success: false,
      mensaje: "Los precios no pueden ser negativos.",
    });
  }
  if (parseInt(StockMinimo) < 0) {
    return res.status(400).json({
      success: false,
      mensaje: "El stock mínimo no puede ser negativo.",
    });
  }

  try {
    const pool = await getConnection();

    const catRes = await pool
      .request()
      .input("catId", sql.Int, CategoriaID)
      .query("SELECT Nombre FROM Categoria WHERE CategoriaID = @catId");

    const nombreFamilia = catRes.recordset[0]?.Nombre || "General";
    const nombreFinal =
      `${nombreFamilia} ${ModeloBase.trim()} ${Atributo ? "- " + Atributo.trim() : ""}`.trim();

    await pool
      .request()
      .input("CatID", sql.Int, CategoriaID)
      .input("Cod", sql.VarChar, Codigo.trim())
      .input("Nom", sql.VarChar, nombreFinal)
      .input("Desc", sql.VarChar, Descripcion ? Descripcion.trim() : "")
      .input("PC", sql.Decimal(18, 2), PrecioCompra)
      .input("PV", sql.Decimal(18, 2), PrecioVenta)
      .input("SMin", sql.Int, StockMinimo)
      .input("Mod", sql.VarChar, ModeloBase.trim())
      .input("Atr", sql.VarChar, Atributo ? Atributo.trim() : "")
      .input("Img", sql.VarChar(sql.MAX), rutaImagen) // <--- Guardamos la ruta de texto
      .query(`
                INSERT INTO Inventario 
                (CategoriaID, Codigo, Nombre, Descripcion, StockActual, StockMinimo, PrecioCompra, PrecioVenta, Activo, FechaCreacion, ModeloBase, Atributo, ImagenURL)
                VALUES 
                (@CatID, @Cod, @Nom, @Desc, 0, @SMin, @PC, @PV, 1, GETDATE(), @Mod, @Atr, @Img)
            `);

    res.json({ success: true, mensaje: "Producto creado y catalogado." });
  } catch (error) {
    console.error("Error al crear:", error);
    res.status(500).json({
      success: false,
      mensaje: "Error al registrar producto. Verifique duplicidad de código.",
    });
  }
};

// 4. Actualizar producto (MODIFICADO PARA MULTER)
const updateProducto = async (req, res) => {
  console.log("DEBUG - BODY recibido:", req.body);
  console.log("DEBUG - ARCHIVO recibido:", req.file);

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      mensaje:
        "No se recibieron datos. Asegúrate de enviar FormData y no JSON.",
    });
  }
  const { id } = req.params;
  const {
    CategoriaID,
    Codigo,
    ModeloBase,
    Atributo,
    PrecioCompra,
    PrecioVenta,
    StockMinimo,
    Descripcion,
    Activo,
    ImagenURL,
  } = req.body;

  const rutaImagenFinal = req.file
    ? `/uploads/productos/${req.file.filename}`
    : ImagenURL || null;

  // 5. Validaciones financieras en edición
  if (!Codigo || !ModeloBase || !CategoriaID) {
    return res.status(400).json({
      success: false,
      mensaje: "Código, Modelo y Categoría son obligatorios.",
    });
  }
  if (parseFloat(PrecioCompra) < 0 || parseFloat(PrecioVenta) < 0) {
    return res.status(400).json({
      success: false,
      mensaje: "Los precios no pueden ser negativos.",
    });
  }
  if (parseInt(StockMinimo) < 0) {
    return res.status(400).json({
      success: false,
      mensaje: "El stock mínimo no puede ser negativo.",
    });
  }

  try {
    const pool = await getConnection();

    const catRes = await pool
      .request()
      .input("catId", sql.Int, CategoriaID)
      .query("SELECT Nombre FROM Categoria WHERE CategoriaID = @catId");

    const nombreFamilia = catRes.recordset[0]?.Nombre || "General";
    const nombreFinal =
      `${nombreFamilia} ${ModeloBase.trim()} ${Atributo ? "- " + Atributo.trim() : ""}`.trim();

    await pool
      .request()
      .input("id", sql.Int, id)
      .input("CatID", sql.Int, CategoriaID)
      .input("Cod", sql.VarChar, Codigo.trim())
      .input("Nom", sql.VarChar, nombreFinal)
      .input("Desc", sql.VarChar, Descripcion ? Descripcion.trim() : "")
      .input("PC", sql.Decimal(18, 2), PrecioCompra)
      .input("PV", sql.Decimal(18, 2), PrecioVenta)
      .input("SMin", sql.Int, StockMinimo)
      .input("Mod", sql.VarChar, ModeloBase.trim())
      .input("Atr", sql.VarChar, Atributo ? Atributo.trim() : "")
      .input("Img", sql.VarChar(sql.MAX), rutaImagenFinal) // <--- Guardamos la ruta final
      .input("Activo", sql.Bit, Activo).query(`
                UPDATE Inventario SET 
                CategoriaID=@CatID, Codigo=@Cod, Nombre=@Nom, Descripcion=@Desc, 
                PrecioCompra=@PC, PrecioVenta=@PV, StockMinimo=@SMin, ModeloBase=@Mod, 
                Atributo=@Atr, ImagenURL=@Img, Activo=@Activo
                WHERE ProductoID = @id
            `);

    res.json({ success: true, mensaje: "Cambios guardados correctamente." });
  } catch (error) {
    console.error("Error al actualizar:", error);
    res.status(500).json({ success: false, mensaje: "Error al actualizar." });
  }
};

// 6. Cambiar visibilidad
const cambiarEstadoProducto = async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado } = req.body;
  try {
    const pool = await getConnection();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("estado", sql.Bit, nuevoEstado)
      .query("UPDATE Inventario SET Activo = @estado WHERE ProductoID = @id");
    res.json({ success: true, mensaje: "Estado de visibilidad actualizado." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al cambiar estado." });
  }
};

// 7. Ajuste de stock transaccional
const ajustarStock = async (req, res) => {
  const { idProducto, tipoAjuste, cantidad, motivo, proveedorID, idUsuario } =
    req.body;
  const cantAjuste = parseInt(cantidad);

  if (cantAjuste <= 0) {
    return res.status(400).json({
      success: false,
      mensaje: "La cantidad a ajustar debe ser mayor a 0.",
    });
  }

  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      if (tipoAjuste === "SALIDA") {
        const checkStock = await transaction
          .request()
          .input("id", sql.Int, idProducto)
          .query("SELECT StockActual FROM Inventario WHERE ProductoID = @id");

        if (checkStock.recordset[0].StockActual < cantAjuste) {
          throw new Error("INSUFFICIENT_STOCK");
        }
      }

      const operador = tipoAjuste === "ENTRADA" ? "+" : "-";

      await transaction
        .request()
        .input("id", sql.Int, idProducto)
        .input("cant", sql.Int, cantAjuste)
        .query(
          `UPDATE Inventario SET StockActual = StockActual ${operador} @cant WHERE ProductoID = @id`,
        );

      await transaction
        .request()
        .input("pId", sql.Int, idProducto)
        .input("uId", sql.Int, idUsuario)
        .input("tipo", sql.VarChar, tipoAjuste)
        .input("cant", sql.Int, cantAjuste)
        .input("mot", sql.VarChar, motivo.trim())
        .input("provId", sql.Int, proveedorID || null).query(`
            INSERT INTO HistorialInventario (ProductoID, UsuarioID, TipoMovimiento, Cantidad, Motivo, ProveedorID, FechaMovimiento)
            VALUES (@pId, @uId, @tipo, @cant, @mot, @provId, GETDATE())
        `);

      await transaction.commit();
      res.json({
        success: true,
        mensaje: "Movimiento de stock procesado con éxito.",
      });
    } catch (errTransaccion) {
      await transaction.rollback();
      if (errTransaccion.message === "INSUFFICIENT_STOCK") {
        return res.status(400).json({
          success: false,
          mensaje: "Stock insuficiente para realizar esta salida.",
        });
      }
      throw errTransaccion;
    }
  } catch (error) {
    console.error("Error crítico en transacción:", error);
    res.status(500).json({
      success: false,
      mensaje: "Error al procesar el ajuste de almacén.",
    });
  }
};

// 10. Ver Kardex
const getKardex = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request().input("id", sql.Int, id).query(`
        SELECT 
            FORMAT(h.FechaMovimiento, 'dd/MM/yyyy HH:mm') AS fecha, 
            u.NombreUsuario AS usuario, 
            h.TipoMovimiento AS tipo, 
            h.Cantidad AS cant, 
            CASE 
                WHEN pr.RazonSocial IS NOT NULL THEN h.Motivo + ' | Prov: ' + pr.RazonSocial
                ELSE h.Motivo
            END AS motivo
        FROM HistorialInventario h
        INNER JOIN Usuario u ON h.UsuarioID = u.UsuarioID
        LEFT JOIN Proveedor pr ON h.ProveedorID = pr.ProveedorID
        WHERE h.ProductoID = @id
        ORDER BY h.FechaMovimiento DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al consultar historial." });
  }
};

// 11. Eliminar producto físicamente
const deleteProducto = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Inventario WHERE ProductoID = @id");
    res.json({ success: true, mensaje: "Producto eliminado definitivamente." });
  } catch (error) {
    if (error.number === 547) {
      return res.status(400).json({
        success: false,
        mensaje:
          "No se puede eliminar porque existen movimientos en el Kardex. Desactívelo en su lugar.",
      });
    }
    res.status(500).json({
      success: false,
      mensaje: "Error interno al eliminar el producto.",
    });
  }
};

module.exports = {
  getProductos,
  createProducto,
  updateProducto,
  cambiarEstadoProducto,
  ajustarStock,
  getKardex,
  deleteProducto,
};
