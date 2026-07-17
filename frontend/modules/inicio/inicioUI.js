import { inicioApi } from "./inicioApi.js";
import { inicioState } from "./inicioState.js";

let chartLinea = null;
let chartDona = null;
let chartBarras = null;

const inicializarModulo = async () => {
  const usuarioInfo = localStorage.getItem("usuarioFoxGamers");
  if (!usuarioInfo) return; 

  inicioState.init(usuarioInfo);

  Chart.defaults.color = "#475569";
  Chart.defaults.font.family = "'Quicksand', sans-serif";
  Chart.defaults.plugins.tooltip.backgroundColor = "rgba(15, 23, 42, 0.9)";
  Chart.defaults.plugins.tooltip.titleColor = "#ffffff";
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;

  cargarCabeceraUI();
  await cargarDashboardReal();
};

const cargarCabeceraUI = () => {
  const lblUser = document.getElementById("dashNombreUsuario");
  if (lblUser) lblUser.textContent = inicioState.getUsuarioNombre();

  const opcionesFecha = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const fechaCapitalizada = new Date().toLocaleDateString(
    "es-PE",
    opcionesFecha,
  );

  const lblFecha = document.getElementById("dashFechaActual");
  if (lblFecha)
    lblFecha.textContent =
      fechaCapitalizada.charAt(0).toUpperCase() + fechaCapitalizada.slice(1);
};

const cargarDashboardReal = async () => {
  try {
    const result = await inicioApi.obtenerResumen();

    const lblGananciasHoy = document.getElementById("kpiGananciasHoy");
    if (!lblGananciasHoy) return;

    if (result.success) {
      const { kpis, graficos, alertasStock, listaAlertas } = result.data;

      lblGananciasHoy.textContent = `S/ ${kpis.hoy.toFixed(2)}`;
      document.getElementById("kpiGananciasMes").textContent =
        `S/ ${kpis.mes.toFixed(2)}`;
      document.getElementById("kpiTicketPromedio").textContent =
        `S/ ${kpis.ticketPromedio.toFixed(2)}`;
      document.getElementById("kpiProductosVendidos").textContent =
        kpis.productosVendidosHoy;
      document.getElementById("kpiCantVentas").textContent =
        kpis.transaccionesHoy;

      const labelCrecimiento = lblGananciasHoy.nextElementSibling;
      if (labelCrecimiento) {
        if (kpis.crecimiento >= 0) {
          labelCrecimiento.innerHTML = `<i class="fas fa-arrow-up"></i> ${kpis.crecimiento.toFixed(1)}% vs ayer`;
          labelCrecimiento.className = "text-success font-weight-bold";
        } else {
          labelCrecimiento.innerHTML = `<i class="fas fa-arrow-down"></i> ${kpis.crecimiento.toFixed(1)}% vs ayer`;
          labelCrecimiento.className = "text-danger font-weight-bold";
        }
      }

      const lblStock = document.getElementById("kpiAlertasStock");
      if (lblStock) {
        lblStock.textContent = alertasStock;
        if (alertasStock === 0) {
          lblStock.style.color = "var(--fox-green)";
          document.querySelector("#cardAlertas i").style.color =
            "var(--fox-green)";
        }
      }

      const tablaAlertas = document.getElementById("tablaAlertasDashboard");
      if (tablaAlertas) {
        tablaAlertas.innerHTML = "";
        if (!listaAlertas || listaAlertas.length === 0) {
          tablaAlertas.innerHTML =
            '<tr><td colspan="2" class="text-success py-4" style="font-size: 13px;"><i class="fas fa-check-circle mr-2"></i>Inventario sano</td></tr>';
        } else {
          listaAlertas.slice(0, 4).forEach((item) => {
            tablaAlertas.innerHTML += `
                        <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <td class="text-left pl-3 py-2 text-dark" style="font-size: 0.8rem;">
                                <strong>${item.Nombre || item.Modelo}</strong><br>
                                <small class="text-muted">Min: ${item.StockMinimo}</small>
                            </td>
                            <td class="font-weight-bold text-danger align-middle">
                                <span class="badge" style="background-color: rgba(239, 68, 68, 0.08); color: var(--fox-red); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 6px !important;">
                                    ${item.StockActual} und
                                </span>
                            </td>
                        </tr>`;
          });
        }
      }

      // Gráfico de Líneas
      const canvasLinea = document.getElementById("chartVentasLinea");
      if (canvasLinea) {
        const ctxLinea = canvasLinea.getContext("2d");
        let gradientCyan = ctxLinea.createLinearGradient(0, 0, 0, 300);
        gradientCyan.addColorStop(0, "rgba(0, 210, 255, 0.25)");
        gradientCyan.addColorStop(1, "rgba(0, 210, 255, 0.0)");

        if (chartLinea) chartLinea.destroy();
        chartLinea = new Chart(ctxLinea, {
          type: "line",
          data: {
            labels: graficos.ventas7Dias.labels,
            datasets: [
              {
                label: "Ventas (S/)",
                data: graficos.ventas7Dias.data,
                borderColor: "#00d2ff",
                backgroundColor: gradientCyan,
                borderWidth: 3,
                pointBackgroundColor: "#ffffff",
                pointBorderColor: "#00d2ff",
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: "rgba(0, 0, 0, 0.04)", drawBorder: false },
              },
              x: { grid: { display: false, drawBorder: false } },
            },
          },
        });
      }

      // Gráfico de Dona
      const canvasDona = document.getElementById("chartStockDona");
      if (canvasDona) {
        const ctxDona = canvasDona.getContext("2d");
        if (chartDona) chartDona.destroy();
        chartDona = new Chart(ctxDona, {
          type: "doughnut",
          data: {
            labels: ["Óptimo", "Bajo", "Agotados"],
            datasets: [
              {
                data: graficos.stock,
                backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
                borderWidth: 0,
                hoverOffset: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "75%",
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  usePointStyle: true,
                  padding: 15,
                  font: { size: 11 },
                },
              },
            },
          },
        });
      }

      // Gráfico de Barras
      const canvasBarras = document.getElementById("chartProductosTop");
      if (canvasBarras) {
        const ctxBarras = canvasBarras.getContext("2d");
        if (chartBarras) chartBarras.destroy();
        if (graficos.topProductos.labels.length === 0) {
          graficos.topProductos.labels = ["Sin datos"];
          graficos.topProductos.data = [0];
        }

        chartBarras = new Chart(ctxBarras, {
          type: "bar",
          data: {
            labels: graficos.topProductos.labels,
            datasets: [
              {
                label: "Unidades",
                data: graficos.topProductos.data,
                backgroundColor: "#ea580c",
                borderRadius: 6,
                barPercentage: 0.55,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: "rgba(0, 0, 0, 0.04)" } },
              y: { grid: { display: false } },
            },
          },
        });
      }

      // Lista Top Clientes
      const listaClientes = document.getElementById("listaTopClientes");
      if (listaClientes) {
        if (graficos.topClientes.length === 0) {
          listaClientes.innerHTML =
            '<li class="list-group-item bg-transparent text-muted px-0 text-center border-0" style="font-size: 13px;">No hay clientes frecuentes aún.</li>';
        } else {
          listaClientes.innerHTML = graficos.topClientes
            .map(
              (c, i) => `
                        <li class="list-group-item bg-transparent px-0 py-2 d-flex justify-content-between align-items-center" style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <div class="d-flex align-items-center">
                                <span class="badge ${i === 0 ? "badge-warning" : i === 1 ? "badge-secondary" : i === 2 ? "badge-danger" : "badge-dark"} mr-3" style="width: 25px; border-radius: 4px !important;">${i + 1}</span>
                                <span class="text-dark font-weight-bold" style="font-size: 0.8rem; text-transform: uppercase;">${c.Nombre}</span>
                            </div>
                            <span class="font-weight-bold" style="color: var(--fox-cyan); font-size: 0.85rem;">S/ ${c.TotalComprado.toFixed(2)}</span>
                        </li>`,
            )
            .join("");
        }
      }
    }
  } catch (error) {
    console.error("Error al cargar data real del Dashboard:", error);
  }
};

inicializarModulo();