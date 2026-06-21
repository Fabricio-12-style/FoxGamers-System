(() => {
  // =======================================================
  // 1. REFERENCIAS AL DOM Y VARIABLES GLOBALES
  // =======================================================
  const cboTipoReporte = document.getElementById("cboTipoReporte");
  const zonaFiltros = document.getElementById("zonaFiltrosDinamicos");

  const btnGenerar = document.getElementById("btnGenerarReporte");
  const btnPdf = document.getElementById("btnExportarPDF");
  const btnExcel = document.getElementById("btnExportarExcel");

  const estadoVacio = document.getElementById("estadoVacio");
  const contenedorReporte = document.getElementById("contenedorReporte");

  const BASE_URL = "http://localhost:3000";
  let datosReporteActual = null;

  // =======================================================
  // 2. MUTACIÓN Y RECOPILACIÓN DE FILTROS (UX)
  // =======================================================
  cboTipoReporte.addEventListener("change", (e) => {
    const reporteSeleccionado = e.target.value;
    renderizarFiltros(reporteSeleccionado);
    resetearLienzo();
    btnGenerar.disabled = false;
    btnPdf.disabled = true;
    btnExcel.disabled = true;
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

    const htmlFechas = `
            <div class="col-sm-6 mb-3 mb-md-0 px-2">
                <label class="small font-weight-bold text-uppercase text-muted">Desde</label>
                <input type="date" id="filtroFechaInicio" class="form-control" value="${inicioMes}">
            </div>
            <div class="col-sm-6 px-2">
                <label class="small font-weight-bold text-uppercase text-muted">Hasta</label>
                <input type="date" id="filtroFechaFin" class="form-control" value="${hoy}">
            </div>
        `;

    const htmlFechaUnica = `
            <div class="col-sm-6 px-2">
                <label class="small font-weight-bold text-uppercase text-muted">Día de Operación</label>
                <input type="date" id="filtroFechaUnica" class="form-control" value="${hoy}">
            </div>
        `;

    const htmlCategorias = `
            <div class="col-sm-6 px-2">
                <label class="small font-weight-bold text-uppercase text-muted">Categoría</label>
                <select id="filtroCategoria" class="form-control">
                    <option value="ALL">Todas las categorías</option>
                    </select>
            </div>
        `;

    if (
      [
        "ventas_periodo",
        "productos_top",
        "ventas_vendedor",
        "kardex_global",
      ].includes(tipo)
    ) {
      zonaFiltros.innerHTML = htmlFechas;
    } else if (tipo === "cuadre_caja") {
      zonaFiltros.innerHTML = htmlFechaUnica;
    } else if (tipo === "inventario_actual") {
      zonaFiltros.innerHTML = htmlCategorias;
    } else if (tipo === "directorio_clientes") {
      // No necesita filtros, muestra todos los activos
      zonaFiltros.innerHTML = `<div class="col-12 px-2"><p class="text-muted small m-0 mt-2"><i class="fas fa-info-circle"></i> Este reporte incluye toda la base de datos de clientes activos.</p></div>`;
    }
  }

  function recopilarFiltros(tipo) {
    let filtros = {};
    if (
      [
        "ventas_periodo",
        "productos_top",
        "ventas_vendedor",
        "kardex_global",
      ].includes(tipo)
    ) {
      filtros.fechaInicio = document.getElementById("filtroFechaInicio").value;
      filtros.fechaFin = document.getElementById("filtroFechaFin").value;
    } else if (tipo === "cuadre_caja") {
      filtros.fechaUnica = document.getElementById("filtroFechaUnica").value;
    } else if (tipo === "inventario_actual") {
      filtros.categoria = document.getElementById("filtroCategoria").value;
    }
    return filtros;
  }

  function resetearLienzo() {
    estadoVacio.classList.remove("d-none");
    contenedorReporte.classList.add("d-none");
    document.getElementById("zonaKPIs").innerHTML = "";
    document.getElementById("zonaTabla").innerHTML = "";
    datosReporteActual = null;
  }

  // =======================================================
  // 3. GENERAR REPORTE (CONEXIÓN AL BACKEND)
  // =======================================================
  btnGenerar.addEventListener("click", async () => {
    const tipo = cboTipoReporte.value;
    if (!tipo) return;

    btnGenerar.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-1"></i> Cargando...';
    btnGenerar.disabled = true;

    const payload = {
      tipoReporte: tipo,
      filtros: recopilarFiltros(tipo),
    };

    try {
      const res = await fetch(`${BASE_URL}/api/reportes/generar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (result.success) {
        datosReporteActual = result.data; // Guardamos en memoria
        dibujarReporte(datosReporteActual);

        estadoVacio.classList.add("d-none");
        contenedorReporte.classList.remove("d-none");
        btnPdf.disabled = false;
        btnExcel.disabled = false;
      } else {
        Swal.fire("Atención", result.mensaje, "warning");
        resetearLienzo();
      }
    } catch (error) {
      Swal.fire(
        "Error Crítico",
        "No se pudo conectar con el servidor de reportes.",
        "error",
      );
      resetearLienzo();
    } finally {
      btnGenerar.innerHTML = '<i class="fas fa-search mr-1"></i> Generar';
      btnGenerar.disabled = false;
    }
  });

  // =======================================================
  // 4. DIBUJAR EN EL LIENZO (UI)
  // =======================================================
  function dibujarReporte(data) {
    // A. Dibujar Tarjetas KPI
    const zonaKPIs = document.getElementById("zonaKPIs");
    let htmlKPIs = "";
    data.resumenKPIs.forEach((kpi) => {
      const valorFormateado =
        kpi.formato === "MONEDA"
          ? `S/ ${parseFloat(kpi.value).toFixed(2)}`
          : kpi.value;

      htmlKPIs += `
                <div class="col-md-4 mb-3">
                    <div class="card shadow-sm border-0 bg-white" style="border-left: 4px solid #0ea5e9; border-radius: 8px;">
                        <div class="card-body py-3">
                            <p class="text-uppercase text-muted font-weight-bold small mb-1">${kpi.label}</p>
                            <h3 class="m-0 font-weight-bold" style="color: #0f172a;">${valorFormateado}</h3>
                        </div>
                    </div>
                </div>
            `;
    });
    zonaKPIs.innerHTML = htmlKPIs;

    // B. Dibujar Tabla HTML
    const zonaTabla = document.getElementById("zonaTabla");
    let htmlTabla = `
            <table class="table table-hover table-bordered bg-white shadow-sm" style="border-radius: 8px; overflow: hidden;">
                <thead style="background-color: #0f172a; color: white;">
                    <tr>
                        ${data.reporteTabla.columnas.map((col) => `<th>${col}</th>`).join("")}
                    </tr>
                </thead>
                <tbody>
        `;

    if (data.reporteTabla.filas.length === 0) {
      htmlTabla += `<tr><td colspan="${data.reporteTabla.columnas.length}" class="text-center py-4 text-muted">No se encontraron datos en este período.</td></tr>`;
    } else {
      data.reporteTabla.filas.forEach((fila) => {
        htmlTabla += "<tr>";
        fila.forEach((celda, index) => {
          // Si es la última columna (Total), formateamos como moneda para la vista
          const esUltima = index === fila.length - 1;
          const valorVista =
            esUltima && !isNaN(celda)
              ? `S/ ${parseFloat(celda).toFixed(2)}`
              : celda;
          htmlTabla += `<td ${esUltima ? 'class="font-weight-bold text-right"' : ""}>${valorVista}</td>`;
        });
        htmlTabla += "</tr>";
      });
    }

    htmlTabla += "</tbody></table>";
    zonaTabla.innerHTML = htmlTabla;
  }

  // =======================================================
  // 5. MOTORES DE EXPORTACIÓN (EXCEL Y PDF)
  // =======================================================

  // EXPORTAR A EXCEL
  btnExcel.addEventListener("click", () => {
    if (!datosReporteActual) return;

    // 1. Unimos las columnas y las filas en un solo arreglo bidimensional
    const datosExcel = [
      datosReporteActual.reporteTabla.columnas,
      ...datosReporteActual.reporteTabla.filas,
    ];

    // 2. Creamos el libro y la hoja con SheetJS
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(datosExcel);

    // 3. Agregamos la hoja al libro y descargamos
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    XLSX.writeFile(
      workbook,
      `${datosReporteActual.metadata.reporteTipo}_${Date.now()}.xlsx`,
    );
  });

  // EXPORTAR A PDF
  btnPdf.addEventListener("click", () => {
    if (!datosReporteActual) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(); // Orientación vertical por defecto

    // Cabecera formal del PDF
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // Color oscuro
    doc.text("FOX GAMERS", 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(datosReporteActual.metadata.titulo, 14, 28);

    doc.setFontSize(9);
    doc.text(datosReporteActual.metadata.filtrosAplicados, 14, 34);
    doc.text(
      `Generado: ${datosReporteActual.metadata.fechaGeneracion}`,
      14,
      39,
    );

    // Generamos la tabla usando AutoTable
    doc.autoTable({
      startY: 45,
      head: [datosReporteActual.reporteTabla.columnas],
      body: datosReporteActual.reporteTabla.filas,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42] }, // Cabecera oscura
      styles: { fontSize: 8 },
      didParseCell: function (data) {
        // Alineamos los números a la derecha (asumiendo que la última columna son totales)
        if (
          data.column.index ===
            datosReporteActual.reporteTabla.columnas.length - 1 &&
          data.section === "body"
        ) {
          data.cell.styles.halign = "right";
          // Le agregamos el "S/" al PDF
          if (!isNaN(data.cell.raw))
            data.cell.text = `S/ ${parseFloat(data.cell.raw).toFixed(2)}`;
        }
      },
    });

    doc.save(`${datosReporteActual.metadata.reporteTipo}_${Date.now()}.pdf`);
  });
})();
