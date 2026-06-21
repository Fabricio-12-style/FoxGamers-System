const nodemailer = require("nodemailer");
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

    console.error("🚨 ERROR SQL EN FINALIZAR VENTA:", error);
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
// =======================================================
// X. ENVIAR TICKET POR CORREO ELECTRÓNICO (DISEÑO PREMIUM)
// =======================================================
const enviarTicketPorCorreo = async (req, res) => {
  const { id } = req.params;
  const { correoDestino } = req.body;

  if (!correoDestino) {
    return res
      .status(400)
      .json({ success: false, mensaje: "Se requiere un correo de destino." });
  }

  try {
    const pool = await getConnection();

    // 1. Consulta de Cabecera (Asegurando traer al vendedor)
    const cabeceraQuery = await pool.request().input("VentaID", sql.Int, id)
      .query(`
        SELECT v.NumeroDoc, v.FechaVenta, v.Subtotal, v.Total, v.MetodoPago,
               c.NombreRazonSocial as ClienteNombre, c.Documento as ClienteDoc,
               u.NombreUsuario as UsuarioNombre
        FROM Venta v
        LEFT JOIN Cliente c ON v.ClienteID = c.ClienteID
        LEFT JOIN Usuario u ON v.UsuarioID = u.UsuarioID
        WHERE v.VentaID = @VentaID
      `);

    if (cabeceraQuery.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, mensaje: "Venta no encontrada." });
    }
    const cabecera = cabeceraQuery.recordset[0];

    // 2. Consulta de Detalles
    const detallesQuery = await pool.request().input("VentaID", sql.Int, id)
      .query(`
        SELECT dv.Cantidad, dv.PrecioUnitario, dv.Subtotal, dv.Descuento,
               p.Nombre as ProductoNombre, p.Codigo as ProductoCodigo
        FROM DetalleVenta dv
        INNER JOIN Inventario p ON dv.ProductoID = p.ProductoID
        WHERE dv.VentaID = @VentaID
      `);
    const detalles = detallesQuery.recordset;

    // 3. Consulta de Desglose de Pagos (Vital para el recuadro inferior izquierdo)
    const pagosQuery = await pool.request().input("VentaID", sql.Int, id)
      .query(`
        SELECT Metodo, MontoRecibido, Vuelto 
        FROM VentaPago 
        WHERE VentaID = @VentaID
      `);
    const pagos = pagosQuery.recordset;

    // 4. Cálculos y formateo
    const sumaDescuentosGral = detalles.reduce(
      (acc, item) => acc + (parseFloat(item.Descuento) || 0),
      0,
    );
    const fechaLimpia = cabecera.FechaVenta.toISOString().split("T")[0];

    // Formateo de los Items
    let filasItems = "";
    detalles.forEach((item) => {
      filasItems += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 15px 10px; text-align: center; font-weight: bold; color: #0f172a;">${parseFloat(item.Cantidad).toFixed(2)}</td>
          <td style="padding: 15px 10px; text-align: center; color: #94a3b8; font-size: 11px;">UND</td>
          <td style="padding: 15px 10px; text-align: left;">
            <strong style="color: #0f172a; font-size: 13px;">${item.ProductoNombre}</strong><br>
            <span style="color: #94a3b8; font-size: 11px;">${item.ProductoCodigo || "N/A"}</span>
          </td>
          <td style="padding: 15px 10px; text-align: right; color: #334155;">S/ ${parseFloat(item.PrecioUnitario).toFixed(2)}</td>
          <td style="padding: 15px 10px; text-align: right; font-weight: bold; color: #0f172a;">S/ ${parseFloat(item.Subtotal).toFixed(2)}</td>
        </tr>
      `;
    });

    // Formateo del Cuadro de Pagos
    let listaPagosHtml = "";
    if (pagos.length > 0) {
      pagos.forEach((p) => {
        listaPagosHtml += `
          <tr>
            <td style="padding: 4px 0; color: #0f172a; font-size: 12px;">• ${p.Metodo}:</td>
            <td style="padding: 4px 0; text-align: right; color: #0f172a; font-size: 12px;">S/ ${parseFloat(p.MontoRecibido).toFixed(2)}</td>
          </tr>`;
        if (p.Metodo === "EFECTIVO" && parseFloat(p.Vuelto) > 0) {
          listaPagosHtml += `
          <tr>
            <td style="padding: 4px 0; color: #ef4444; font-size: 12px;">Vuelto entregado:</td>
            <td style="padding: 4px 0; text-align: right; color: #ef4444; font-size: 12px;">-S/ ${parseFloat(p.Vuelto).toFixed(2)}</td>
          </tr>`;
        }
      });
    } else {
      listaPagosHtml = `
        <tr>
          <td style="padding: 4px 0; color: #0f172a; font-size: 12px;">• ${cabecera.MetodoPago}:</td>
          <td style="padding: 4px 0; text-align: right; color: #0f172a; font-size: 12px;">S/ ${cabecera.Total.toFixed(2)}</td>
        </tr>`;
    }

    // 5. CONSTRUCCIÓN DEL HTML (Clon de la previsualización)
    const htmlCorreo = `
      <div style="background-color: #e2e8f0; padding: 40px 10px; font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;">
        <div style="max-width: 800px; margin: 0 auto; background-color: #e2e8f0;">
          
          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 25px;">
            <tr>
              <td width="60%">
                <h1 style="margin: 0; color: #0f172a; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">FOX GAMERS</h1>
                <p style="margin: 5px 0 0 0; color: #475569; font-size: 12px;">Av. Principal 123, Chiclayo - Perú</p>
                <p style="margin: 2px 0 0 0; color: #475569; font-size: 12px;">Tel: +51 961 460 326 | Web: foxgamers.pe</p>
              </td>
              <td width="40%" align="right">
                <table cellpadding="0" cellspacing="0" style="width: 200px;">
                  <tr>
                    <td style="background-color: #0f172a; color: #a3e635; text-align: center; padding: 8px; font-size: 11px; font-weight: bold; letter-spacing: 1px;">
                      NOTA DE VENTA
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #ffffff; border: 2px solid #0f172a; border-top: none; text-align: center; padding: 12px; font-size: 20px; font-weight: bold; color: #0f172a; border-radius: 0 0 6px 6px;">
                      ${cabecera.NumeroDoc}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="48%" style="background-color: #ffffff; border-left: 5px solid #a3e635; padding: 20px; border-radius: 0 6px 6px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); vertical-align: top;">
                <p style="margin: 0 0 10px 0; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Datos del Cliente</p>
                <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px; text-transform: uppercase;">${cabecera.ClienteNombre || "PÚBLICO GENERAL"}</h3>
                <p style="margin: 0; color: #334155; font-size: 12px;"><strong>Documento:</strong> ${cabecera.ClienteDoc || "00000000"}</p>
              </td>
              
              <td width="4%"></td> <td width="48%" style="background-color: #ffffff; border-left: 5px solid #eab308; padding: 20px; border-radius: 0 6px 6px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); vertical-align: top;">
                <p style="margin: 0 0 10px 0; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Detalles de Emisión</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #334155;">
                  <tr><td style="padding-bottom: 4px;"><strong>Fecha:</strong></td><td style="padding-bottom: 4px;">${fechaLimpia}</td></tr>
                  <tr><td style="padding-bottom: 4px;"><strong>Pago:</strong></td><td style="padding-bottom: 4px;">${cabecera.MetodoPago}</td></tr>
                  <tr><td><strong>Vendedor:</strong></td><td>${cabecera.UsuarioNombre || "Cajero"}</td></tr>
                </table>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; background-color: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <thead style="background-color: #0f172a; color: #ffffff;">
              <tr>
                <th style="padding: 12px 10px; font-size: 10px; letter-spacing: 1px; text-align: center;">CANT.</th>
                <th style="padding: 12px 10px; font-size: 10px; letter-spacing: 1px; text-align: center;">UND.</th>
                <th style="padding: 12px 10px; font-size: 10px; letter-spacing: 1px; text-align: left;">DESCRIPCIÓN</th>
                <th style="padding: 12px 10px; font-size: 10px; letter-spacing: 1px; text-align: right;">P. UNIT.</th>
                <th style="padding: 12px 10px; font-size: 10px; letter-spacing: 1px; text-align: right;">IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              ${filasItems}
            </tbody>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
            <tr>
              <td width="48%" style="vertical-align: bottom;">
                <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border: 1px dashed #cbd5e1;">
                  <p style="margin: 0 0 10px 0; color: #0f172a; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                    <span style="color: #64748b;">■</span> DESGLOSE DE MEDIOS DE PAGO:
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${listaPagosHtml}
                  </table>
                </div>
              </td>
              
              <td width="4%"></td> <td width="48%" style="vertical-align: bottom;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; margin-bottom: 10px;">
                  <tr>
                    <td style="color: #64748b; padding: 4px 15px;">Subtotal:</td>
                    <td align="right" style="color: #0f172a; font-weight: bold; padding: 4px 15px;">S/ ${cabecera.Subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="color: #ef4444; padding: 4px 15px;">Descuento:</td>
                    <td align="right" style="color: #ef4444; font-weight: bold; padding: 4px 15px;">
                      ${sumaDescuentosGral > 0 ? `-S/ ${sumaDescuentosGral.toFixed(2)}` : `S/ 0.00`}
                    </td>
                  </tr>
                </table>
                <div style="background-color: #0f172a; border-radius: 6px; padding: 15px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="color: #ffffff; font-size: 14px; font-weight: bold; letter-spacing: 2px;">TOTAL</td>
                      <td align="right" style="color: #a3e635; font-size: 24px; font-weight: bold;">S/ ${cabecera.Total.toFixed(2)}</td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 50px; color: #0f172a;">
            <h3 style="margin: 0; font-size: 16px;">¡GRACIAS POR SU PREFERENCIA!</h3>
            <p style="margin: 8px 0 0 0; color: #64748b; font-size: 11px;">Representación impresa de la nota de venta generada por el sistema.</p>
          </div>

        </div>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Fox Gamers" <${process.env.EMAIL_USER}>`,
      to: correoDestino,
      subject: `Comprobante Electrónico - ${cabecera.NumeroDoc}`,
      html: htmlCorreo,
    });

    res.json({
      success: true,
      mensaje: "Comprobante enviado exitosamente por correo.",
    });
  } catch (error) {
    console.error("Error al enviar correo:", error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al enviar el correo." });
  }
};

module.exports = {
  finalizarVenta,
  getVentas,
  getVentaById,
  anularVenta,
  enviarTicketPorCorreo,
};
