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
          "SELECT Nombre, PrecioVenta, StockActual, CategoriaID FROM Inventario WHERE ProductoID = @pId",
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

      // Buscar descuento vigente (prioridad: PRODUCTO > CATEGORIA > GENERAL)
      const descuentoRes = await transaction
        .request()
        .input("pId", sql.Int, item.ProductoID)
        .input("catId", sql.Int, dbProd.CategoriaID)
        .query(`
    SELECT TOP 1 DescuentoID, TipoDescuento, Valor
    FROM Descuento
    WHERE Activo = 1
      AND (
        (AplicaA = 'GENERAL')
        OR (AplicaA = 'PRODUCTO'  AND ReferenciaID = @pId)
        OR (AplicaA = 'CATEGORIA' AND ReferenciaID = @catId)
      )
    ORDER BY
      CASE AplicaA
        WHEN 'PRODUCTO'  THEN 1
        WHEN 'CATEGORIA' THEN 2
        WHEN 'GENERAL'   THEN 3
      END
  `);

      let montoDescuento = 0;
      let descuentoID = null;

      if (descuentoRes.recordset.length > 0) {
        const dsc = descuentoRes.recordset[0];
        descuentoID = dsc.DescuentoID;
        montoDescuento = dsc.TipoDescuento === "PORCENTAJE"
          ? precioReal * item.cantidad * (dsc.Valor / 100)
          : Math.min(dsc.Valor, precioReal * item.cantidad);
        montoDescuento = Math.round(montoDescuento * 100) / 100;
      }

      const subtotalItem = (precioReal * item.cantidad) - montoDescuento;
      realTotal += subtotalItem;

      itemsValidados.push({
        ProductoID: item.ProductoID,
        Cantidad: item.cantidad,
        PrecioUnitario: precioReal,
        Descuento: montoDescuento,
        DescuentoID: descuentoID,
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
        .input("Descuento", sql.Decimal(18, 2), item.Descuento)
        .input("DescuentoID", sql.Int, item.DescuentoID || null)
        .input("Subtotal", sql.Decimal(18, 2), item.Subtotal).query(`
    INSERT INTO DetalleVenta (VentaID, ProductoID, Cantidad, PrecioUnitario, Descuento, DescuentoID, Subtotal)
    VALUES (@VentaID, @ProductoID, @Cantidad, @PrecioUnitario, @Descuento, @DescuentoID, @Subtotal)
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

// 6. OBTENER TICKET DE VENTA (DETALLE)
const getVentaById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();

    const cabecera = await pool.request().input("VentaID", sql.Int, id).query(`
                SELECT 
                    v.*, 
                    c.NombreRazonSocial AS ClienteNombre, 
                    'Cajero' AS UsuarioNombre
                FROM Venta v
                LEFT JOIN Cliente c ON v.ClienteID = c.ClienteID
                WHERE v.VentaID = @VentaID
            `);

    if (cabecera.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, mensaje: "Ticket no encontrado." });
    }

    const detalles = await pool.request().input("VentaID", sql.Int, id)
      .query(`
              SELECT
                dv.*,
                i.Nombre AS ProductoNombre,
                d.Nombre AS DescuentoNombre,
                d.TipoDescuento,
                d.Valor AS DescuentoValor
              FROM DetalleVenta dv
              INNER JOIN Inventario i ON dv.ProductoID = i.ProductoID
              LEFT JOIN Descuento d   ON dv.DescuentoID = d.DescuentoID
              WHERE dv.VentaID = @VentaID
            `);

    res.json({
      success: true,
      cabecera: cabecera.recordset[0],
      detalles: detalles.recordset,
    });
  } catch (error) {
    console.error("Error en getVentaById:", error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al obtener el ticket." });
  }
};

// 7. ANULAR VENTA Y DEVOLVER AL KARDEX

const anularVenta = async (req, res) => {
  const { id } = req.params;
  const { UsuarioID } = req.body;
  let transaction;

  try {
    const pool = await getConnection();

    const checkVenta = await pool
      .request()
      .input("VentaID", sql.Int, id)
      .query("SELECT Estado, NumeroDoc FROM Venta WHERE VentaID = @VentaID");

    if (checkVenta.recordset.length === 0)
      return res
        .status(404)
        .json({ success: false, mensaje: "Venta no encontrada" });
    if (checkVenta.recordset[0].Estado === "ANULADA")
      return res
        .status(400)
        .json({ success: false, mensaje: "La venta ya se encuentra anulada" });

    const numDoc = checkVenta.recordset[0].NumeroDoc;

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    await transaction
      .request()
      .input("VentaID", sql.Int, id)
      .query("UPDATE Venta SET Estado = 'ANULADA' WHERE VentaID = @VentaID");

    const detalles = await transaction
      .request()
      .input("VentaID", sql.Int, id)
      .query(
        "SELECT ProductoID, Cantidad FROM DetalleVenta WHERE VentaID = @VentaID",
      );

    for (const item of detalles.recordset) {
      await transaction
        .request()
        .input("pId", sql.Int, item.ProductoID)
        .input("cant", sql.Int, item.Cantidad)
        .query(
          "UPDATE Inventario SET StockActual = StockActual + @cant WHERE ProductoID = @pId",
        );

      await transaction
        .request()
        .input("pId", sql.Int, item.ProductoID)
        .input("uId", sql.Int, UsuarioID)
        .input("cant", sql.Int, item.Cantidad)
        .input("motivo", sql.VarChar, `Anulación de Venta #${numDoc}`)
        .query(`INSERT INTO HistorialInventario (ProductoID, UsuarioID, TipoMovimiento, Cantidad, Motivo, FechaMovimiento)
                        VALUES (@pId, @uId, 'ENTRADA', @cant, @motivo, GETDATE())`);
    }

    await transaction.commit();
    res.json({
      success: true,
      mensaje: "Venta anulada con éxito. El stock regresó al inventario.",
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    res
      .status(500)
      .json({ success: false, mensaje: "Error crítico al anular la venta." });
  }
};

module.exports = { finalizarVenta, getVentas, getVentaById, anularVenta };
