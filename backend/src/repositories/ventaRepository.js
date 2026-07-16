const { getConnection, sql } = require("../config/db");

class VentaRepository {
  async procesarVentaTransaction(data) {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      let finalClienteID = data.ClienteID || null;
      if (data.ClienteNuevo && data.ClienteNuevo.Documento) {
        const checkCli = await transaction
          .request()
          .input("doc", sql.VarChar, data.ClienteNuevo.Documento)
          .query("SELECT ClienteID FROM Cliente WHERE Documento = @doc");
        if (checkCli.recordset.length > 0)
          finalClienteID = checkCli.recordset[0].ClienteID;
        else {
          const insertCli = await transaction
            .request()
            .input("doc", sql.VarChar, data.ClienteNuevo.Documento)
            .input("nom", sql.VarChar, data.ClienteNuevo.NombreRazonSocial)
            .query(
              `INSERT INTO Cliente (Documento, NombreRazonSocial, TipoDocumento, Activo, FechaCreacion) OUTPUT INSERTED.ClienteID VALUES (@doc, @nom, 'DNI/RUC', 1, GETDATE())`,
            );
          finalClienteID = insertCli.recordset[0].ClienteID;
        }
      }

      let realTotal = 0;
      const itemsValidados = [];

      for (const item of data.items) {
        const checkProd = await transaction
          .request()
          .input("pId", sql.Int, item.ProductoID)
          .query(
            "SELECT Nombre, PrecioVenta, StockActual, CategoriaID FROM Inventario WHERE ProductoID = @pId",
          );
        if (checkProd.recordset.length === 0)
          throw new Error(`El producto ID ${item.ProductoID} no existe.`);
        const dbProd = checkProd.recordset[0];
        if (dbProd.StockActual < item.cantidad)
          throw new Error(`Stock insuficiente para: ${dbProd.Nombre}`);

        const descReq = await transaction
          .request()
          .input("pId", sql.Int, item.ProductoID)
          .input("catId", sql.Int, dbProd.CategoriaID)
          .query(
            `SELECT TOP 1 DescuentoID, TipoDescuento, Valor FROM Descuento WHERE Activo=1 AND (AplicaA='GENERAL' OR (AplicaA='PRODUCTO' AND ReferenciaID=@pId) OR (AplicaA='CATEGORIA' AND ReferenciaID=@catId)) ORDER BY CASE AplicaA WHEN 'PRODUCTO' THEN 1 WHEN 'CATEGORIA' THEN 2 WHEN 'GENERAL' THEN 3 END`,
          );

        let montoDesc = 0,
          descID = null;
        if (descReq.recordset.length > 0) {
          descID = descReq.recordset[0].DescuentoID;
          montoDesc =
            descReq.recordset[0].TipoDescuento === "PORCENTAJE"
              ? dbProd.PrecioVenta *
                item.cantidad *
                (descReq.recordset[0].Valor / 100)
              : Math.min(
                  descReq.recordset[0].Valor,
                  dbProd.PrecioVenta * item.cantidad,
                );
          montoDesc = Math.round(montoDesc * 100) / 100;
        }

        const subtotalItem = dbProd.PrecioVenta * item.cantidad - montoDesc;
        realTotal += subtotalItem;
        itemsValidados.push({
          ProductoID: item.ProductoID,
          Cantidad: item.cantidad,
          PrecioUnitario: dbProd.PrecioVenta,
          Descuento: montoDesc,
          DescuentoID: descID,
          Subtotal: subtotalItem,
        });
      }

      const lastDoc = await transaction
        .request()
        .query(
          "SELECT TOP 1 NumeroDoc FROM Venta WHERE NumeroDoc LIKE 'N-%' ORDER BY VentaID DESC",
        );
      let correlativo = "N-000001";
      if (lastDoc.recordset.length > 0) {
        const num = parseInt(
          lastDoc.recordset[0].NumeroDoc.replace("N-", ""),
          10,
        );
        if (!isNaN(num))
          correlativo = "N-" + (num + 1).toString().padStart(6, "0");
      }

      const ventaRes = await transaction
        .request()
        .input("Cli", sql.Int, finalClienteID)
        .input("Usu", sql.Int, data.UsuarioID)
        .input("Doc", sql.VarChar, correlativo)
        .input("Total", sql.Decimal(18, 2), realTotal)
        .input("Obs", sql.VarChar, data.Observacion || "")
        .query(
          `INSERT INTO Venta (ClienteID, UsuarioID, NumeroDoc, TipoDoc, FechaVenta, Total, Estado, Observacion, FechaCreacion) OUTPUT INSERTED.VentaID VALUES (@Cli, @Usu, @Doc, 'NOTA DE VENTA', GETDATE(), @Total, 'COMPLETADA', @Obs, GETDATE())`,
        );
      const ventaID = ventaRes.recordset[0].VentaID;

      if (data.pagos) {
        for (const p of data.pagos) {
          await transaction
            .request()
            .input("vId", sql.Int, ventaID)
            .input("Met", sql.VarChar, p.metodo)
            .input("Monto", sql.Decimal(18, 2), p.montoRecibido)
            .input("Vuelto", sql.Decimal(18, 2), p.vuelto)
            .query(
              "INSERT INTO VentaPago (VentaID, Metodo, MontoRecibido, Vuelto, FechaPago) VALUES (@vId, @Met, @Monto, @Vuelto, GETDATE())",
            );
        }
      }

      for (const it of itemsValidados) {
        await transaction
          .request()
          .input("vId", sql.Int, ventaID)
          .input("pId", sql.Int, it.ProductoID)
          .input("Cant", sql.Int, it.Cantidad)
          .input("PU", sql.Decimal(18, 2), it.PrecioUnitario)
          .input("Desc", sql.Decimal(18, 2), it.Descuento)
          .input("DescId", sql.Int, it.DescuentoID)
          .input("Sub", sql.Decimal(18, 2), it.Subtotal)
          .query(
            "INSERT INTO DetalleVenta (VentaID, ProductoID, Cantidad, PrecioUnitario, Descuento, DescuentoID, Subtotal) VALUES (@vId, @pId, @Cant, @PU, @Desc, @DescId, @Sub)",
          );
        await transaction
          .request()
          .input("pId", sql.Int, it.ProductoID)
          .input("Cant", sql.Int, it.Cantidad)
          .query(
            "UPDATE Inventario SET StockActual = StockActual - @Cant WHERE ProductoID = @pId",
          );
        await transaction
          .request()
          .input("pId", sql.Int, it.ProductoID)
          .input("uId", sql.Int, data.UsuarioID)
          .input("Cant", sql.Int, it.Cantidad)
          .input("Motivo", sql.VarChar, `Venta POS #${correlativo}`)
          .query(
            "INSERT INTO HistorialInventario (ProductoID, UsuarioID, TipoMovimiento, Cantidad, Motivo, FechaMovimiento) VALUES (@pId, @uId, 'SALIDA', @Cant, @Motivo, GETDATE())",
          );
      }

      await transaction.commit();
      return { ventaID, NumeroDoc: correlativo };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async listar(busqueda = "") {
    const pool = await getConnection();
    const request = pool.request();
    const baseQuery = `
      SELECT v.VentaID, v.NumeroDoc, c.NombreRazonSocial AS ClienteNombre, 
             FORMAT(v.FechaVenta, 'dd/MM/yyyy HH:mm') AS FechaVenta, 
             ISNULL((SELECT STRING_AGG(Metodo, ', ') FROM VentaPago WHERE VentaID = v.VentaID), 'NO DEFINIDO') AS MetodoPago, 
             ISNULL((SELECT SUM(dv.Descuento) FROM DetalleVenta dv WHERE dv.VentaID = v.VentaID), 0) AS TotalDescuento, 
             v.Total, v.Estado 
      FROM Venta v 
      LEFT JOIN Cliente c ON v.ClienteID = c.ClienteID
    `;

    if (busqueda) {
      request.input("q", sql.VarChar, `%${busqueda}%`);
      return (
        await request.query(
          `${baseQuery} WHERE v.NumeroDoc LIKE @q OR c.NombreRazonSocial LIKE @q ORDER BY v.VentaID DESC`,
        )
      ).recordset;
    }
    return (
      await request.query(
        `${baseQuery} ORDER BY v.VentaID DESC OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`,
      )
    ).recordset;
  }

  async anularVentaTransaction(id, usuarioId) {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await transaction
        .request()
        .input("id", sql.Int, id)
        .query("UPDATE Venta SET Estado = 'ANULADA' WHERE VentaID = @id");
      const det = await transaction
        .request()
        .input("id", sql.Int, id)
        .query(
          "SELECT ProductoID, Cantidad FROM DetalleVenta WHERE VentaID = @id",
        );
      for (const it of det.recordset) {
        await transaction
          .request()
          .input("pId", sql.Int, it.ProductoID)
          .input("cant", sql.Int, it.Cantidad)
          .query(
            "UPDATE Inventario SET StockActual = StockActual + @cant WHERE ProductoID = @pId",
          );
        await transaction
          .request()
          .input("pId", sql.Int, it.ProductoID)
          .input("uId", sql.Int, usuarioId)
          .input("cant", sql.Int, it.Cantidad)
          .input("mot", sql.VarChar, `Anulación Venta`)
          .query(
            "INSERT INTO HistorialInventario (ProductoID, UsuarioID, TipoMovimiento, Cantidad, Motivo, FechaMovimiento) VALUES (@pId, @uId, 'ENTRADA', @cant, @mot, GETDATE())",
          );
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}
module.exports = new VentaRepository();