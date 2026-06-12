const { getConnection, sql } = require("../config/db");

// =======================================================
// 1. FINALIZAR VENTA (PROCESO TRANSACCIONAL)
// =======================================================
const finalizarVenta = async (req, res) => {
  const {
    ClienteID,
    UsuarioID,
    NumeroDoc,
    MetodoPago,
    Observacion,
    items,
    pagos,
    ClienteNuevo,
  } = req.body;
  let transaction;

  try {
    const pool = await getConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // =======================================================
    // 2. CREACIÓN DE CLIENTE ON-THE-FLY
    // =======================================================
    let finalClienteID = ClienteID || null;

    if (ClienteNuevo && ClienteNuevo.Documento) {
      const checkCli = await transaction
        .request()
        .input("doc", sql.VarChar, ClienteNuevo.Documento)
        .query("SELECT ClienteID FROM Cliente WHERE Documento = @doc");

      if (checkCli.recordset.length > 0) {
        finalClienteID = checkCli.recordset[0].ClienteID;
      } else {
        const insertCli = await transaction
          .request()
          .input("doc", sql.VarChar, ClienteNuevo.Documento)
          .input("nom", sql.VarChar, ClienteNuevo.NombreRazonSocial).query(`
            INSERT INTO Cliente (Documento, NombreRazonSocial, TipoDocumento, Activo, FechaCreacion)
            OUTPUT INSERTED.ClienteID
            VALUES (@doc, @nom, 'DNI/RUC', 1, GETDATE())
          `);
        finalClienteID = insertCli.recordset[0].ClienteID;
      }
    }

    let realTotal = 0;
    const itemsValidados = [];

    // =======================================================
    // 3. VALIDACIÓN DE STOCK Y PRECIOS EN TIEMPO REAL
    // =======================================================
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

      const descuentoRes = await transaction
        .request()
        .input("pId", sql.Int, item.ProductoID)
        .input("catId", sql.Int, dbProd.CategoriaID).query(`
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
        montoDescuento =
          dsc.TipoDescuento === "PORCENTAJE"
            ? precioReal * item.cantidad * (dsc.Valor / 100)
            : Math.min(dsc.Valor, precioReal * item.cantidad);
        montoDescuento = Math.round(montoDescuento * 100) / 100;
      }

      const subtotalItem = precioReal * item.cantidad - montoDescuento;
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

    // =======================================================
    // 4. CÁLCULO FINANCIERO EXACTO (IGV 18%)
    // =======================================================
    const realSubtotal = realTotal / 1.18;
    const realIGV = realTotal - realSubtotal;

    // =======================================================
    // 5. REGISTRO DE CABECERA DE VENTA
    // =======================================================
    const ventaRes = await transaction
      .request()
      .input("ClienteID", sql.Int, finalClienteID)
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

    // =======================================================
    // 6. DESGLOSE DE PAGOS SIMPLES Y MIXTOS
    // =======================================================
    if (pagos && pagos.length > 0) {
      for (const pago of pagos) {
        await transaction
          .request()
          .input("VentaID", sql.Int, ventaID)
          .input("Metodo", sql.VarChar, pago.metodo)
          .input("MontoRecibido", sql.Decimal(18, 2), pago.montoRecibido)
          .input("Vuelto", sql.Decimal(18, 2), pago.vuelto).query(`
            INSERT INTO VentaPago (VentaID, Metodo, MontoRecibido, Vuelto, FechaPago)
            VALUES (@VentaID, @Metodo, @MontoRecibido, @Vuelto, GETDATE())
          `);
      }
    }

    // =======================================================
    // 7. REGISTRO DE DETALLE Y MOVIMIENTO DE KARDEX
    // =======================================================
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
    res.json({
      success: true,
      mensaje: "Venta processed with success",
      ventaID,
    });
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

// =======================================================
// 8. OBTENER HISTORIAL DE VENTAS (OPTIMIZADO TOP-5 / BÚSQUEDA)
// =======================================================
const getVentas = async (req, res) => {
  const { q } = req.query;
  try {
    const pool = await getConnection();
    const request = pool.request();
    let query = "";

    if (q && q.trim() !== "") {
      request.input("search", sql.VarChar, `%${q.trim()}%`);
      query = `
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
        WHERE v.NumeroDoc LIKE @search OR c.NombreRazonSocial LIKE @search
        ORDER BY v.FechaVenta DESC
      `;
    } else {
      query = `
        SELECT TOP 5
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
      `;
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error al listar ventas:", error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al cargar historial." });
  }
};

// =======================================================
// 9. OBTENER DETALLE DE VENTA POR ID
// =======================================================
const getVentaById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();

    const cabecera = await pool.request().input("VentaID", sql.Int, id).query(`
        SELECT v.*, c.NombreRazonSocial AS ClienteNombre, c.Documento AS ClienteDoc, u.NombreUsuario AS UsuarioNombre
        FROM Venta v
        LEFT JOIN Cliente c ON v.ClienteID = c.ClienteID
        LEFT JOIN Usuario u ON v.UsuarioID = u.UsuarioID
        WHERE v.VentaID = @VentaID
    `);

    const detalles = await pool.request().input("VentaID", sql.Int, id).query(`
        SELECT dv.*, i.Nombre AS ProductoNombre, i.Codigo AS ProductoCodigo
        FROM DetalleVenta dv
        INNER JOIN Inventario i ON dv.ProductoID = i.ProductoID
        WHERE dv.VentaID = @VentaID
    `);

    const pagos = await pool.request().input("VentaID", sql.Int, id).query(`
        SELECT Metodo, MontoRecibido, Vuelto FROM VentaPago WHERE VentaID = @VentaID
    `);

    res.json({
      success: true,
      cabecera: cabecera.recordset[0],
      detalles: detalles.recordset,
      pagos: pagos.recordset,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al obtener ticket." });
  }
};

// =======================================================
// 10. ANULAR VENTA Y REVERTIR KARDEX
// =======================================================
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