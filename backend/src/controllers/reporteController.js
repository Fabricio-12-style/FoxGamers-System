const service = require("../services/reporteService");
const empresaService = require("../services/empresaService");
const ExcelJS = require("exceljs");
const {
  aplicarCabeceraExcel,
  aplicarEstilosEncabezadoTabla,
} = require("../utils/excelHelper");

const getReporteGeneral = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, estado, metodoPago, busqueda } = req.query;
    if (!fechaInicio || !fechaFin) {
      return res
        .status(400)
        .json({ success: false, mensaje: "Faltan fechas." });
    }
    const data = await service.obtenerResumenVentasDetallado(
      fechaInicio,
      fechaFin,
      estado,
      metodoPago,
      busqueda,
    );
    res.json({ success: true, ...data });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al generar reporte de ventas." });
  }
};

const getReporteCajeros = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, estado, usuarioId } = req.query;
    if (!fechaInicio || !fechaFin) {
      return res
        .status(400)
        .json({ success: false, mensaje: "Faltan fechas." });
    }
    const data = await service.obtenerVentasCajeros(
      fechaInicio,
      fechaFin,
      estado,
      usuarioId,
    );
    res.json({ success: true, datos: data });
  } catch (e) {
    res.status(500).json({
      success: false,
      mensaje: "Error al generar reporte de cajeros.",
    });
  }
};

const exportarExcelReporte = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, estado, metodoPago, busqueda } = req.query;
    if (!fechaInicio || !fechaFin) {
      return res
        .status(400)
        .json({ success: false, mensaje: "Faltan fechas para exportar." });
    }

    let empresa = {};
    try {
      empresa = await empresaService.obtenerEmpresa();
    } catch (err) {}

    const data = await service.obtenerResumenVentasDetallado(
      fechaInicio,
      fechaFin,
      estado,
      metodoPago,
      busqueda,
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reporte de Ventas Detallado");

    worksheet.getColumn("A").width = 15;
    worksheet.getColumn("B").width = 20;
    worksheet.getColumn("C").width = 35;
    worksheet.getColumn("D").width = 15;
    worksheet.getColumn("E").width = 20;
    worksheet.getColumn("F").width = 15;

    aplicarCabeceraExcel(
      worksheet,
      "Reporte Detallado de Ventas",
      `${fechaInicio} al ${fechaFin}`,
      empresa,
    );

    const headerRow = worksheet.addRow([
      "N° Doc",
      "Fecha",
      "Cliente",
      "Estado",
      "Método(s)",
      "Total (S/)",
    ]);
    aplicarEstilosEncabezadoTabla(headerRow);

    if (data.ventas && data.ventas.length > 0) {
      data.ventas.forEach((venta) => {
        const mainRow = worksheet.addRow([
          `N-${venta.VentaID}`,
          new Date(venta.FechaCreacion).toLocaleString("es-PE"),
          venta.Cliente,
          venta.Estado,
          venta.MetodoResumen,
          parseFloat(venta.Total),
        ]);

        mainRow.getCell(1).alignment = { horizontal: "left" };
        mainRow.getCell(2).alignment = { horizontal: "center" };
        mainRow.getCell(3).alignment = { horizontal: "left" };
        mainRow.getCell(4).alignment = { horizontal: "center" };
        mainRow.getCell(5).alignment = { horizontal: "center" };
        mainRow.getCell(6).alignment = { horizontal: "right" };
        mainRow.getCell(6).numFmt = '"S/" #,##0.00';

        if (venta.MetodoResumen === "MIXTO" && venta.Pagos) {
          mainRow.font = { bold: true };

          venta.Pagos.forEach((pago) => {
            const childRow = worksheet.addRow([
              "",
              "",
              "",
              "",
              `↳ ${pago.Metodo}`,
              parseFloat(pago.MontoRecibido - (pago.Vuelto || 0)),
            ]);

            childRow.font = { italic: true, color: { argb: "FF475569" } };
            childRow.getCell(5).alignment = { horizontal: "right" };
            childRow.getCell(6).alignment = { horizontal: "right" };
            childRow.getCell(6).numFmt = '"S/" #,##0.00';
          });
        }
      });
    } else {
      const emptyRow = worksheet.addRow([
        "Sin ventas con los filtros aplicados",
        "",
        "",
        "",
        "",
        "",
      ]);
      worksheet.mergeCells(`A${emptyRow.number}:F${emptyRow.number}`);
      emptyRow.getCell(1).alignment = { horizontal: "center" };
      emptyRow.getCell(1).font = { italic: true, color: { argb: "FF94A3B8" } };
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Ventas_FoxGamers_${fechaInicio}_al_${fechaFin}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        mensaje: "Error interno al generar el Excel.",
      });
    }
  }
};

const exportarExcelCajeros = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, estado, usuarioId } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res
        .status(400)
        .json({ success: false, mensaje: "Faltan fechas para exportar." });
    }

    let empresa = {};
    try {
      empresa = await empresaService.obtenerEmpresa();
    } catch (err) {}

    const data = await service.obtenerVentasCajeros(
      fechaInicio,
      fechaFin,
      estado,
      usuarioId,
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Ranking Cajeros");

    worksheet.getColumn("A").width = 30;
    worksheet.getColumn("B").width = 20;
    worksheet.getColumn("C").width = 25;
    worksheet.getColumn("D").width = 20;

    aplicarCabeceraExcel(
      worksheet,
      "Rendimiento por Cajeros",
      `${fechaInicio} al ${fechaFin}`,
      empresa,
    );

    const headerRow = worksheet.addRow([
      "Nombre",
      "Transacciones",
      "Total Generado",
      "Ticket Promedio",
    ]);
    aplicarEstilosEncabezadoTabla(headerRow);

    // Validación: Solo iteramos si hay datos reales
    if (data && data.length > 0) {
      data.forEach((c) => {
        const dataRow = worksheet.addRow([
          c.Nombre,
          c.Transacciones,
          parseFloat(c.TotalVendido),
          parseFloat(c.TicketPromedio),
        ]);
        dataRow.getCell(1).alignment = { horizontal: "left" };
        dataRow.getCell(2).alignment = { horizontal: "center" };
        dataRow.getCell(3).alignment = { horizontal: "right" };
        dataRow.getCell(3).numFmt = '"S/" #,##0.00';
        dataRow.getCell(4).alignment = { horizontal: "right" };
        dataRow.getCell(4).numFmt = '"S/" #,##0.00';
      });
    } else {
      const emptyRow = worksheet.addRow([
        "Sin ventas registradas con los filtros aplicados",
        "",
        "",
        "",
      ]);
      worksheet.mergeCells(`A${emptyRow.number}:D${emptyRow.number}`);
      emptyRow.getCell(1).alignment = { horizontal: "center" };
      emptyRow.getCell(1).font = { italic: true, color: { argb: "FF94A3B8" } };
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Ranking_Cajeros_${fechaInicio}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("Error crítico Exportación Cajeros:", e);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        mensaje: "Error al generar el archivo Excel de cajeros.",
      });
    }
  }
};

const getReporteInventario = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, categoriaId, estadoStock, busqueda } =
      req.query;
    if (!fechaInicio || !fechaFin) {
      return res
        .status(400)
        .json({ success: false, mensaje: "Faltan fechas." });
    }
    const data = await service.obtenerReporteInventario(
      fechaInicio,
      fechaFin,
      categoriaId,
      estadoStock,
      busqueda,
    );
    res.json({ success: true, ...data });
  } catch (e) {
    console.error("🔥 Error Crítico en getReporteInventario:", e);
    res.status(500).json({
      success: false,
      mensaje: "Error al generar reporte de inventario.",
    });
  }
};

const exportarExcelInventario = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, categoriaId, estadoStock, busqueda } =
      req.query;
    if (!fechaInicio || !fechaFin) {
      return res
        .status(400)
        .json({ success: false, mensaje: "Faltan fechas para exportar." });
    }

    let empresa = {};
    try {
      empresa = await empresaService.obtenerEmpresa();
    } catch (err) {}

    const data = await service.obtenerReporteInventario(
      fechaInicio,
      fechaFin,
      categoriaId,
      estadoStock,
      busqueda,
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Inventario y Ventas");

    worksheet.getColumn("A").width = 10;
    worksheet.getColumn("B").width = 40;
    worksheet.getColumn("C").width = 25;
    worksheet.getColumn("D").width = 15;
    worksheet.getColumn("E").width = 15;
    worksheet.getColumn("F").width = 15;

    aplicarCabeceraExcel(
      worksheet,
      "Reporte de Inventario y Top Productos",
      `${fechaInicio} al ${fechaFin}`,
      empresa,
    );

    const headerRow = worksheet.addRow([
      "Posición",
      "Producto",
      "Categoría",
      "Ventas (Unds)",
      "Stock Actual",
      "Estado",
    ]);
    aplicarEstilosEncabezadoTabla(headerRow);

    if (data.productos && data.productos.length > 0) {
      data.productos.forEach((p, index) => {
        const dataRow = worksheet.addRow([
          index + 1,
          p.Producto,
          p.Categoria,
          p.Ventas,
          p.StockActual,
          p.EstadoStock,
        ]);
        dataRow.getCell(1).alignment = { horizontal: "center" };
        dataRow.getCell(2).alignment = { horizontal: "left" };
        dataRow.getCell(3).alignment = { horizontal: "left" };
        dataRow.getCell(4).alignment = { horizontal: "center" };
        dataRow.getCell(5).alignment = { horizontal: "center" };
        dataRow.getCell(6).alignment = { horizontal: "center" };

        if (p.EstadoStock === "AGOTADO")
          dataRow.getCell(6).font = { color: { argb: "FFDC2626" }, bold: true };
        if (p.EstadoStock === "BAJO")
          dataRow.getCell(6).font = { color: { argb: "FFD97706" }, bold: true };
        if (p.EstadoStock === "OK")
          dataRow.getCell(6).font = { color: { argb: "FF16A34A" }, bold: true };
      });
    } else {
      const emptyRow = worksheet.addRow([
        "Sin productos que coincidan con los filtros",
        "",
        "",
        "",
        "",
        "",
      ]);
      worksheet.mergeCells(`A${emptyRow.number}:F${emptyRow.number}`);
      emptyRow.getCell(1).alignment = { horizontal: "center" };
      emptyRow.getCell(1).font = { italic: true, color: { argb: "FF94A3B8" } };
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Inventario_${fechaInicio}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        mensaje: "Error al generar Excel de inventario.",
      });
    }
  }
};

const getReporteUtilidades = async (req, res) => {
  try {
    const {
      fechaInicio,
      fechaFin,
      nivelAnalisis = "PRODUCTO",
      categoriaId,
      alertaRentabilidad,
      busqueda,
    } = req.query;
    if (!fechaInicio || !fechaFin) {
      return res
        .status(400)
        .json({ success: false, mensaje: "Faltan fechas." });
    }
    const data = await service.obtenerReporteUtilidades(
      fechaInicio,
      fechaFin,
      nivelAnalisis,
      categoriaId,
      alertaRentabilidad,
      busqueda,
    );
    res.json({ success: true, ...data });
  } catch (e) {
    console.error("🔥 Error en getReporteUtilidades:", e);
    res.status(500).json({
      success: false,
      mensaje: "Error al generar reporte de utilidades.",
    });
  }
};

const exportarExcelUtilidades = async (req, res) => {
  try {
    const {
      fechaInicio,
      fechaFin,
      nivelAnalisis = "PRODUCTO",
      categoriaId,
      alertaRentabilidad,
      busqueda,
    } = req.query;
    if (!fechaInicio || !fechaFin) {
      return res
        .status(400)
        .json({ success: false, mensaje: "Faltan fechas para exportar." });
    }

    let empresa = {};
    try {
      empresa = await empresaService.obtenerEmpresa();
    } catch (err) {}

    const data = await service.obtenerReporteUtilidades(
      fechaInicio,
      fechaFin,
      nivelAnalisis,
      categoriaId,
      alertaRentabilidad,
      busqueda,
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Utilidades y Rentabilidad");

    worksheet.getColumn("A").width = 15;
    worksheet.getColumn("B").width = 40;
    worksheet.getColumn("C").width = 25;
    worksheet.getColumn("D").width = 15;
    worksheet.getColumn("E").width = 20;
    worksheet.getColumn("F").width = 20;
    worksheet.getColumn("G").width = 20;
    worksheet.getColumn("H").width = 15;

    aplicarCabeceraExcel(
      worksheet,
      `Reporte de Rentabilidad por ${nivelAnalisis === "CATEGORIA" ? "Categoría" : "Producto"}`,
      `${fechaInicio} al ${fechaFin}`,
      empresa,
    );

    const headerRow = worksheet.addRow([
      "Código/ID",
      "Concepto",
      "Categoría",
      "Unds Vendidas",
      "Ingreso Total",
      "Costo Total",
      "Utilidad Neta",
      "Margen",
    ]);
    aplicarEstilosEncabezadoTabla(headerRow);

    if (data.detalles && data.detalles.length > 0) {
      data.detalles.forEach((row) => {
        const dataRow = worksheet.addRow([
          row.ID,
          row.Concepto,
          row.Categoria,
          row.UnidadesVendidas,
          parseFloat(row.IngresoTotal),
          parseFloat(row.CostoTotal),
          parseFloat(row.UtilidadNeta),
          `${parseFloat(row.MargenPorcentaje).toFixed(2)}%`,
        ]);
        dataRow.getCell(1).alignment = { horizontal: "center" };
        dataRow.getCell(2).alignment = { horizontal: "left" };
        dataRow.getCell(3).alignment = { horizontal: "left" };
        dataRow.getCell(4).alignment = { horizontal: "center" };

        for (let i = 5; i <= 7; i++) {
          dataRow.getCell(i).alignment = { horizontal: "right" };
          dataRow.getCell(i).numFmt = '"S/" #,##0.00';
        }
        dataRow.getCell(7).font = {
          bold: true,
          color: { argb: row.UtilidadNeta < 0 ? "FFDC2626" : "FF16A34A" },
        };
        dataRow.getCell(8).alignment = { horizontal: "right" };
        dataRow.getCell(8).font = { bold: true };
      });

      const summaryRow = worksheet.addRow([
        "",
        "TOTALES DEL PERIODO",
        "",
        "",
        parseFloat(data.kpis.totalIngresos),
        parseFloat(data.kpis.totalCostos),
        parseFloat(data.kpis.totalUtilidad),
        `${parseFloat(data.kpis.margenGeneral).toFixed(2)}%`,
      ]);
      summaryRow.font = { bold: true };
      summaryRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };
      for (let i = 5; i <= 7; i++)
        summaryRow.getCell(i).numFmt = '"S/" #,##0.00';
    } else {
      const emptyRow = worksheet.addRow([
        "Sin datos para los filtros aplicados",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
      worksheet.mergeCells(`A${emptyRow.number}:H${emptyRow.number}`);
      emptyRow.getCell(1).alignment = { horizontal: "center" };
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Utilidades_${fechaInicio}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    if (!res.headersSent)
      res
        .status(500)
        .json({ success: false, mensaje: "Error al generar Excel." });
  }
};

const getReporteFlujoCaja = async (req, res) => {
  try {
    const { fecha, usuarioId } = req.query;
    if (!fecha)
      return res
        .status(400)
        .json({ success: false, mensaje: "Falta la fecha de consulta." });

    const data = await service.obtenerFlujoCajaDiario(fecha, usuarioId);
    res.json({ success: true, ...data });
  } catch (e) {
    console.error("🔥 Error en getReporteFlujoCaja:", e);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al generar flujo de caja." });
  }
};

const exportarExcelFlujoCaja = async (req, res) => {
  try {
    const { fecha, usuarioId } = req.query;
    if (!fecha)
      return res
        .status(400)
        .json({ success: false, mensaje: "Falta la fecha para exportar." });

    let empresa = {};
    try {
      empresa = await empresaService.obtenerEmpresa();
    } catch (err) {}

    const data = await service.obtenerFlujoCajaDiario(fecha, usuarioId);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Flujo de Caja");

    worksheet.getColumn("A").width = 30;
    worksheet.getColumn("B").width = 25;
    worksheet.getColumn("C").width = 25;
    worksheet.getColumn("D").width = 25;
    worksheet.getColumn("E").width = 25;
    worksheet.getColumn("F").width = 25;

    aplicarCabeceraExcel(
      worksheet,
      "Reporte Diario de Flujo de Caja",
      `Fecha: ${fecha}`,
      empresa,
    );

    const headerRow = worksheet.addRow([
      "Cajero / Vendedor",
      "Efectivo (Físico)",
      "Billetera Digital",
      "Pagos con Tarjeta",
      "Transferencias",
      "Total Generado",
    ]);
    aplicarEstilosEncabezadoTabla(headerRow);

    if (data.detalles && data.detalles.length > 0) {
      data.detalles.forEach((row) => {
        const dataRow = worksheet.addRow([
          row.Cajero,
          `S/ ${parseFloat(row.TotalEfectivo).toFixed(2)} (${row.TransaccionesEfectivo} tx)`,
          `S/ ${parseFloat(row.TotalDigital).toFixed(2)} (${row.TransaccionesDigital} tx)`,
          `S/ ${parseFloat(row.TotalTarjeta).toFixed(2)} (${row.TransaccionesTarjeta} tx)`,
          `S/ ${parseFloat(row.TotalTransferencia).toFixed(2)} (${row.TransaccionesTransferencia} tx)`,
          parseFloat(row.TotalGenerado),
        ]);

        dataRow.getCell(1).alignment = { horizontal: "left" };
        for (let i = 2; i <= 5; i++) {
          dataRow.getCell(i).alignment = { horizontal: "center" };
        }
        dataRow.getCell(6).alignment = { horizontal: "right" };
        dataRow.getCell(6).numFmt = '"S/" #,##0.00';
        dataRow.getCell(6).font = { bold: true };
      });
    } else {
      const emptyRow = worksheet.addRow([
        "Sin movimientos registrados en esta fecha",
        "",
        "",
        "",
        "",
        "",
      ]);
      worksheet.mergeCells(`A${emptyRow.number}:F${emptyRow.number}`);
      emptyRow.getCell(1).alignment = { horizontal: "center" };
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=FlujoCaja_${fecha}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("Error al exportar Excel de Flujo de Caja:", e);
    if (!res.headersSent)
      res
        .status(500)
        .json({ success: false, mensaje: "Error al generar Excel." });
  }
};

module.exports = {
  getReporteGeneral,
  getReporteCajeros,
  getReporteInventario,
  getReporteUtilidades,
  getReporteFlujoCaja,
  exportarExcelReporte,
  exportarExcelCajeros,
  exportarExcelInventario,
  exportarExcelUtilidades,
  exportarExcelFlujoCaja,
};