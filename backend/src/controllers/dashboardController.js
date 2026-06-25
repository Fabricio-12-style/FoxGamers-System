const { getConnection, sql } = require("../config/db");

const getResumenKPIs = async (req, res) => {
  try {
    const pool = await getConnection();

    // 1. ESTADO GLOBAL DEL STOCK (Dona)
    const qStock = await pool.request().query(`
        SELECT 
            ISNULL(SUM(CASE WHEN StockActual > StockMinimo THEN 1 ELSE 0 END), 0) as Optimo,
            ISNULL(SUM(CASE WHEN StockActual <= StockMinimo AND StockActual > 0 THEN 1 ELSE 0 END), 0) as Bajo,
            ISNULL(SUM(CASE WHEN StockActual <= 0 THEN 1 ELSE 0 END), 0) as Agotado
        FROM Inventario WHERE Activo = 1
    `);
    const stockStats = qStock.recordset[0];

    // 2. LISTA DE ALERTAS (Agotados y Bajos)
    const qAlertas = await pool.request().query(`
        SELECT TOP 10 Nombre, Codigo, StockActual, StockMinimo 
        FROM Inventario 
        WHERE StockActual <= StockMinimo AND Activo = 1 
        ORDER BY StockActual ASC
    `);

    // 3. KPIs FINANCIEROS (Hoy vs Ayer y Mes)
    const qKpis = await pool.request().query(`
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
    const kpis = qKpis.recordset[0];

    // 4. TOP 5 PRODUCTOS (Barras)
    const qTopProd = await pool.request().query(`
        SELECT TOP 5 i.Nombre, ISNULL(SUM(dv.Cantidad), 0) as CantidadVentas
        FROM DetalleVenta dv
        JOIN Venta v ON dv.VentaID = v.VentaID
        JOIN Inventario i ON dv.ProductoID = i.ProductoID
        WHERE v.Estado = 'COMPLETADA'
        GROUP BY i.Nombre
        ORDER BY CantidadVentas DESC
    `);

    // 5. TOP 5 CLIENTES (Ranking)
    const qTopCli = await pool.request().query(`
        SELECT TOP 5 c.NombreRazonSocial as Nombre, ISNULL(SUM(v.Total), 0) as TotalComprado
        FROM Venta v
        JOIN Cliente c ON v.ClienteID = c.ClienteID
        WHERE v.Estado = 'COMPLETADA' AND v.ClienteID IS NOT NULL
        GROUP BY c.NombreRazonSocial
        ORDER BY TotalComprado DESC
    `);

    // 6. VENTAS DE LOS ÚLTIMOS 7 DÍAS (Línea)
    const q7Dias = await pool.request().query(`
        SELECT CAST(FechaVenta AS DATE) as Fecha, ISNULL(SUM(Total), 0) as Total
        FROM Venta
        WHERE FechaVenta >= DATEADD(day, -6, CAST(GETDATE() AS DATE)) AND Estado = 'COMPLETADA'
        GROUP BY CAST(FechaVenta AS DATE)
    `);

    // Procesar fechas de 7 días exactos en Node.js (Para evitar huecos si un día no se vendió)
    const ventas7DiasMap = {};
    q7Dias.recordset.forEach((row) => {
      const dStr = `${row.Fecha.getFullYear()}-${String(row.Fecha.getMonth() + 1).padStart(2, "0")}-${String(row.Fecha.getDate()).padStart(2, "0")}`;
      ventas7DiasMap[dStr] = row.Total;
    });

    const labels7Dias = [];
    const data7Dias = [];
    const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      labels7Dias.push(diasSemana[d.getDay()]);
      data7Dias.push(ventas7DiasMap[dStr] || 0); // Si no hay venta ese día, pone 0
    }

    // Calcular Porcentaje de Crecimiento vs Ayer
    let porcentajeCrecimiento = 0;
    if (kpis.GananciaAyer > 0) {
      porcentajeCrecimiento =
        ((kpis.GananciaHoy - kpis.GananciaAyer) / kpis.GananciaAyer) * 100;
    } else if (kpis.GananciaHoy > 0) {
      porcentajeCrecimiento = 100; // Si ayer fue 0 y hoy vendió, es 100% ganancia
    }

    // Respuesta Maestra JSON al Frontend
    res.json({
      success: true,
      data: {
        alertasStock: stockStats.Agotado, // Tarjeta roja principal
        listaAlertas: qAlertas.recordset,
        kpis: {
          hoy: kpis.GananciaHoy,
          mes: kpis.GananciaMes,
          crecimiento: porcentajeCrecimiento,
          ticketPromedio: kpis.TicketPromedio,
          transaccionesHoy: kpis.TransaccionesHoy,
          productosVendidosHoy: kpis.ProductosVendidosHoy,
        },
        graficos: {
          stock: [stockStats.Optimo, stockStats.Bajo, stockStats.Agotado],
          topProductos: {
            labels: qTopProd.recordset.map((p) => p.Nombre),
            data: qTopProd.recordset.map((p) => p.CantidadVentas),
          },
          topClientes: qTopCli.recordset,
          ventas7Dias: {
            labels: labels7Dias,
            data: data7Dias,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error cargando KPIs del Dashboard:", error);
    res.status(500).json({
      success: false,
      mensaje: "Error al cargar el resumen operativo",
    });
  }
};

module.exports = { getResumenKPIs };
