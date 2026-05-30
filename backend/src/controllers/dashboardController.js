const { getConnection } = require("../config/db");

const getResumenKPIs = async (req, res) => {
  try {
    const pool = await getConnection();

    // 1. Calcular Cantidad de Alertas de Stock
    const queryStock = await pool.request().query(`
            SELECT COUNT(*) as TotalAlertas 
            FROM Inventario 
            WHERE StockActual <= StockMinimo AND Activo = 1
        `);
    const totalAlertas = queryStock.recordset[0].TotalAlertas;

    // 2. Obtener la Lista exacta de Productos en Alerta
    const queryListaAlertas = await pool.request().query(`
        SELECT TOP 10 
            ModeloBase AS Modelo, 
            Atributo AS Presentacion, 
            StockActual, 
            StockMinimo 
        FROM Inventario
        WHERE StockActual <= StockMinimo AND Activo = 1
        ORDER BY StockActual ASC
    `);

    // 3. Ventas Diarias (Se mantendrá en 0 hasta que hagamos el módulo de ventas)
    const queryVentasHoy = await pool.request().query(`
            SELECT ISNULL(SUM(Total), 0) as GananciaHoy, COUNT(*) as CantidadVentas
            FROM Venta 
            WHERE CAST(FechaVenta as DATE) = CAST(GETDATE() as DATE) AND Estado = 'COMPLETADA'
        `);

    res.json({
      success: true,
      data: {
        alertasStock: totalAlertas,
        listaAlertas: queryListaAlertas.recordset, // Pasamos la lista al frontend
        gananciasDiarias: queryVentasHoy.recordset[0].GananciaHoy,
        productosVendidos: queryVentasHoy.recordset[0].CantidadVentas,
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
