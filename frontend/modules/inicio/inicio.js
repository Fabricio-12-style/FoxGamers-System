(() => {
  cargarDashboard();

  async function cargarDashboard() {
    try {
      const res = await fetch("http://localhost:3000/api/dashboard/resumen");
      const result = await res.json();

      if (result.success) {
        const data = result.data;

        // 1. ACTUALIZAR KPIs
        const kpiStock = document.getElementById("kpiAlertasStock");
        const iconAlertas = document.getElementById("iconAlertas");
        const cardAlertas = document.getElementById("cardAlertas");

        if (kpiStock) {
          kpiStock.textContent = data.alertasStock;

          if (data.alertasStock > 0) {
            kpiStock.classList.add("text-danger");
            kpiStock.classList.remove("text-warning");
            if (iconAlertas)
              iconAlertas.classList.replace("text-warning", "text-danger");
            if (cardAlertas) cardAlertas.style.borderLeftColor = "#dc3545";
          } else {
            kpiStock.classList.add("text-success");
            kpiStock.classList.remove("text-warning", "text-danger");
            if (iconAlertas)
              iconAlertas.classList.replace("text-warning", "text-success");
            if (cardAlertas) cardAlertas.style.borderLeftColor = "#28a745";
          }
        }

        //2. RENDERIZAR TABLA DE ALERTAS
        const tablaAlertas = document.getElementById("tablaAlertasDashboard");
        if (tablaAlertas) {
          tablaAlertas.innerHTML = "";

          if (data.listaAlertas.length === 0) {
            tablaAlertas.innerHTML =
              '<tr><td colspan="3" class="text-success py-4 font-weight-bold"><i class="fas fa-check-circle mr-2"></i>Stock saludable. No hay alertas críticas.</td></tr>';
          } else {
            data.listaAlertas.forEach((item) => {
              tablaAlertas.innerHTML += `
                                <tr>
                                    <td class="text-left pl-3 font-weight-bold text-dark" style="font-size: 0.9rem;">
                                        ${item.Modelo} <br>
                                        <small class="text-muted">${item.Presentacion}</small>
                                    </td>
                                    <td class="font-weight-bold text-danger" style="font-size: 1.1rem;">${item.StockActual}</td>
                                    <td class="text-muted">${item.StockMinimo}</td>
                                </tr>
                            `;
            });
          }
        }
      }
    } catch (error) {
      console.error("Error al renderizar Dashboard:", error);
      const tablaAlertas = document.getElementById("tablaAlertasDashboard");
      if (tablaAlertas)
        tablaAlertas.innerHTML =
          '<tr><td colspan="3" class="text-danger py-4">Error de conexión con el servidor.</td></tr>';
    }
  }
})();
