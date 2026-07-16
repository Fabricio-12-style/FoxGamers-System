const repository = require("../repositories/reporteRepository");

class ReporteService {
  async obtenerResumenVentasDetallado(
    fechaInicio,
    fechaFin,
    estado,
    metodoPago,
    busqueda,
  ) {
    const totales = await repository.getVentasTotales(fechaInicio, fechaFin);
    const ventas = await repository.getVentasDetalladas(
      fechaInicio,
      fechaFin,
      estado,
      metodoPago,
      busqueda,
    );

    if (!ventas || ventas.length === 0) {
      return { resumen: totales, ventas: [] };
    }

    const ventaIds = ventas.map((v) => v.VentaID);
    const pagos = await repository.getPagosPorVentas(ventaIds);

    const ventasConPagos = ventas.map((venta) => {
      const pagosVenta = pagos.filter((p) => p.VentaID === venta.VentaID);
      let metodoResumen = "NO DEFINIDO";

      if (venta.CantidadPagos > 1) {
        metodoResumen = "MIXTO";
      } else if (venta.CantidadPagos === 1) {
        metodoResumen = venta.UnicoMetodo;
      }

      return {
        ...venta,
        MetodoResumen: metodoResumen,
        Pagos: pagosVenta,
      };
    });

    return {
      resumen: totales,
      ventas: ventasConPagos,
    };
  }

  async obtenerVentasCajeros(fechaInicio, fechaFin, estado, usuarioId) {
    return await repository.getVentasPorCajero(
      fechaInicio,
      fechaFin,
      estado,
      usuarioId,
    );
  }

  async obtenerReporteInventario(
    fechaInicio,
    fechaFin,
    categoriaId,
    estadoStock,
    busqueda,
  ) {
    const productos = await repository.getReporteInventario(
      fechaInicio,
      fechaFin,
      categoriaId,
      estadoStock,
      busqueda,
    );

    const totalAgotados = productos.filter(
      (p) => p.EstadoStock === "AGOTADO",
    ).length;
    const totalBajos = productos.filter((p) => p.EstadoStock === "BAJO").length;
    const productoEstrella =
      productos.length > 0 && productos[0].Ventas > 0 ? productos[0] : null;

    return {
      productos,
      kpis: {
        totalAgotados,
        totalBajos,
        productoEstrella,
      },
    };
  }

  async obtenerReporteUtilidades(
    fechaInicio,
    fechaFin,
    nivelAnalisis,
    categoriaId,
    alertaRentabilidad,
    busqueda,
  ) {
    const datos = await repository.getReporteUtilidades(
      fechaInicio,
      fechaFin,
      nivelAnalisis,
      categoriaId,
      alertaRentabilidad,
      busqueda,
    );

    let totalIngresos = 0;
    let totalCostos = 0;
    let totalUtilidad = 0;

    datos.forEach((row) => {
      totalIngresos += row.IngresoTotal;
      totalCostos += row.CostoTotal;
      totalUtilidad += row.UtilidadNeta;
    });

    const margenGeneral =
      totalIngresos > 0 ? (totalUtilidad / totalIngresos) * 100 : 0;

    return {
      detalles: datos,
      kpis: {
        totalIngresos,
        totalCostos,
        totalUtilidad,
        margenGeneral,
      },
    };
  }

  async obtenerFlujoCajaDiario(fecha, usuarioId) {
    const datos = await repository.getFlujoCajaDiario(fecha, usuarioId);

    let totalEfectivoTienda = 0;
    let totalDigitalTienda = 0;
    let totalTarjetaTienda = 0;
    let totalTransferenciaTienda = 0;

    datos.forEach((row) => {
      totalEfectivoTienda += row.TotalEfectivo;
      totalDigitalTienda += row.TotalDigital;
      totalTarjetaTienda += row.TotalTarjeta;
      totalTransferenciaTienda += row.TotalTransferencia;
    });

    return {
      detalles: datos,
      kpis: {
        totalEfectivoTienda,
        totalDigitalTienda,
        totalTarjetaTienda,
        totalTransferenciaTienda,
        granTotal:
          totalEfectivoTienda +
          totalDigitalTienda +
          totalTarjetaTienda +
          totalTransferenciaTienda,
      },
    };
  }
}

module.exports = new ReporteService();
