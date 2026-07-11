const { getConnection, sql } = require("../config/db");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

// =======================================================
// 1. GENERADOR DE REPORTES JSON
// =======================================================
const generarReporte = async (req, res) => {
  const { tipoReporte, filtros } = req.body;

  try {
    const pool = await getConnection();
    const fechaHoraActual = new Date().toLocaleString();

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
    } else if (tipoReporte === "productos_top") {
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
    } else if (tipoReporte === "ventas_vendedor") {
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
    } else if (tipoReporte === "cuadre_caja") {
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
    } else if (tipoReporte === "inventario_actual") {
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
    } else if (tipoReporte === "kardex_global") {
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
    } else if (tipoReporte === "directorio_clientes") {
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
    } else if (tipoReporte === "totalizado_ventas") {
      const { fechaInicio, fechaFin } = filtros;

      // 🚀 LÓGICA SIN IGV
      const result = await pool
        .request()
        .input("inicio", sql.Date, fechaInicio)
        .input("fin", sql.Date, fechaFin).query(`
          WITH PagosAgrupados AS (
              SELECT VentaID, 
                  SUM(CASE WHEN Metodo = 'Efectivo' THEN MontoRecibido - Vuelto ELSE 0 END) AS Total_Efectivo,
                  SUM(CASE WHEN Metodo IN ('Yape', 'Plin') THEN MontoRecibido ELSE 0 END) AS Total_Billeteras,
                  SUM(CASE WHEN Metodo LIKE '%Tarjeta%' OR Metodo LIKE '%Visa%' OR Metodo LIKE '%Mastercard%' THEN MontoRecibido ELSE 0 END) AS Total_Tarjetas
              FROM dbo.VentaPago GROUP BY VentaID
          )
          SELECT 
              FORMAT(v.FechaVenta, 'yyyy-MM-dd') AS Fecha,
              u.NombreUsuario AS Vendedor,
              COUNT(v.VentaID) AS Cantidad_Transacciones,
              ISNULL(SUM(v.Subtotal), 0) AS Subtotal_Neto,
              ISNULL(SUM(p.Total_Efectivo), 0) AS Total_Efectivo,
              ISNULL(SUM(p.Total_Billeteras), 0) AS Total_Billeteras,
              ISNULL(SUM(p.Total_Tarjetas), 0) AS Total_Tarjetas,
              ISNULL(SUM(v.Total), 0) AS Total_Recaudado
          FROM dbo.Venta v
          INNER JOIN dbo.Usuario u ON v.UsuarioID = u.UsuarioID
          LEFT JOIN PagosAgrupados p ON v.VentaID = p.VentaID
          WHERE v.Estado = 'COMPLETADA' AND CAST(v.FechaVenta AS DATE) BETWEEN @inicio AND @fin
          GROUP BY FORMAT(v.FechaVenta, 'yyyy-MM-dd'), u.UsuarioID, u.NombreUsuario
          ORDER BY Fecha DESC, Vendedor ASC;
        `);

      const filasTabla = result.recordsets[0];
      const totalRecaudadoGlobal = filasTabla.reduce(
        (acc, row) => acc + row.Total_Recaudado,
        0,
      );
      const totalTransacciones = filasTabla.reduce(
        (acc, row) => acc + row.Cantidad_Transacciones,
        0,
      );

      return res.json({
        success: true,
        data: {
          metadata: {
            reporteTipo: "TOTALIZADO_VENTAS",
            titulo: "Totalizado de Ingresos / Egresos",
            filtrosAplicados: `Desde: ${fechaInicio} | Hasta: ${fechaFin}`,
            fechaGeneracion: fechaHoraActual,
          },
          resumenKPIs: [
            {
              label: "Total Recaudado",
              value: totalRecaudadoGlobal,
              formato: "MONEDA",
            },
            {
              label: "Total Transacciones",
              value: totalTransacciones,
              formato: "NUMERO",
            },
          ],
          reporteTabla: {
            columnas: [
              "Fecha",
              "Vendedor",
              "Transacciones",
              "Efectivo",
              "Billeteras",
              "Tarjetas",
              "Total Recaudado",
            ],
            filas: filasTabla.map((r) => [
              r.Fecha,
              r.Vendedor,
              r.Cantidad_Transacciones,
              r.Total_Efectivo,
              r.Total_Billeteras,
              r.Total_Tarjetas,
              r.Total_Recaudado,
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

// =======================================================
// 2. EXPORTADOR A EXCEL PREMIUM CORPORATIVO
// =======================================================
const exportarExcelReporte = async (req, res) => {
  const { tipoReporte, fechaInicio, fechaFin, categoria, fechaUnica } =
    req.query;

  try {
    const pool = await getConnection();

    let nombreHoja = "Reporte";
    let columnasConfig = [];
    let filasData = [];
    let tituloReporte = "Reporte General";

    if (tipoReporte === "ventas_periodo") {
      nombreHoja = "Ventas Periodo";
      tituloReporte = "REPORTE DE VENTAS POR PERÍODO";
      const result = await pool
        .request()
        .input("inicio", sql.Date, fechaInicio)
        .input("fin", sql.Date, fechaFin)
        .query(
          `SELECT v.NumeroDoc, ISNULL(c.NombreRazonSocial, 'PÚBLICO GENERAL') AS Cliente, FORMAT(v.FechaVenta, 'yyyy-MM-dd HH:mm') AS Fecha, v.MetodoPago AS Metodo, v.Total FROM Venta v LEFT JOIN Cliente c ON v.ClienteID = c.ClienteID WHERE v.Estado = 'COMPLETADA' AND CAST(FechaVenta AS DATE) BETWEEN @inicio AND @fin ORDER BY v.FechaVenta DESC;`,
        );
      columnasConfig = [
        { header: "Documento", key: "doc", width: 20 },
        { header: "Cliente", key: "cliente", width: 45 },
        { header: "Fecha", key: "fecha", width: 22 },
        { header: "Método", key: "metodo", width: 20 },
        { header: "Total", key: "total", width: 18, esMoneda: true },
      ];
      filasData = result.recordsets[0].map((r) => ({
        doc: r.NumeroDoc,
        cliente: r.Cliente,
        fecha: r.Fecha,
        metodo: r.Metodo,
        total: r.Total,
      }));
    } else if (tipoReporte === "productos_top") {
      nombreHoja = "Productos Top";
      tituloReporte = "RANKING DE PRODUCTOS MÁS VENDIDOS";
      const result = await pool
        .request()
        .input("inicio", sql.Date, fechaInicio)
        .input("fin", sql.Date, fechaFin)
        .query(
          `SELECT TOP 20 i.Codigo, i.Nombre, SUM(dv.Cantidad) AS CantidadVendida, SUM(dv.Subtotal) AS IngresoGenerado FROM DetalleVenta dv JOIN Inventario i ON dv.ProductoID = i.ProductoID JOIN Venta v ON dv.VentaID = v.VentaID WHERE v.Estado = 'COMPLETADA' AND CAST(v.FechaVenta AS DATE) BETWEEN @inicio AND @fin GROUP BY i.Codigo, i.Nombre ORDER BY CantidadVendida DESC;`,
        );
      columnasConfig = [
        { header: "Código", key: "codigo", width: 20 },
        { header: "Producto", key: "producto", width: 55 },
        { header: "Cant. Vendida", key: "cant", width: 18, esNumero: true },
        { header: "Total Generado", key: "total", width: 22, esMoneda: true },
      ];
      filasData = result.recordsets[0].map((r) => ({
        codigo: r.Codigo || "N/A",
        producto: r.Nombre,
        cant: r.CantidadVendida,
        total: r.IngresoGenerado,
      }));
    } else if (tipoReporte === "ventas_vendedor") {
      nombreHoja = "Rendimiento Vendedores";
      tituloReporte = "RENDIMIENTO COMERCIAL POR VENDEDOR";
      const result = await pool
        .request()
        .input("inicio", sql.Date, fechaInicio)
        .input("fin", sql.Date, fechaFin)
        .query(
          `SELECT u.NombreUsuario AS Vendedor, COUNT(v.VentaID) AS CantidadVentas, ISNULL(SUM(v.Total), 0) AS MontoVendido FROM Venta v LEFT JOIN Usuario u ON v.UsuarioID = u.UsuarioID WHERE v.Estado = 'COMPLETADA' AND CAST(v.FechaVenta AS DATE) BETWEEN @inicio AND @fin GROUP BY u.NombreUsuario ORDER BY MontoVendido DESC;`,
        );
      columnasConfig = [
        { header: "Vendedor", key: "vendedor", width: 40 },
        { header: "Cant. Operaciones", key: "cant", width: 20, esNumero: true },
        { header: "Monto Generado", key: "monto", width: 25, esMoneda: true },
      ];
      filasData = result.recordsets[0].map((r) => ({
        vendedor: r.Vendedor || "Cajero Sistema",
        cant: r.CantidadVentas,
        monto: r.MontoVendido,
      }));
    } else if (tipoReporte === "cuadre_caja") {
      nombreHoja = "Cuadre Caja";
      tituloReporte = "CUADRE DE CAJA - MÉTODOS DE PAGO";
      const result = await pool
        .request()
        .input("fecha", sql.Date, fechaUnica)
        .query(
          `SELECT vp.Metodo, ISNULL(SUM(vp.MontoRecibido - vp.Vuelto), 0) AS IngresoNeto FROM VentaPago vp JOIN Venta v ON vp.VentaID = v.VentaID WHERE v.Estado = 'COMPLETADA' AND CAST(v.FechaVenta AS DATE) = @fecha GROUP BY vp.Metodo ORDER BY IngresoNeto DESC;`,
        );
      columnasConfig = [
        { header: "Método de Pago", key: "metodo", width: 35 },
        { header: "Ingreso Neto", key: "ingreso", width: 25, esMoneda: true },
      ];
      filasData = result.recordsets[0].map((r) => ({
        metodo: r.Metodo,
        ingreso: r.IngresoNeto,
      }));
    } else if (tipoReporte === "inventario_actual") {
      nombreHoja = "Valorizacion Inv.";
      tituloReporte = "VALORIZACIÓN DE INVENTARIO ACTUAL";
      let queryCat = categoria === "ALL" ? "" : " AND i.CategoriaID = @catId ";
      const result = await pool
        .request()
        .input("catId", sql.Int, categoria === "ALL" ? 0 : categoria)
        .query(
          `SELECT i.Codigo, i.Nombre, ISNULL(c.Nombre, 'Sin Categoría') AS Categoria, i.StockActual, i.PrecioCompra, (i.StockActual * i.PrecioCompra) AS Valorizado FROM Inventario i LEFT JOIN Categoria c ON i.CategoriaID = c.CategoriaID WHERE i.Activo = 1 ${queryCat} ORDER BY i.StockActual ASC;`,
        );
      columnasConfig = [
        { header: "Código", key: "codigo", width: 20 },
        { header: "Producto", key: "producto", width: 50 },
        { header: "Categoría", key: "categoria", width: 25 },
        { header: "Stock Físico", key: "stock", width: 15, esNumero: true },
        { header: "Costo Unit.", key: "costo", width: 18, esMoneda: true },
        {
          header: "Valorización",
          key: "valorizado",
          width: 20,
          esMoneda: true,
        },
      ];
      filasData = result.recordsets[0].map((r) => ({
        codigo: r.Codigo || "N/A",
        producto: r.Nombre,
        categoria: r.Categoria,
        stock: r.StockActual,
        costo: r.PrecioCompra,
        valorizado: r.Valorizado,
      }));
    } else if (tipoReporte === "kardex_global") {
      nombreHoja = "Kardex Global";
      tituloReporte = "AUDITORÍA DE MOVIMIENTOS DE INVENTARIO";
      const result = await pool
        .request()
        .input("inicio", sql.Date, fechaInicio)
        .input("fin", sql.Date, fechaFin)
        .query(
          `SELECT FORMAT(h.FechaMovimiento, 'yyyy-MM-dd HH:mm') AS Fecha, i.Nombre AS Producto, u.NombreUsuario AS Usuario, h.TipoMovimiento, h.Cantidad, h.Motivo FROM HistorialInventario h JOIN Inventario i ON h.ProductoID = i.ProductoID LEFT JOIN Usuario u ON h.UsuarioID = u.UsuarioID WHERE CAST(h.FechaMovimiento AS DATE) BETWEEN @inicio AND @fin ORDER BY h.FechaMovimiento DESC;`,
        );
      columnasConfig = [
        { header: "Fecha", key: "fecha", width: 22 },
        { header: "Producto", key: "producto", width: 45 },
        { header: "Usuario", key: "usuario", width: 25 },
        { header: "Tipo", key: "tipo", width: 15 },
        { header: "Cant.", key: "cant", width: 12, esNumero: true },
        { header: "Motivo", key: "motivo", width: 35 },
      ];
      filasData = result.recordsets[0].map((r) => ({
        fecha: r.Fecha,
        producto: r.Producto,
        usuario: r.Usuario || "Sistema",
        tipo: r.TipoMovimiento,
        cant: r.Cantidad,
        motivo: r.Motivo,
      }));
    } else if (tipoReporte === "directorio_clientes") {
      nombreHoja = "Directorio Clientes";
      tituloReporte = "DIRECTORIO GLOBAL DE CLIENTES";
      const result = await pool
        .request()
        .query(
          `SELECT Documento, NombreRazonSocial, TipoDocumento, FORMAT(FechaCreacion, 'yyyy-MM-dd') AS FechaRegistro FROM Cliente WHERE Activo = 1 ORDER BY FechaCreacion DESC;`,
        );
      columnasConfig = [
        { header: "Documento", key: "doc", width: 20 },
        { header: "Nombre / Razón Social", key: "nombre", width: 50 },
        { header: "Tipo", key: "tipo", width: 15 },
        { header: "Fecha Registro", key: "fecha", width: 20 },
      ];
      filasData = result.recordsets[0].map((r) => ({
        doc: r.Documento || "N/A",
        nombre: r.NombreRazonSocial,
        tipo: r.TipoDocumento || "DNI/RUC",
        fecha: r.FechaRegistro,
      }));
    } else if (tipoReporte === "totalizado_ventas") {
      // 🚀 LÓGICA SIN IGV
      nombreHoja = "Totalizado Ventas";
      tituloReporte = "REPORTE TOTALIZADO DE INGRESOS Y EGRESOS";
      const result = await pool
        .request()
        .input("inicio", sql.Date, fechaInicio)
        .input("fin", sql.Date, fechaFin).query(`
          WITH PagosAgrupados AS (
              SELECT VentaID, SUM(CASE WHEN Metodo = 'Efectivo' THEN MontoRecibido - Vuelto ELSE 0 END) AS Total_Efectivo, SUM(CASE WHEN Metodo IN ('Yape', 'Plin') THEN MontoRecibido ELSE 0 END) AS Total_Billeteras, SUM(CASE WHEN Metodo LIKE '%Tarjeta%' OR Metodo LIKE '%Visa%' OR Metodo LIKE '%Mastercard%' THEN MontoRecibido ELSE 0 END) AS Total_Tarjetas FROM dbo.VentaPago GROUP BY VentaID
          )
          SELECT FORMAT(v.FechaVenta, 'yyyy-MM-dd') AS Fecha, u.NombreUsuario AS Vendedor, COUNT(v.VentaID) AS Cantidad_Transacciones, ISNULL(SUM(v.Subtotal), 0) AS Subtotal_Neto, ISNULL(SUM(p.Total_Efectivo), 0) AS Total_Efectivo, ISNULL(SUM(p.Total_Billeteras), 0) AS Total_Billeteras, ISNULL(SUM(p.Total_Tarjetas), 0) AS Total_Tarjetas, ISNULL(SUM(v.Total), 0) AS Total_Recaudado FROM dbo.Venta v INNER JOIN dbo.Usuario u ON v.UsuarioID = u.UsuarioID LEFT JOIN PagosAgrupados p ON v.VentaID = p.VentaID WHERE v.Estado = 'COMPLETADA' AND CAST(v.FechaVenta AS DATE) BETWEEN @inicio AND @fin GROUP BY FORMAT(v.FechaVenta, 'yyyy-MM-dd'), u.UsuarioID, u.NombreUsuario ORDER BY Fecha DESC, Vendedor ASC;
        `);
      columnasConfig = [
        { header: "Fecha", key: "fecha", width: 15 },
        { header: "Vendedor", key: "vendedor", width: 35 },
        { header: "Transacciones", key: "trans", width: 16, esNumero: true },
        { header: "Efectivo", key: "efec", width: 18, esMoneda: true },
        { header: "Billeteras", key: "bille", width: 18, esMoneda: true },
        { header: "Tarjetas", key: "tarj", width: 18, esMoneda: true },
        { header: "Total Recaudado", key: "total", width: 22, esMoneda: true },
      ];
      filasData = result.recordsets[0].map((r) => ({
        fecha: r.Fecha,
        vendedor: r.Vendedor,
        trans: r.Cantidad_Transacciones,
        efec: r.Total_Efectivo,
        bille: r.Total_Billeteras,
        tarj: r.Total_Tarjetas,
        total: r.Total_Recaudado,
      }));
    } else {
      return res.status(400).json({
        success: false,
        mensaje: "Tipo de reporte no soportado para exportación.",
      });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FOX GAMERS";
    const worksheet = workbook.addWorksheet(nombreHoja, {
      views: [{ showGridLines: false }],
    });

    columnasConfig.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width;
    });

    try {
      const rutasLogoPosibles = [
        path.join(__dirname, "../../public/uploads/logo.png"),
        path.join(__dirname, "../../public/images/logo.png"),
        path.join(__dirname, "../public/uploads/logo.png"),
        path.join(__dirname, "../assets/logo.png"),
      ];

      let logoEncontradoPath = null;
      for (const ruta of rutasLogoPosibles) {
        if (fs.existsSync(ruta)) {
          logoEncontradoPath = ruta;
          break;
        }
      }

      if (logoEncontradoPath) {
        const logoId = workbook.addImage({
          filename: logoEncontradoPath,
          extension: "png",
        });
        worksheet.addImage(logoId, {
          tl: { col: 0, row: 1 },
          br: { col: 2, row: 5 },
          editAs: "absolute",
        });
      }
    } catch (e) {
      console.log(
        "Aviso: No se pudo acoplar el logo dinámico al Excel:",
        e.message,
      );
    }

    worksheet.mergeCells("D2:H2");
    const cellEmpresa = worksheet.getCell("D2");
    cellEmpresa.value = "FOX GAMERS";
    cellEmpresa.font = { size: 18, bold: true, color: { argb: "FF0F172A" } };
    cellEmpresa.alignment = { vertical: "middle", horizontal: "left" };

    worksheet.mergeCells("D3:H3");
    const cellTitulo = worksheet.getCell("D3");
    cellTitulo.value = tituloReporte;
    cellTitulo.font = { size: 12, bold: true, color: { argb: "FF475569" } };

    worksheet.mergeCells("D4:H4");
    worksheet.getCell("D4").value =
      `Fecha de impresión: ${new Date().toLocaleString("es-PE")}`;
    worksheet.getCell("D4").font = { size: 10, italic: true };

    worksheet.mergeCells("D5:H5");
    let txtFiltro = "Filtro: Todos los registros históricos.";
    if (fechaInicio && fechaFin)
      txtFiltro = `Rango de fechas: ${fechaInicio} al ${fechaFin}`;
    else if (fechaUnica) txtFiltro = `Día de consulta: ${fechaUnica}`;
    worksheet.getCell("D5").value = txtFiltro;
    worksheet.getCell("D5").font = { size: 10, bold: true };

    const filaCabecera = worksheet.getRow(7);
    filaCabecera.values = columnasConfig.map((c) => c.header);
    filaCabecera.height = 25;

    filaCabecera.eachCell((cell, colNumber) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" },
      };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    let currentRow = 8;
    const subtotales = {};

    filasData.forEach((dataRow) => {
      const filaData = worksheet.getRow(currentRow);
      const valoresFila = columnasConfig.map((c) => dataRow[c.key]);
      filaData.values = valoresFila;

      filaData.eachCell((cell, colNumber) => {
        const config = columnasConfig[colNumber - 1];

        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        cell.font = { size: 10 };

        if (config.esMoneda) {
          cell.numFmt = '"S/" #,##0.00';
          cell.alignment = { vertical: "middle", horizontal: "right" };
          subtotales[colNumber] =
            (subtotales[colNumber] || 0) + (Number(cell.value) || 0);
        } else if (config.esNumero) {
          cell.numFmt = "#,##0";
          cell.alignment = { vertical: "middle", horizontal: "center" };
          subtotales[colNumber] =
            (subtotales[colNumber] || 0) + (Number(cell.value) || 0);
        } else {
          cell.alignment = { vertical: "middle", horizontal: "left" };
        }
      });
      currentRow++;
    });

    if (Object.keys(subtotales).length > 0) {
      const filaTotales = worksheet.getRow(currentRow);

      const celdaEtiqueta = filaTotales.getCell(1);
      celdaEtiqueta.value = "TOTALES GLOBALES";
      celdaEtiqueta.alignment = { vertical: "middle", horizontal: "right" };

      filaTotales.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { bold: true, size: 11, color: { argb: "FF0F172A" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF1F5F9" },
        };
        cell.border = {
          top: { style: "medium", color: { argb: "FF94A3B8" } },
          bottom: { style: "medium", color: { argb: "FF94A3B8" } },
        };

        if (subtotales[colNumber]) {
          cell.value = subtotales[colNumber];
          const config = columnasConfig[colNumber - 1];
          cell.numFmt = config.esMoneda ? '"S/" #,##0.00' : "#,##0";
          cell.alignment = { vertical: "middle", horizontal: "right" };
        }
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Reporte_FoxGamers_${new Date().getTime()}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    console.error("Error al exportar Excel:", error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error interno al generar el Excel." });
  }
};

module.exports = { generarReporte, exportarExcelReporte };