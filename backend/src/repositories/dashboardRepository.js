const { getConnection, sql } = require("../config/db");

class DashboardRepository {
  async obtenerDatosResumen() {
    const pool = await getConnection();

    const pStock = pool.request().query(`
            SELECT 
                ISNULL(SUM(CASE WHEN StockActual > StockMinimo THEN 1 ELSE 0 END), 0) as Optimo,
                ISNULL(SUM(CASE WHEN StockActual <= StockMinimo AND StockActual > 0 THEN 1 ELSE 0 END), 0) as Bajo,
                ISNULL(SUM(CASE WHEN StockActual <= 0 THEN 1 ELSE 0 END), 0) as Agotado
            FROM Inventario WHERE Activo = 1
        `);

    const pAlertas = pool.request().query(`
            SELECT TOP 10 Nombre, Codigo, StockActual, StockMinimo 
            FROM Inventario 
            WHERE StockActual <= StockMinimo AND Activo = 1 
            ORDER BY StockActual ASC
        `);

    const pKpis = pool.request().query(`
            DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);
            DECLARE @Ayer DATE = DATEADD(day, -1, @Hoy);
            DECLARE @InicioMes DATE = DATEADD(month, DATEDIFF(month, 0, @Hoy), 0);

            SELECT 
                (SELECT ISNULL(SUM(Total), 0) FROM Venta WHERE CAST(FechaVenta AS DATE) = @Hoy AND Estado = 'COMPLETADA') as GananciaHoy,
                (SELECT ISNULL(SUM(Total), 0) FROM Venta WHERE CAST(FechaVenta AS DATE) = @Ayer AND Estado = 'COMPLETADA') as GananciaAyer,
                (SELECT ISNULL(SUM(Total), 0) FROM Venta WHERE CAST(FechaVenta AS DATE) >= @InicioMes AND Estado = 'COMPLETADA') as GananciaMes,
                (SELECT ISNULL(AVG(Total), 0) FROM Venta WHERE CAST(FechaVenta AS DATE) >= @InicioMes AND Estado = 'COMPLETADA') as TicketPromedio,
                (SELECT COUNT(VentaID) FROM Venta WHERE CAST(FechaVenta AS DATE) = @Hoy AND Estado = 'COMPLETADA') as TransaccionesHoy,
                (SELECT ISNULL(SUM(dv.Cantidad), 0) FROM DetalleVenta dv JOIN Venta v ON dv.VentaID = v.VentaID WHERE CAST(v.FechaVenta AS DATE) = @Hoy AND v.Estado = 'COMPLETADA') as ProductosVendidosHoy
        `);

    const pTopProd = pool.request().query(`
            SELECT TOP 5 i.Nombre, ISNULL(SUM(dv.Cantidad), 0) as CantidadVentas
            FROM DetalleVenta dv
            JOIN Venta v ON dv.VentaID = v.VentaID
            JOIN Inventario i ON dv.ProductoID = i.ProductoID
            WHERE v.Estado = 'COMPLETADA'
            GROUP BY i.Nombre
            ORDER BY CantidadVentas DESC
        `);

    const pTopCli = pool.request().query(`
            SELECT TOP 5 c.NombreRazonSocial as Nombre, ISNULL(SUM(v.Total), 0) as TotalComprado
            FROM Venta v
            JOIN Cliente c ON v.ClienteID = c.ClienteID
            WHERE v.Estado = 'COMPLETADA' AND v.ClienteID IS NOT NULL
            GROUP BY c.NombreRazonSocial
            ORDER BY TotalComprado DESC
        `);

    const p7Dias = pool.request().query(`
            SELECT CONVERT(VARCHAR(10), FechaVenta, 120) as FechaStr, ISNULL(SUM(Total), 0) as Total
            FROM Venta
            WHERE FechaVenta >= DATEADD(day, -6, CAST(GETDATE() AS DATE)) AND Estado = 'COMPLETADA'
            GROUP BY CONVERT(VARCHAR(10), FechaVenta, 120)
        `);

    const [qStock, qAlertas, qKpis, qTopProd, qTopCli, q7Dias] =
      await Promise.all([pStock, pAlertas, pKpis, pTopProd, pTopCli, p7Dias]);

    return {
      stockStats: qStock.recordset[0],
      alertas: qAlertas.recordset,
      kpis: qKpis.recordset[0],
      topProd: qTopProd.recordset,
      topCli: qTopCli.recordset,
      ventas7Dias: q7Dias.recordset,
    };
  }
}
module.exports = new DashboardRepository();