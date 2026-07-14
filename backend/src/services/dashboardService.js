const repository = require("../repositories/dashboardRepository");

class DashboardService {
  async compilarResumen() {
    const data = await repository.obtenerDatosResumen();
    const kpis = data.kpis;

    const ventas7DiasMap = {};
    data.ventas7Dias.forEach((row) => {
      ventas7DiasMap[row.FechaStr] = row.Total;
    });

    const labels7Dias = [];
    const data7Dias = [];
    const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split("T")[0];
      labels7Dias.push(diasSemana[d.getDay()]);
      data7Dias.push(ventas7DiasMap[dStr] || 0);
    }

    let porcentajeCrecimiento = 0;
    if (kpis.GananciaAyer > 0)
      porcentajeCrecimiento =
        ((kpis.GananciaHoy - kpis.GananciaAyer) / kpis.GananciaAyer) * 100;
    else if (kpis.GananciaHoy > 0) porcentajeCrecimiento = 100;

    return {
      alertasStock: data.stockStats.Agotado,
      listaAlertas: data.alertas,
      kpis: {
        hoy: kpis.GananciaHoy,
        mes: kpis.GananciaMes,
        crecimiento: porcentajeCrecimiento,
        ticketPromedio: kpis.TicketPromedio,
        transaccionesHoy: kpis.TransaccionesHoy,
        productosVendidosHoy: kpis.ProductosVendidosHoy,
      },
      graficos: {
        stock: [
          data.stockStats.Optimo,
          data.stockStats.Bajo,
          data.stockStats.Agotado,
        ],
        topProductos: {
          labels: data.topProd.map((p) => p.Nombre),
          data: data.topProd.map((p) => p.CantidadVentas),
        },
        topClientes: data.topCli,
        ventas7Dias: { labels: labels7Dias, data: data7Dias },
      },
    };
  }
}
module.exports = new DashboardService();