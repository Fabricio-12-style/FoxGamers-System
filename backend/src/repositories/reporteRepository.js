const { getConnection, sql } = require("../config/db");

class ReporteRepository {
  async getVentasTotales(fechaInicio, fechaFin) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("inicio", sql.Date, fechaInicio)
      .input("fin", sql.Date, fechaFin).query(`
            SELECT 
                ISNULL(SUM(Total), 0) as Total,
                COUNT(VentaID) as CantidadTransacciones,
                0 as TotalDescuentos
            FROM Venta
            WHERE Estado = 'COMPLETADA' 
                AND CAST(FechaCreacion AS DATE) BETWEEN @inicio AND @fin
        `);
    return (
      result.recordset[0] || {
        Total: 0,
        CantidadTransacciones: 0,
        TotalDescuentos: 0,
      }
    );
  }

  async getVentasPorCajero(fechaInicio, fechaFin, estado, usuarioId) {
    const pool = await getConnection();
    const request = pool.request();

    request.input("inicio", sql.Date, fechaInicio);
    request.input("fin", sql.Date, fechaFin);

    let query = `
        SELECT 
            u.UsuarioID,
            u.NombreCompleto AS Nombre,
            COUNT(v.VentaID) as Transacciones,
            ISNULL(SUM(v.Total), 0) as TotalVendido,
            ISNULL(SUM(v.Total) / NULLIF(COUNT(v.VentaID), 0), 0) as TicketPromedio
        FROM Venta v
        JOIN Usuario u ON v.UsuarioID = u.UsuarioID
        WHERE CAST(v.FechaCreacion AS DATE) BETWEEN @inicio AND @fin
    `;

    if (estado && estado !== "TODAS") {
      query += ` AND v.Estado = @estado`;
      request.input("estado", sql.VarChar, estado);
    }

    if (usuarioId && usuarioId !== "TODOS") {
      query += ` AND u.UsuarioID = @usuarioId`;
      request.input("usuarioId", sql.Int, usuarioId);
    }

    query += `
        GROUP BY u.UsuarioID, u.NombreCompleto
        ORDER BY TotalVendido DESC
    `;

    return (await request.query(query)).recordset;
  }

  async getVentasDetalladas(
    fechaInicio,
    fechaFin,
    estado,
    metodoPago,
    busqueda,
  ) {
    const pool = await getConnection();
    const request = pool.request();

    request.input("inicio", sql.Date, fechaInicio);
    request.input("fin", sql.Date, fechaFin);

    let query = `
        WITH PagosResumen AS (
            SELECT VentaID, COUNT(*) as CantidadPagos, MAX(Metodo) as UnicoMetodo
            FROM VentaPago
            GROUP BY VentaID
        )
        SELECT 
            v.VentaID,
            v.FechaCreacion,
            ISNULL((SELECT TOP 1 NombreCompleto FROM Cliente WHERE ClienteID = v.ClienteID), 'Público General') AS Cliente,
            ISNULL(u.NombreCompleto, 'Desconocido') AS Vendedor,
            v.Estado,
            ISNULL(v.Total, 0) AS Total,
            ISNULL(pr.CantidadPagos, 0) AS CantidadPagos,
            pr.UnicoMetodo
        FROM Venta v
        LEFT JOIN Usuario u ON v.UsuarioID = u.UsuarioID
        LEFT JOIN PagosResumen pr ON v.VentaID = pr.VentaID
        WHERE CAST(v.FechaCreacion AS DATE) BETWEEN @inicio AND @fin
    `;

    if (estado && estado !== "TODAS") {
      query += ` AND v.Estado = @estado`;
      request.input("estado", sql.VarChar, estado);
    }

    if (busqueda) {
      query += ` AND (CAST(v.VentaID AS VARCHAR) LIKE @busqueda OR ISNULL((SELECT TOP 1 NombreCompleto FROM Cliente WHERE ClienteID = v.ClienteID), '') LIKE @busqueda)`;
      request.input("busqueda", sql.VarChar, `%${busqueda}%`);
    }

    if (metodoPago && metodoPago !== "TODOS") {
      if (metodoPago === "MIXTO") {
        query += ` AND pr.CantidadPagos > 1`;
      } else {
        query += ` AND pr.CantidadPagos = 1 AND pr.UnicoMetodo = @metodoPago`;
        request.input("metodoPago", sql.VarChar, metodoPago);
      }
    }

    query += ` ORDER BY v.FechaCreacion DESC`;

    return (await request.query(query)).recordset;
  }

  async getPagosPorVentas(ventaIds) {
    if (!ventaIds || ventaIds.length === 0) return [];
    const pool = await getConnection();
    const query = `
        SELECT VentaID, Metodo, ISNULL(MontoRecibido, 0) AS MontoRecibido, ISNULL(Vuelto, 0) AS Vuelto 
        FROM VentaPago 
        WHERE VentaID IN (${ventaIds.join(",")})
    `;
    return (await pool.request().query(query)).recordset;
  }

  async getReporteInventario(
    fechaInicio,
    fechaFin,
    categoriaId,
    estadoStock,
    busqueda,
  ) {
    const pool = await getConnection();
    const request = pool.request();

    request.input("inicio", sql.Date, fechaInicio);
    request.input("fin", sql.Date, fechaFin);

    let query = `
        WITH VentasPeriodo AS (
            SELECT 
                vd.ProductoID, 
                SUM(vd.Cantidad) as UnidadesVendidas
            FROM DetalleVenta vd 
            JOIN Venta v ON vd.VentaID = v.VentaID
            WHERE v.Estado = 'COMPLETADA' AND CAST(v.FechaCreacion AS DATE) BETWEEN @inicio AND @fin
            GROUP BY vd.ProductoID
        )
        SELECT 
            inv.ProductoID,
            inv.Nombre AS Producto,
            ISNULL(c.Nombre, 'Sin Categoría') AS Categoria,
            ISNULL(vp.UnidadesVendidas, 0) AS Ventas,
            ISNULL(inv.StockActual, 0) AS StockActual,
            CASE 
                WHEN ISNULL(inv.StockActual, 0) <= 0 THEN 'AGOTADO'
                WHEN ISNULL(inv.StockActual, 0) <= ISNULL(inv.StockMinimo, 0) THEN 'BAJO'
                ELSE 'OK'
            END AS EstadoStock
        FROM Inventario inv
        LEFT JOIN Categoria c ON inv.CategoriaID = c.CategoriaID
        LEFT JOIN VentasPeriodo vp ON inv.ProductoID = vp.ProductoID
        WHERE 1 = 1
    `;

    if (categoriaId && categoriaId !== "TODAS") {
      query += ` AND inv.CategoriaID = @categoriaId`;
      request.input("categoriaId", sql.Int, categoriaId);
    }

    if (busqueda) {
      query += ` AND (inv.Nombre LIKE @busqueda OR CAST(inv.ProductoID AS VARCHAR) LIKE @busqueda)`;
      request.input("busqueda", sql.VarChar, `%${busqueda}%`);
    }

    if (estadoStock && estadoStock !== "TODOS") {
      if (estadoStock === "AGOTADO")
        query += ` AND ISNULL(inv.StockActual, 0) <= 0`;
      else if (estadoStock === "BAJO")
        query += ` AND ISNULL(inv.StockActual, 0) > 0 AND ISNULL(inv.StockActual, 0) <= ISNULL(inv.StockMinimo, 0)`;
      else if (estadoStock === "OK")
        query += ` AND ISNULL(inv.StockActual, 0) > ISNULL(inv.StockMinimo, 0)`;
    }

    query += ` ORDER BY Ventas DESC, StockActual ASC`;

    return (await request.query(query)).recordset;
  }

  async getReporteUtilidades(
    fechaInicio,
    fechaFin,
    nivelAnalisis,
    categoriaId,
    alertaRentabilidad,
    busqueda,
  ) {
    const pool = await getConnection();
    const request = pool.request();

    request.input("inicio", sql.Date, fechaInicio);
    request.input("fin", sql.Date, fechaFin);

    let baseQuery = "";

    if (nivelAnalisis === "CATEGORIA") {
      baseQuery = `
            SELECT 
                c.CategoriaID AS ID,
                c.Nombre AS Concepto,
                'N/A' AS Categoria,
                ISNULL(vp.UnidadesVendidas, 0) AS UnidadesVendidas,
                ISNULL(vp.IngresoTotal, 0) AS IngresoTotal,
                ISNULL(vp.CostoTotal, 0) AS CostoTotal,
                ISNULL(vp.IngresoTotal - vp.CostoTotal, 0) AS UtilidadNeta,
                CASE 
                    WHEN ISNULL(vp.IngresoTotal, 0) = 0 THEN 0
                    ELSE ((ISNULL(vp.IngresoTotal, 0) - ISNULL(vp.CostoTotal, 0)) / ISNULL(vp.IngresoTotal, 1)) * 100 
                END AS MargenPorcentaje
            FROM Categoria c
            JOIN (
                SELECT 
                    inv.CategoriaID,
                    SUM(vd.Cantidad) as UnidadesVendidas,
                    SUM(vd.Cantidad * inv.PrecioVenta) as IngresoTotal,
                    SUM(vd.Cantidad * inv.PrecioCompra) as CostoTotal
                FROM DetalleVenta vd
                JOIN Venta v ON vd.VentaID = v.VentaID
                JOIN Inventario inv ON vd.ProductoID = inv.ProductoID
                WHERE v.Estado = 'COMPLETADA' AND CAST(v.FechaCreacion AS DATE) BETWEEN @inicio AND @fin
                GROUP BY inv.CategoriaID
            ) vp ON c.CategoriaID = vp.CategoriaID
            WHERE 1 = 1
        `;

      if (categoriaId && categoriaId !== "TODAS") {
        baseQuery += ` AND c.CategoriaID = @categoriaId`;
        request.input("categoriaId", sql.Int, categoriaId);
      }
      if (busqueda) {
        baseQuery += ` AND c.Nombre LIKE @busqueda`;
        request.input("busqueda", sql.VarChar, `%${busqueda}%`);
      }
    } else {
      baseQuery = `
            SELECT 
                inv.ProductoID AS ID,
                inv.Nombre AS Concepto,
                ISNULL(c.Nombre, 'Sin Categoría') AS Categoria,
                ISNULL(vp.UnidadesVendidas, 0) AS UnidadesVendidas,
                ISNULL(vp.IngresoTotal, 0) AS IngresoTotal,
                ISNULL(vp.CostoTotal, 0) AS CostoTotal,
                ISNULL(vp.IngresoTotal - vp.CostoTotal, 0) AS UtilidadNeta,
                CASE 
                    WHEN ISNULL(vp.IngresoTotal, 0) = 0 THEN 0
                    ELSE ((ISNULL(vp.IngresoTotal, 0) - ISNULL(vp.CostoTotal, 0)) / ISNULL(vp.IngresoTotal, 1)) * 100 
                END AS MargenPorcentaje
            FROM Inventario inv
            LEFT JOIN Categoria c ON inv.CategoriaID = c.CategoriaID
            JOIN (
                SELECT 
                    vd.ProductoID,
                    SUM(vd.Cantidad) as UnidadesVendidas,
                    SUM(vd.Cantidad * inv2.PrecioVenta) as IngresoTotal,
                    SUM(vd.Cantidad * inv2.PrecioCompra) as CostoTotal
                FROM DetalleVenta vd
                JOIN Venta v ON vd.VentaID = v.VentaID
                JOIN Inventario inv2 ON vd.ProductoID = inv2.ProductoID
                WHERE v.Estado = 'COMPLETADA' AND CAST(v.FechaCreacion AS DATE) BETWEEN @inicio AND @fin
                GROUP BY vd.ProductoID
            ) vp ON inv.ProductoID = vp.ProductoID
            WHERE 1 = 1
        `;

      if (categoriaId && categoriaId !== "TODAS") {
        baseQuery += ` AND inv.CategoriaID = @categoriaId`;
        request.input("categoriaId", sql.Int, categoriaId); // Reutilizamos el parámetro creado arriba si aplica
      }
      if (busqueda) {
        baseQuery += ` AND (inv.Nombre LIKE @busqueda OR CAST(inv.ProductoID AS VARCHAR) LIKE @busqueda)`;
        request.input("busqueda", sql.VarChar, `%${busqueda}%`);
      }
    }

    if (alertaRentabilidad && alertaRentabilidad !== "TODOS") {
      if (alertaRentabilidad === "ALTA") {
        baseQuery += ` AND (CASE WHEN ISNULL(vp.IngresoTotal, 0) = 0 THEN 0 ELSE ((ISNULL(vp.IngresoTotal, 0) - ISNULL(vp.CostoTotal, 0)) / ISNULL(vp.IngresoTotal, 1)) * 100 END) >= 30`;
      } else if (alertaRentabilidad === "BAJA") {
        baseQuery += ` AND (CASE WHEN ISNULL(vp.IngresoTotal, 0) = 0 THEN 0 ELSE ((ISNULL(vp.IngresoTotal, 0) - ISNULL(vp.CostoTotal, 0)) / ISNULL(vp.IngresoTotal, 1)) * 100 END) > 0 AND (CASE WHEN ISNULL(vp.IngresoTotal, 0) = 0 THEN 0 ELSE ((ISNULL(vp.IngresoTotal, 0) - ISNULL(vp.CostoTotal, 0)) / ISNULL(vp.IngresoTotal, 1)) * 100 END) < 10`;
      } else if (alertaRentabilidad === "PERDIDA") {
        baseQuery += ` AND (CASE WHEN ISNULL(vp.IngresoTotal, 0) = 0 THEN 0 ELSE ((ISNULL(vp.IngresoTotal, 0) - ISNULL(vp.CostoTotal, 0)) / ISNULL(vp.IngresoTotal, 1)) * 100 END) <= 0`;
      }
    }

    baseQuery += ` ORDER BY UtilidadNeta DESC`;

    return (await request.query(baseQuery)).recordset;
  }

  async getFlujoCajaDiario(fecha, usuarioId) {
    const pool = await getConnection();
    const request = pool.request();

    request.input("fecha", sql.Date, fecha);

    let baseQuery = `
        WITH PagosCajero AS (
            SELECT 
                u.UsuarioID,
                u.NombreCompleto AS Cajero,
                vp.Metodo,
                COUNT(1) as CantidadTransacciones,
                SUM(vp.MontoRecibido - ISNULL(vp.Vuelto, 0)) as TotalMetodo
            FROM Venta v
            JOIN Usuario u ON v.UsuarioID = u.UsuarioID
            JOIN VentaPago vp ON v.VentaID = vp.VentaID
            WHERE v.Estado = 'COMPLETADA' AND CAST(v.FechaCreacion AS DATE) = @fecha
    `;

    if (usuarioId && usuarioId !== "TODOS") {
      baseQuery += ` AND u.UsuarioID = @usuarioId`;
      request.input("usuarioId", sql.Int, usuarioId);
    }

    baseQuery += `
            GROUP BY u.UsuarioID, u.NombreCompleto, vp.Metodo
        )
        SELECT 
            Cajero,
            SUM(CASE WHEN Metodo = 'Efectivo' THEN CantidadTransacciones ELSE 0 END) as TransaccionesEfectivo,
            ISNULL(SUM(CASE WHEN Metodo = 'Efectivo' THEN TotalMetodo ELSE 0 END), 0) as TotalEfectivo,
            
            SUM(CASE WHEN Metodo = 'Yape' OR Metodo = 'Plin' THEN CantidadTransacciones ELSE 0 END) as TransaccionesDigital,
            ISNULL(SUM(CASE WHEN Metodo = 'Yape' OR Metodo = 'Plin' THEN TotalMetodo ELSE 0 END), 0) as TotalDigital,
            
            SUM(CASE WHEN Metodo = 'Tarjeta' THEN CantidadTransacciones ELSE 0 END) as TransaccionesTarjeta,
            ISNULL(SUM(CASE WHEN Metodo = 'Tarjeta' THEN TotalMetodo ELSE 0 END), 0) as TotalTarjeta,

            -- NUEVO: Agregamos las Transferencias Bancarias
            SUM(CASE WHEN Metodo = 'Transferencia' THEN CantidadTransacciones ELSE 0 END) as TransaccionesTransferencia,
            ISNULL(SUM(CASE WHEN Metodo = 'Transferencia' THEN TotalMetodo ELSE 0 END), 0) as TotalTransferencia,
            
            SUM(CantidadTransacciones) as TotalTransacciones,
            ISNULL(SUM(TotalMetodo), 0) as TotalGenerado
        FROM PagosCajero
        GROUP BY UsuarioID, Cajero
        ORDER BY TotalGenerado DESC
    `;

    return (await request.query(baseQuery)).recordset;
  }
}

module.exports = new ReporteRepository();
