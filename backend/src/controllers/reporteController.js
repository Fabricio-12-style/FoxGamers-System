const { getConnection, sql } = require("../config/db");

const generarReporte = async (req, res) => {
  const { tipoReporte, filtros } = req.body;

  try {
    const pool = await getConnection();
    const fechaHoraActual = new Date().toLocaleString();

    // =======================================================
    // 1. VENTAS POR PERÍODO
    // =======================================================
    if (tipoReporte === "ventas_periodo") {
      const { fechaInicio, fechaFin } = filtros;
      const result = await pool
        .request()
        .input("inicio", sql.Date, fechaInicio)
        .input("fin", sql.Date, fechaFin).query(`
          SELECT ISNULL(SUM(Total), 0) AS IngresosTotales, COUNT(VentaID) AS Transacciones, ISNULL(AVG(Total), 0) AS TicketPromedio
          FROM Venta WHERE Estado = 'COMPLETADA' AND CAST(FechaVenta AS DATE) BETWEEN @inicio AND @fin;

          SELECT v.NumeroDoc, ISNULL(c.NombreRazonSocial, 'PÚBLICO GENERAL') AS Cliente, FORMAT(v.FechaVenta, 'yyyy-MM-dd HH:mm') AS Fecha, v.MetodoPago AS Metodo, v.Total
          FROM Venta v LEFT JOIN Cliente c ON v.ClienteID = c.ClienteID
          WHERE v.Estado = 'COMPLETADA' AND CAST(FechaVenta AS DATE) BETWEEN @inicio AND @fin ORDER BY v.FechaVenta DESC;
        `);

      const kpis = result.recordsets[0][0];
      return res.json({
        success: true,
        data: {
          metadata: {
            reporteTipo: "VENTAS_PERIODO",
            titulo: "Ventas por Período",
            filtrosAplicados: `Desde: ${fechaInicio} | Hasta: ${fechaFin}`,
            fechaGeneracion: fechaHoraActual,
          },
          resumenKPIs: [
            {
              label: "Ingresos Totales",
              value: kpis.IngresosTotales,
              formato: "MONEDA",
            },
            {
              label: "Transacciones",
              value: kpis.Transacciones,
              formato: "NUMERO",
            },
            {
              label: "Ticket Promedio",
              value: kpis.TicketPromedio,
              formato: "MONEDA",
            },
          ],
          reporteTabla: {
            columnas: ["Documento", "Cliente", "Fecha", "Método", "Total"],
            filas: result.recordsets[1].map((r) => [
              r.NumeroDoc,
              r.Cliente,
              r.Fecha,
              r.Metodo,
              r.Total,
            ]),
          },
        },
      });
    }

    // =======================================================
    // 2. PRODUCTOS MÁS VENDIDOS (TOP)
    // =======================================================
    else if (tipoReporte === "productos_top") {
      const { fechaInicio, fechaFin } = filtros;
      const result = await pool
        .request()
        .input("inicio", sql.Date, fechaInicio)
        .input("fin", sql.Date, fechaFin).query(`
          SELECT TOP 20 i.Codigo, i.Nombre, SUM(dv.Cantidad) AS CantidadVendida, SUM(dv.Subtotal) AS IngresoGenerado
          FROM DetalleVenta dv
          JOIN Inventario i ON dv.ProductoID = i.ProductoID
          JOIN Venta v ON dv.VentaID = v.VentaID
          WHERE v.Estado = 'COMPLETADA' AND CAST(v.FechaVenta AS DATE) BETWEEN @inicio AND @fin
          GROUP BY i.Codigo, i.Nombre
          ORDER BY CantidadVendida DESC;
        `);

      const filasTabla = result.recordsets[0];
      const totalProductos = filasTabla.reduce(
        (acc, row) => acc + row.CantidadVendida,
        0,
      );
      const totalDinero = filasTabla.reduce(
        (acc, row) => acc + row.IngresoGenerado,
        0,
      );

      return res.json({
        success: true,
        data: {
          metadata: {
            reporteTipo: "PRODUCTOS_TOP",
            titulo: "Top Productos Más Vendidos",
            filtrosAplicados: `Desde: ${fechaInicio} | Hasta: ${fechaFin}`,
            fechaGeneracion: fechaHoraActual,
          },
          resumenKPIs: [
            {
              label: "Unidades Vendidas (Top)",
              value: totalProductos,
              formato: "NUMERO",
            },
            {
              label: "Ingreso por Top Ventas",
              value: totalDinero,
              formato: "MONEDA",
            },
          ],
          reporteTabla: {
            columnas: ["Código", "Producto", "Cant. Vendida", "Total Generado"],
            filas: filasTabla.map((r) => [
              r.Codigo || "N/A",
              r.Nombre,
              r.CantidadVendida,
              r.IngresoGenerado,
            ]),
          },
        },
      });
    }

    // =======================================================
    // 3. VENTAS POR VENDEDOR
    // =======================================================
    else if (tipoReporte === "ventas_vendedor") {
      const { fechaInicio, fechaFin } = filtros;
      const result = await pool
        .request()
        .input("inicio", sql.Date, fechaInicio)
        .input("fin", sql.Date, fechaFin).query(`
          SELECT u.NombreUsuario AS Vendedor, COUNT(v.VentaID) AS CantidadVentas, ISNULL(SUM(v.Total), 0) AS MontoVendido
          FROM Venta v
          LEFT JOIN Usuario u ON v.UsuarioID = u.UsuarioID
          WHERE v.Estado = 'COMPLETADA' AND CAST(v.FechaVenta AS DATE) BETWEEN @inicio AND @fin
          GROUP BY u.NombreUsuario
          ORDER BY MontoVendido DESC;
        `);

      const filasTabla = result.recordsets[0];
      const mejorVendedor =
        filasTabla.length > 0 ? filasTabla[0].Vendedor : "N/A";
      const totalVendidoGlobal = filasTabla.reduce(
        (acc, row) => acc + row.MontoVendido,
        0,
      );

      return res.json({
        success: true,
        data: {
          metadata: {
            reporteTipo: "VENTAS_VENDEDOR",
            titulo: "Rendimiento por Vendedores",
            filtrosAplicados: `Desde: ${fechaInicio} | Hasta: ${fechaFin}`,
            fechaGeneracion: fechaHoraActual,
          },
          resumenKPIs: [
            {
              label: "Vendedor Estrella",
              value: mejorVendedor,
              formato: "TEXTO",
            },
            {
              label: "Monto Total Vendido",
              value: totalVendidoGlobal,
              formato: "MONEDA",
            },
          ],
          reporteTabla: {
            columnas: ["Vendedor", "Cant. Operaciones", "Monto Generado"],
            filas: filasTabla.map((r) => [
              r.Vendedor || "Cajero Sistema",
              r.CantidadVentas,
              r.MontoVendido,
            ]),
          },
        },
      });
    }

    // =======================================================
    // 4. CUADRE DE CAJA (MÉTODOS DE PAGO)
    // =======================================================
    else if (tipoReporte === "cuadre_caja") {
      const { fechaUnica } = filtros;
      const result = await pool.request().input("fecha", sql.Date, fechaUnica)
        .query(`
          SELECT vp.Metodo, ISNULL(SUM(vp.MontoRecibido - vp.Vuelto), 0) AS IngresoNeto
          FROM VentaPago vp
          JOIN Venta v ON vp.VentaID = v.VentaID
          WHERE v.Estado = 'COMPLETADA' AND CAST(v.FechaVenta AS DATE) = @fecha
          GROUP BY vp.Metodo
          ORDER BY IngresoNeto DESC;
        `);

      const filasTabla = result.recordsets[0];
      const totalCaja = filasTabla.reduce(
        (acc, row) => acc + row.IngresoNeto,
        0,
      );
      const efectivoReal =
        filasTabla.find((r) => r.Metodo === "EFECTIVO")?.IngresoNeto || 0;

      return res.json({
        success: true,
        data: {
          metadata: {
            reporteTipo: "CUADRE_CAJA",
            titulo: "Cuadre de Caja Diario",
            filtrosAplicados: `Día: ${fechaUnica}`,
            fechaGeneracion: fechaHoraActual,
          },
          resumenKPIs: [
            {
              label: "Cierre Total del Día",
              value: totalCaja,
              formato: "MONEDA",
            },
            {
              label: "Efectivo Físico en Caja",
              value: efectivoReal,
              formato: "MONEDA",
            },
          ],
          reporteTabla: {
            columnas: ["Método de Pago", "Ingreso Neto (Restando Vueltos)"],
            filas: filasTabla.map((r) => [r.Metodo, r.IngresoNeto]),
          },
        },
      });
    }

    // =======================================================
    // 5. INVENTARIO ACTUAL Y BAJO STOCK
    // =======================================================
    else if (tipoReporte === "inventario_actual") {
      const { categoria } = filtros;
      let queryCat = categoria === "ALL" ? "" : " AND i.CategoriaID = @catId ";

      const result = await pool
        .request()
        .input("catId", sql.Int, categoria === "ALL" ? 0 : categoria).query(`
          SELECT i.Codigo, i.Nombre, ISNULL(c.Nombre, 'Sin Categoría') AS Categoria, 
                 i.StockActual, i.PrecioCompra, (i.StockActual * i.PrecioCompra) AS Valorizado
          FROM Inventario i
          LEFT JOIN Categoria c ON i.CategoriaID = c.CategoriaID
          WHERE i.Activo = 1 ${queryCat}
          ORDER BY i.StockActual ASC;
        `);

      const filasTabla = result.recordsets[0];
      const totalArticulos = filasTabla.reduce(
        (acc, row) => acc + row.StockActual,
        0,
      );
      const capitalInvertido = filasTabla.reduce(
        (acc, row) => acc + row.Valorizado,
        0,
      );

      return res.json({
        success: true,
        data: {
          metadata: {
            reporteTipo: "INVENTARIO_ACTUAL",
            titulo: "Estado de Inventario (Valorización)",
            filtrosAplicados: `Categoría: ${categoria === "ALL" ? "Todas" : "Específica"}`,
            fechaGeneracion: fechaHoraActual,
          },
          resumenKPIs: [
            {
              label: "Unidades Totales Físicas",
              value: totalArticulos,
              formato: "NUMERO",
            },
            {
              label: "Capital Invertido (S/)",
              value: capitalInvertido,
              formato: "MONEDA",
            },
          ],
          reporteTabla: {
            columnas: [
              "Código",
              "Producto",
              "Categoría",
              "Stock Físico",
              "Costo Unitario",
              "Valorización Total",
            ],
            filas: filasTabla.map((r) => [
              r.Codigo || "N/A",
              r.Nombre,
              r.Categoria,
              r.StockActual,
              r.PrecioCompra,
              r.Valorizado,
            ]),
          },
        },
      });
    }

    // =======================================================
    // 6. MOVIMIENTOS DE INVENTARIO (KARDEX GLOBAL)
    // =======================================================
    else if (tipoReporte === "kardex_global") {
      const { fechaInicio, fechaFin } = filtros;
      const result = await pool
        .request()
        .input("inicio", sql.Date, fechaInicio)
        .input("fin", sql.Date, fechaFin).query(`
          SELECT FORMAT(h.FechaMovimiento, 'yyyy-MM-dd HH:mm') AS Fecha, i.Nombre AS Producto, 
                 u.NombreUsuario AS Usuario, h.TipoMovimiento, h.Cantidad, h.Motivo
          FROM HistorialInventario h
          JOIN Inventario i ON h.ProductoID = i.ProductoID
          LEFT JOIN Usuario u ON h.UsuarioID = u.UsuarioID
          WHERE CAST(h.FechaMovimiento AS DATE) BETWEEN @inicio AND @fin
          ORDER BY h.FechaMovimiento DESC;
        `);

      const filasTabla = result.recordsets[0];
      const entradas = filasTabla
        .filter((r) => r.TipoMovimiento === "ENTRADA")
        .reduce((acc, r) => acc + r.Cantidad, 0);
      const salidas = filasTabla
        .filter((r) => r.TipoMovimiento === "SALIDA")
        .reduce((acc, r) => acc + r.Cantidad, 0);

      return res.json({
        success: true,
        data: {
          metadata: {
            reporteTipo: "KARDEX_GLOBAL",
            titulo: "Auditoría de Movimientos de Inventario",
            filtrosAplicados: `Desde: ${fechaInicio} | Hasta: ${fechaFin}`,
            fechaGeneracion: fechaHoraActual,
          },
          resumenKPIs: [
            {
              label: "Total Entradas (Unds)",
              value: entradas,
              formato: "NUMERO",
            },
            {
              label: "Total Salidas (Unds)",
              value: salidas,
              formato: "NUMERO",
            },
          ],
          reporteTabla: {
            columnas: [
              "Fecha",
              "Producto",
              "Usuario",
              "Tipo",
              "Cant.",
              "Motivo",
            ],
            filas: filasTabla.map((r) => [
              r.Fecha,
              r.Producto,
              r.Usuario || "Sistema",
              r.TipoMovimiento,
              r.Cantidad,
              r.Motivo,
            ]),
          },
        },
      });
    }

    // =======================================================
    // 7. DIRECTORIO DE CLIENTES
    // =======================================================
    else if (tipoReporte === "directorio_clientes") {
      const result = await pool.request().query(`
        SELECT Documento, NombreRazonSocial, TipoDocumento, FORMAT(FechaCreacion, 'yyyy-MM-dd') AS FechaRegistro
        FROM Cliente
        WHERE Activo = 1
        ORDER BY FechaCreacion DESC;
      `);

      const filasTabla = result.recordsets[0];
      return res.json({
        success: true,
        data: {
          metadata: {
            reporteTipo: "CLIENTES",
            titulo: "Directorio Global de Clientes",
            filtrosAplicados: "Todos los activos",
            fechaGeneracion: fechaHoraActual,
          },
          resumenKPIs: [
            {
              label: "Total de Clientes Registrados",
              value: filasTabla.length,
              formato: "NUMERO",
            },
          ],
          reporteTabla: {
            columnas: [
              "Documento",
              "Nombre / Razón Social",
              "Tipo",
              "Fecha Registro",
            ],
            filas: filasTabla.map((r) => [
              r.Documento || "N/A",
              r.NombreRazonSocial,
              r.TipoDocumento || "DNI/RUC",
              r.FechaRegistro,
            ]),
          },
        },
      });
    } else {
      return res
        .status(400)
        .json({ success: false, mensaje: "Tipo de reporte no soportado aún." });
    }
  } catch (error) {
    console.error("Error al generar reporte:", error);
    res.status(500).json({
      success: false,
      mensaje: "Error interno al procesar el reporte.",
    });
  }
};

module.exports = { generarReporte };