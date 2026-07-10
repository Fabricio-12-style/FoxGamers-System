(() => {
  // =======================================================
  // 1. CONFIGURACIÓN GENERAL Y CONEXIONES DOM
  // =======================================================
  const BASE_URL = "http://localhost:3000";

  // Contenedores del DOM
  const cboTipoReporte = document.getElementById("cboTipoReporte");
  const zonaFiltros = document.getElementById("zonaFiltrosDinamicos");
  const estadoVacio = document.getElementById("estadoVacio");
  const contenedorReporte = document.getElementById("contenedorReporte");

  // Botones del Módulo
  const btnGenerar = document.getElementById("btnGenerarReporte");
  const btnPdf = document.getElementById("btnExportarPDF");
  const btnExcel = document.getElementById("btnExportarExcel");

  // Zonas de Inyección de Data
  const zonaKPIs = document.getElementById("zonaKPIs");
  const cabeceraTabla = document.getElementById("cabeceraTabla");
  const cuerpoTabla = document.getElementById("cuerpoTabla");
  const txtTotalRegistros = document.getElementById("txtTotalRegistros");
  const txtUltimaConsulta = document.getElementById("txtUltimaConsulta");

  // Persistencia Temporal en Memoria
  let datosReporteActual = null;
  let tipoReporteSeleccionado = null;

  // =======================================================
  // 2. LOGICA Y MUTACIÓN DE FILTROS DINÁMICOS
  // =======================================================
  cboTipoReporte.addEventListener("change", (e) => {
    tipoReporteSeleccionado = e.target.value;
    renderizarFiltros(tipoReporteSeleccionado);
    limpiarPantalla();
    btnGenerar.disabled = false;
    btnExcel.disabled = true;
    btnPdf.disabled = true;
  });

  function renderizarFiltros(tipo) {
    zonaFiltros.innerHTML = "";

    const hoy = new Date().toISOString().split("T")[0];
    const inicioMes = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    )
      .toISOString()
      .split("T")[0];

    const htmlRangoFechas = `
            <div class="w-50 pr-2">
                <label class="small font-weight-bold text-muted mb-1">Desde</label>
                <input type="date" id="filtroFechaInicio" class="form-control form-control-sm" value="${inicioMes}">
            </div>
            <div class="w-50 pl-2">
                <label class="small font-weight-bold text-muted mb-1">Hasta</label>
                <input type="date" id="filtroFechaFin" class="form-control form-control-sm" value="${hoy}">
            </div>
        `;

    const htmlFechaUnica = `
            <div class="w-100 pr-2">
                <label class="small font-weight-bold text-muted mb-1">Día de Operación</label>
                <input type="date" id="filtroFechaUnica" class="form-control form-control-sm" value="${hoy}">
            </div>
        `;

    const htmlCategoria = `
            <div class="w-100 pr-2">
                <label class="small font-weight-bold text-muted mb-1">Categoría</label>
                <select id="filtroCategoria" class="form-control form-control-sm">
                    <option value="ALL">Todas las categorías</option>
                </select>
            </div>
        `;

    const reportesConRango = [
      "ventas_periodo",
      "productos_top",
      "ventas_vendedor",
      "kardex_global",
      "totalizado_ventas",
    ];

    if (reportesConRango.includes(tipo)) {
      zonaFiltros.innerHTML = htmlRangoFechas;
    } else if (tipo === "cuadre_caja") {
      zonaFiltros.innerHTML = htmlFechaUnica;
    } else if (tipo === "inventario_actual") {
      zonaFiltros.innerHTML = htmlCategoria;
    } else if (tipo === "directorio_clientes") {
      zonaFiltros.innerHTML = `<div class="w-100 pt-4"><span class="small text-muted font-italic"><i class="fas fa-info-circle"></i> Catálogo sin restricciones de filtrado.</span></div>`;
    }
  }

  function extraerFiltros(tipo) {
    let filtros = {};
    const reportesConRango = [
      "ventas_periodo",
      "productos_top",
      "ventas_vendedor",
      "kardex_global",
      "totalizado_ventas",
    ];

    if (reportesConRango.includes(tipo)) {
      filtros.fechaInicio = document.getElementById("filtroFechaInicio").value;
      filtros.fechaFin = document.getElementById("filtroFechaFin").value;
    } else if (tipo === "cuadre_caja") {
      filtros.fechaUnica = document.getElementById("filtroFechaUnica").value;
    } else if (tipo === "inventario_actual") {
      filtros.categoria = document.getElementById("filtroCategoria").value;
    }
    return filtros;
  }

  function limpiarPantalla() {
    estadoVacio.classList.remove("d-none");
    contenedorReporte.classList.add("d-none");
    cabeceraTabla.innerHTML = "";
    cuerpoTabla.innerHTML = "";
    zonaKPIs.innerHTML = "";
    txtTotalRegistros.innerText = "Total: 0 registros";
    datosReporteActual = null;
  }

  // =======================================================
  // 3. PROCESAMIENTO Y DIBUJO DE INTERFAZ (JSON)
  // =======================================================
  btnGenerar.addEventListener("click", async () => {
    if (!tipoReporteSeleccionado) return;

    btnGenerar.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btnGenerar.disabled = true;

    const payload = {
      tipoReporte: tipoReporteSeleccionado,
      filtros: extraerFiltros(tipoReporteSeleccionado),
    };

    try {
      const res = await fetch(`${BASE_URL}/api/reportes/generar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (result.success) {
        datosReporteActual = result.data; // Almacenamos respuesta en memoria

        dibujarTabla(datosReporteActual.reporteTabla);
        dibujarKPIs(datosReporteActual.resumenKPIs);

        txtUltimaConsulta.innerText = `Actualizado: ${new Date().toLocaleTimeString()}`;

        estadoVacio.classList.add("d-none");
        contenedorReporte.classList.remove("d-none");
        btnExcel.disabled = false;
        btnPdf.disabled = false;
      } else {
        alert("Alerta: " + result.mensaje);
        limpiarPantalla();
      }
    } catch (error) {
      console.error("Error al consultar API:", error);
      alert("Error crítico al enlazar con el servidor central.");
    } finally {
      btnGenerar.innerHTML = '<i class="fas fa-search"></i> Consultar';
      btnGenerar.disabled = false;
    }
  });

  function dibujarTabla(tablaData) {
    let htmlCabecera = "<tr>";
    tablaData.columnas.forEach((col) => {
      htmlCabecera += `<th class="align-middle">${col}</th>`;
    });
    htmlCabecera += "</tr>";
    cabeceraTabla.innerHTML = htmlCabecera;

    let htmlCuerpo = "";
    if (tablaData.filas.length === 0) {
      htmlCuerpo = `<tr><td colspan="${tablaData.columnas.length}" class="py-4 text-muted font-italic">Sin datos registrados en el margen seleccionado.</td></tr>`;
    } else {
      tablaData.filas.forEach((fila) => {
        htmlCuerpo += "<tr>";
        fila.forEach((celda) => {
          const esNumeroFuerte =
            !isNaN(celda) && celda !== "" && Number(celda) % 1 !== 0;
          const valorVista = esNumeroFuerte
            ? `S/ ${parseFloat(celda).toFixed(2)}`
            : celda;
          const claseAlineacion = esNumeroFuerte
            ? "text-right pr-3 font-weight-bold"
            : "align-middle";

          htmlCuerpo += `<td class="${claseAlineacion}">${valorVista}</td>`;
        });
        htmlCuerpo += "</tr>";
      });
    }
    cuerpoTabla.innerHTML = htmlCuerpo;
    txtTotalRegistros.innerText = `Total: ${tablaData.filas.length} registros`;
  }

  function dibujarKPIs(kpis) {
    zonaKPIs.innerHTML = "";
    if (!kpis || kpis.length === 0) return;

    let html = "";
    kpis.forEach((kpi) => {
      const valor =
        kpi.formato === "MONEDA"
          ? `S/ ${parseFloat(kpi.value).toFixed(2)}`
          : kpi.value;
      html += `
                <div class="col px-2 mb-2">
                    <div class="p-2 rounded shadow-sm" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #3b82f6;">
                        <span class="d-block small text-muted font-weight-bold text-uppercase" style="font-size: 0.65rem;">${kpi.label}</span>
                        <span class="d-block font-weight-bold text-dark" style="font-size: 1.1rem;">${valor}</span>
                    </div>
                </div>
            `;
    });
    zonaKPIs.innerHTML = html;
  }

  // =======================================================
  // 4. MOTOR DE EXPORTACIÓN EXCEL (LLAMADO AL BACKEND)
  // =======================================================
  btnExcel.addEventListener("click", () => {
    if (!datosReporteActual || !tipoReporteSeleccionado) return;

    btnExcel.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btnExcel.disabled = true;

    const f = extraerFiltros(tipoReporteSeleccionado);
    let url = `${BASE_URL}/api/reportes/exportar-excel?tipoReporte=${tipoReporteSeleccionado}`;

    if (f.fechaInicio)
      url += `&fechaInicio=${f.fechaInicio}&fechaFin=${f.fechaFin}`;
    if (f.fechaUnica) url += `&fechaUnica=${f.fechaUnica}`;
    if (f.categoria) url += `&categoria=${f.categoria}`;

    window.location.href = url;

    setTimeout(() => {
      btnExcel.innerHTML = '<i class="far fa-file-excel"></i> Excel';
      btnExcel.disabled = false;
    }, 1500);
  });

  // =======================================================
  // 5. MOTOR DE EXPORTACIÓN PDF HORIZONTAL (FRONTEND)
  // =======================================================
  btnPdf.addEventListener("click", () => {
    if (!datosReporteActual) return;

    btnPdf.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btnPdf.disabled = true;

    setTimeout(() => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("landscape");

      // Estilos de Membrete Corporativo
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text("FOX GAMERS", 14, 20);

      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(datosReporteActual.metadata.titulo, 14, 27);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Filtros: ${datosReporteActual.metadata.filtrosAplicados}`,
        14,
        33,
      );
      doc.text(
        `Fecha Impresión: ${new Date().toLocaleString("es-PE")}`,
        14,
        38,
      );

      // Renderizado de tabla estructurada con autoTable
      doc.autoTable({
        startY: 43,
        head: [datosReporteActual.reporteTabla.columnas],
        body: datosReporteActual.reporteTabla.filas,
        theme: "grid",
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: 255,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          halign: "center",
          valign: "middle",
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: function (data) {
          if (data.section === "body") {
            const rawVal = data.cell.raw;
            const esMoneda =
              !isNaN(rawVal) && rawVal !== "" && Number(rawVal) % 1 !== 0;

            if (esMoneda) {
              data.cell.styles.halign = "right";
              data.cell.text = `S/ ${parseFloat(rawVal).toFixed(2)}`;
            } else if (!isNaN(rawVal) && rawVal !== "") {
              data.cell.styles.halign = "center";
            } else {
              data.cell.styles.halign = "left";
            }
          }
        },
      });

      doc.save(`FoxGamers_${tipoReporteSeleccionado}_${Date.now()}.pdf`);

      btnPdf.innerHTML = '<i class="far fa-file-pdf"></i> PDF';
      btnPdf.disabled = false;
    }, 400);
  });
})();