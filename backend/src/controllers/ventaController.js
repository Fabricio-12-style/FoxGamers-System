const { getConnection, sql } = require("../config/db");

const finalizarVenta = async (req, res) => {
  const { ClienteID, UsuarioID, NumeroDoc, MetodoPago, Observacion, items } =
    req.body;
  let transaction;

  try {
    const pool = await getConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    let realTotal = 0;
    const itemsValidados = [];

    // 1. RECALCULAR PRECIOS Y VALIDAR STOCK EN TIEMPO REAL
    for (const item of items) {
      const checkProd = await transaction
        .request()
        .input("pId", sql.Int, item.ProductoID)
        .query(
          "SELECT Nombre, PrecioVenta, StockActual FROM Inventario WHERE ProductoID = @pId",
        );

      if (checkProd.recordset.length === 0) {
        throw new Error(`El producto con ID ${item.ProductoID} no existe.`);
      }

      const dbProd = checkProd.recordset[0];

      if (dbProd.StockActual < item.cantidad) {
        throw new Error(
          `Stock insuficiente para: ${dbProd.Nombre}. Disponible: ${dbProd.StockActual}`,
        );
      }

      const precioReal = dbProd.PrecioVenta;
      const subtotalItem = precioReal * item.cantidad;
      realTotal += subtotalItem;

      itemsValidados.push({
        ProductoID: item.ProductoID,
        Cantidad: item.cantidad,
        PrecioUnitario: precioReal,
        Subtotal: subtotalItem,
      });
    }

    // 2. CÁLCULO FINANCIERO EXACTO (IGV 18% para Perú)
    const realSubtotal = realTotal / 1.18;
    const realIGV = realTotal - realSubtotal;

    // 3. Insertar Cabecera de Venta
    const ventaRes = await transaction
      .request()
      .input("ClienteID", sql.Int, ClienteID || null)
      .input("UsuarioID", sql.Int, UsuarioID)
      .input("NumeroDoc", sql.VarChar, NumeroDoc)
      .input("TipoDoc", sql.VarChar, "NOTA DE VENTA")
      .input("MetodoPago", sql.VarChar, MetodoPago || "EFECTIVO")
      .input("Subtotal", sql.Decimal(18, 2), realSubtotal)
      .input("IGV", sql.Decimal(18, 2), realIGV)
      .input("Total", sql.Decimal(18, 2), realTotal)
      .input("Estado", sql.VarChar, "COMPLETADA")
      .input("Observacion", sql.VarChar, Observacion || "").query(`
                INSERT INTO Venta (ClienteID, UsuarioID, NumeroDoc, TipoDoc, MetodoPago, FechaVenta, Subtotal, IGV, Total, Estado, Observacion, FechaCreacion)
                OUTPUT INSERTED.VentaID
                VALUES (@ClienteID, @UsuarioID, @NumeroDoc, @TipoDoc, @MetodoPago, GETDATE(), @Subtotal, @IGV, @Total, @Estado, @Observacion, GETDATE())
            `);

    const ventaID = ventaRes.recordset[0].VentaID;

    // 4. Procesar el Detalle y el Kardex con los valores validados
    for (const item of itemsValidados) {
      await transaction
        .request()
        .input("VentaID", sql.Int, ventaID)
        .input("ProductoID", sql.Int, item.ProductoID)
        .input("Cantidad", sql.Int, item.Cantidad)
        .input("PrecioUnitario", sql.Decimal(18, 2), item.PrecioUnitario)
        .input("Descuento", sql.Decimal(18, 2), 0)
        .input("Subtotal", sql.Decimal(18, 2), item.Subtotal).query(`
                    INSERT INTO DetalleVenta (VentaID, ProductoID, Cantidad, PrecioUnitario, Descuento, Subtotal)
                    VALUES (@VentaID, @ProductoID, @Cantidad, @PrecioUnitario, @Descuento, @Subtotal)
                `);

      await transaction
        .request()
        .input("pId", sql.Int, item.ProductoID)
        .input("cant", sql.Int, item.Cantidad)
        .query(
          `UPDATE Inventario SET StockActual = StockActual - @cant WHERE ProductoID = @pId`,
        );

      await transaction
        .request()
        .input("pId", sql.Int, item.ProductoID)
        .input("uId", sql.Int, UsuarioID)
        .input("cant", sql.Int, item.Cantidad)
        .input("motivo", sql.VarChar, `Venta POS #${NumeroDoc}`).query(`
                    INSERT INTO HistorialInventario (ProductoID, UsuarioID, TipoMovimiento, Cantidad, Motivo, FechaMovimiento)
                    VALUES (@pId, @uId, 'SALIDA', @cant, @motivo, GETDATE())
                `);
    }

    await transaction.commit();
    res.json({ success: true, mensaje: "Venta procesada con éxito", ventaID });
  } catch (error) {
    if (transaction) await transaction.rollback();
    const mensajeError =
      error.message.includes("Stock insuficiente") ||
      error.message.includes("no existe")
        ? error.message
        : "Error al procesar la transacción de venta en la base de datos.";
    res.status(400).json({ success: false, mensaje: mensajeError });
  }
};

// 5. OBTENER HISTORIAL DE VENTAS
const getVentas = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
            SELECT 
                v.VentaID, 
                v.NumeroDoc, 
                c.NombreRazonSocial AS ClienteNombre, 
                FORMAT(v.FechaVenta, 'yyyy-MM-dd HH:mm') AS FechaVenta, 
                v.MetodoPago, 
                v.Total, 
                v.Estado
            FROM Venta v
            LEFT JOIN Cliente c ON v.ClienteID = c.ClienteID
            ORDER BY v.FechaVenta DESC
        `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error al listar ventas:", error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al cargar historial." });
  }
};

module.exports = { finalizarVenta, getVentas };
