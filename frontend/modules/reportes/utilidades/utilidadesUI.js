import { obtenerReporteUtilidades } from "./utilidadesApi.js";
import {
  generarCabeceraPDF,
  estiloTablaCorporativa,
  convertirImagenABase64,
} from "../../../shared/utils/pdfHelper.js";

const txtFechaInicio = document.getElementById("txtFechaInicioUtil");
const txtFechaFin = document.getElementById("txtFechaFinUtil");
const cboNivelAnalisis = document.getElementById("cboNivelAnalisis");
const cboCategoria = document.getElementById("cboCategoriaUtil");
const cboRentabilidad = document.getElementById("cboRentabilidad");
const txtBusqueda = document.getElementById("txtBusquedaUtil");
const frmFiltros = document.getElementById("frmFiltrosUtilidades");
const cuerpoTabla = document.getElementById("cuerpoTablaUtilidades");
const listaMobile = document.getElementById("listaMobileUtilidades");
const zonaKPIs = document.getElementById("zonaKPIsUtilidades");
const btnExportarExcel = document.getElementById("btnExportarExcelUtil");
const btnExportarPDF = document.getElementById("btnExportarPDFUtil");

let dataActual = null;
let kpisActuales = null;
let datosEmpresa = null;
let logoEmpresaBase64 = null;

const inicializarConfiguracion = async () => {
  const hoy = new Date();
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  txtFechaInicio.value = primerDia.toISOString().split("T")[0];
  txtFechaFin.value = hoy.toISOString().split("T")[0];

  try {
    const resEmpresa = await fetch("http://localhost:3000/api/empresa", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("tokenFoxGamers")}`,
      },
    });
    if (resEmpresa.ok) {
      datosEmpresa = await resEmpresa.json();
      try {
        logoEmpresaBase64 = await convertirImagenABase64(
          "/shared/img/Fox-limpio.png",
        );
      } catch (e) {}
    }

    const resCat = await fetch("http://localhost:3000/api/categorias", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("tokenFoxGamers")}`,
      },
    });
    if (resCat.ok) {
      const categorias = await resCat.json();
      categorias.forEach((c) => {
        cboCategoria.innerHTML += `<option value="${c.CategoriaID}">${c.Nombre}</option>`;
      });
    }
  } catch (error) {}
};

const validarFechas = () => {
  const inicio = txtFechaInicio.value;
  const fin = txtFechaFin.value;
  if (!inicio || !fin) {
    Swal.fire("Atención", "Seleccione ambas fechas.", "warning");
    return false;
  }
  if (new Date(inicio) > new Date(fin)) {
    Swal.fire("Atención", "Fecha inicio inválida.", "warning");
    return false;
  }
  return true;
};

// Controlar visualmente la columna Categoría según el Nivel de Análisis
cboNivelAnalisis.addEventListener("change", () => {
  const esCategoria = cboNivelAnalisis.value === "CATEGORIA";
  document.getElementById("thConcepto").textContent = esCategoria
    ? "Categoría"
    : "Producto";
  document
    .querySelectorAll(".col-categoria")
    .forEach((el) => (el.style.display = esCategoria ? "none" : "table-cell"));
});

const renderizarKPIs = (kpis) => {
  const colorUtilidad = kpis.totalUtilidad >= 0 ? "#059669" : "#dc2626";

  zonaKPIs.innerHTML = `
        <div class="col px-2 mb-3">
            <div class="info-box shadow-sm border-0" style="border-radius: 8px; background-color: #0284c7; color: white;">
                <span class="info-box-icon elevation-1" style="background: rgba(255,255,255,0.2);"><i class="fas fa-hand-holding-usd"></i></span>
                <div class="info-box-content">
                    <span class="info-box-text font-weight-bold">Ingreso Bruto</span>
                    <span class="info-box-number" style="font-size: 1.3rem;">S/ ${parseFloat(kpis.totalIngresos).toFixed(2)}</span>
                </div>
            </div>
        </div>
        <div class="col px-2 mb-3">
            <div class="info-box shadow-sm border-0" style="border-radius: 8px; background-color: #dc2626; color: white;">
                <span class="info-box-icon elevation-1" style="background: rgba(255,255,255,0.2);"><i class="fas fa-shopping-cart"></i></span>
                <div class="info-box-content">
                    <span class="info-box-text font-weight-bold">Costo Total</span>
                    <span class="info-box-number" style="font-size: 1.3rem;">S/ ${parseFloat(kpis.totalCostos).toFixed(2)}</span>
                </div>
            </div>
        </div>
        <div class="col px-2 mb-3">
            <div class="info-box shadow-sm border-0" style="border-radius: 8px; background-color: ${colorUtilidad}; color: white;">
                <span class="info-box-icon elevation-1" style="background: rgba(255,255,255,0.2);"><i class="fas fa-chart-line"></i></span>
                <div class="info-box-content">
                    <span class="info-box-text font-weight-bold">Utilidad Neta (Ganancia)</span>
                    <span class="info-box-number" style="font-size: 1.3rem;">S/ ${parseFloat(kpis.totalUtilidad).toFixed(2)}</span>
                </div>
            </div>
        </div>
        <div class="col px-2 mb-3">
            <div class="info-box shadow-sm border-0" style="border-radius: 8px; background-color: #7c3aed; color: white;">
                <span class="info-box-icon elevation-1" style="background: rgba(255,255,255,0.2);"><i class="fas fa-percent"></i></span>
                <div class="info-box-content">
                    <span class="info-box-text font-weight-bold">Margen Promedio</span>
                    <span class="info-box-number" style="font-size: 1.3rem;">${parseFloat(kpis.margenGeneral).toFixed(2)}%</span>
                </div>
            </div>
        </div>
    `;
};

const renderizarTabla = (detalles) => {
  cuerpoTabla.innerHTML = "";
  listaMobile.innerHTML = "";
  dataActual = detalles;

  if (!detalles || detalles.length === 0) {
    cuerpoTabla.innerHTML = `<tr><td colspan="7" class="text-muted py-4">No se encontraron datos para estos filtros.</td></tr>`;
    listaMobile.innerHTML = `<div class="text-muted py-4 text-center">No se encontraron datos para estos filtros.</div>`;
    btnExportarExcel.disabled = true;
    btnExportarPDF.disabled = true;
    return;
  }

  const esCategoria = cboNivelAnalisis.value === "CATEGORIA";

  detalles.forEach((row) => {
    const colorUtilidad = row.UtilidadNeta < 0 ? "text-danger" : "text-success";
    const margen = parseFloat(row.MargenPorcentaje);
    let badgeMargen = "badge-secondary";

    if (margen >= 30) badgeMargen = "badge-success";
    else if (margen > 0 && margen < 10) badgeMargen = "badge-warning";
    else if (margen <= 0) badgeMargen = "badge-danger";

    let html = `<tr>
            <td class="align-middle text-left font-weight-bold">${row.Concepto}</td>`;

    if (!esCategoria)
      html += `<td class="align-middle col-categoria text-left">${row.Categoria}</td>`;

    html += `
            <td class="align-middle">${row.UnidadesVendidas}</td>
            <td class="align-middle">S/ ${parseFloat(row.IngresoTotal).toFixed(2)}</td>
            <td class="align-middle text-muted">S/ ${parseFloat(row.CostoTotal).toFixed(2)}</td>
            <td class="align-middle font-weight-bold ${colorUtilidad}">S/ ${parseFloat(row.UtilidadNeta).toFixed(2)}</td>
            <td class="align-middle"><span class="badge ${badgeMargen} p-1" style="font-size:0.8rem;">${margen.toFixed(1)}%</span></td>
        </tr>`;

    cuerpoTabla.innerHTML += html;

    listaMobile.innerHTML += `
            <div class="card border-0 shadow-sm mb-2" style="border-radius: 10px;">
                <div class="card-body p-3">
                    <div class="font-weight-bold text-dark mb-2">${row.Concepto}</div>
                    ${!esCategoria ? `<div class="small text-muted">Categoría</div><div class="font-weight-bold">${row.Categoria}</div>` : ""}
                    <div class="small text-muted mt-2">Unds / Utilidad</div>
                    <div class="font-weight-bold text-primary">${row.UnidadesVendidas} unds · S/ ${parseFloat(row.UtilidadNeta).toFixed(2)}</div>
                    <div class="small text-muted mt-2">Margen</div>
                    <div class="font-weight-bold">${margen.toFixed(1)}%</div>
                </div>
            </div>`;
  });

  document.getElementById("txtTotalUtil").textContent =
    `Total: ${detalles.length} registros`;
  document.getElementById("txtUltimaConsultaUtil").textContent =
    `Última consulta: ${new Date().toLocaleTimeString()}`;
  btnExportarExcel.disabled = false;
  btnExportarPDF.disabled = false;
};

const cargarReporte = async () => {
  if (!validarFechas()) return;
  Swal.fire({
    title: "Analizando Rentabilidad...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  const res = await obtenerReporteUtilidades(
    txtFechaInicio.value,
    txtFechaFin.value,
    cboNivelAnalisis.value,
    cboCategoria.value,
    cboRentabilidad.value,
    txtBusqueda.value,
  );
  Swal.close();

  if (res.success) {
    kpisActuales = res.kpis;
    renderizarKPIs(res.kpis);
    renderizarTabla(res.detalles);
  } else {
    Swal.fire("Error", res.mensaje || "Error al obtener reporte", "error");
  }
};

frmFiltros.addEventListener("submit", (e) => {
  e.preventDefault();
  cargarReporte();
});

let timeoutBusqueda;
txtBusqueda.addEventListener("input", () => {
  clearTimeout(timeoutBusqueda);
  timeoutBusqueda = setTimeout(() => {
    if (validarFechas()) cargarReporte();
  }, 800);
});

btnExportarPDF.addEventListener("click", () => {
  if (!validarFechas() || !dataActual) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const rangoFechas = `${txtFechaInicio.value} al ${txtFechaFin.value}`;
  const esCategoria = cboNivelAnalisis.value === "CATEGORIA";

  const startY = generarCabeceraPDF(
    doc,
    `Rentabilidad por ${esCategoria ? "Categoría" : "Producto"}`,
    rangoFechas,
    datosEmpresa,
    logoEmpresaBase64,
  );

  let headData = esCategoria
    ? [["Categoría", "Unds", "Ingreso", "Costo", "Utilidad", "Margen"]]
    : [
        [
          "Producto",
          "Categoría",
          "Unds",
          "Ingreso",
          "Costo",
          "Utilidad",
          "Margen",
        ],
      ];

  const bodyData = dataActual.map((r) => {
    const row = [r.Concepto];
    if (!esCategoria) row.push(r.Categoria);
    row.push(
      r.UnidadesVendidas,
      `S/ ${parseFloat(r.IngresoTotal).toFixed(2)}`,
      `S/ ${parseFloat(r.CostoTotal).toFixed(2)}`,
      `S/ ${parseFloat(r.UtilidadNeta).toFixed(2)}`,
      `${parseFloat(r.MargenPorcentaje).toFixed(2)}%`,
    );
    return row;
  });

  if (kpisActuales) {
    const padding = esCategoria ? 1 : 2;
    const totalRow = [];
    for (let i = 0; i < padding; i++)
      totalRow.push(i === 0 ? "TOTAL PERIODO" : "");
    totalRow.push(
      "",
      `S/ ${parseFloat(kpisActuales.totalIngresos).toFixed(2)}`,
      `S/ ${parseFloat(kpisActuales.totalCostos).toFixed(2)}`,
      `S/ ${parseFloat(kpisActuales.totalUtilidad).toFixed(2)}`,
      `${parseFloat(kpisActuales.margenGeneral).toFixed(2)}%`,
    );
    bodyData.push(totalRow);
  }

  const columnStylesConfig = esCategoria
    ? {
        0: { halign: "left" },
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right", fontStyle: "bold" },
        5: { halign: "right", fontStyle: "bold" },
      }
    : {
        0: { halign: "left" },
        1: { halign: "left" },
        2: { halign: "center" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right", fontStyle: "bold" },
        6: { halign: "right", fontStyle: "bold" },
      };

  doc.autoTable({
    startY: startY,
    head: headData,
    body: bodyData,
    ...estiloTablaCorporativa,
    columnStyles: columnStylesConfig,
    didParseCell: function (data) {
      if (
        data.section === "body" &&
        data.row.index === data.table.body.length - 1 &&
        kpisActuales
      ) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Sistema Fox Gamers - Página ${i} de ${totalPages}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    );
  }
  doc.save(`Rentabilidad_${txtFechaInicio.value}.pdf`);
});

btnExportarExcel.addEventListener("click", async () => {
  if (!validarFechas()) return;
  const originalHTML = btnExportarExcel.innerHTML;
  btnExportarExcel.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btnExportarExcel.disabled = true;

  try {
    let url = `http://localhost:3000/api/reportes/exportar-utilidades-excel?fechaInicio=${txtFechaInicio.value}&fechaFin=${txtFechaFin.value}&nivelAnalisis=${cboNivelAnalisis.value}`;
    if (cboCategoria.value) url += `&categoriaId=${cboCategoria.value}`;
    if (cboRentabilidad.value)
      url += `&alertaRentabilidad=${cboRentabilidad.value}`;
    if (txtBusqueda.value)
      url += `&busqueda=${encodeURIComponent(txtBusqueda.value)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("tokenFoxGamers")}`,
      },
    });
    if (!res.ok) throw new Error("Error generando Excel.");

    const arrayBuffer = await res.arrayBuffer();
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = window.URL.createObjectURL(blob);
    a.download = `Rentabilidad_${txtFechaInicio.value}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    Swal.fire("Error", e.message, "error");
  } finally {
    btnExportarExcel.innerHTML = originalHTML;
    btnExportarExcel.disabled = false;
  }
});

document.addEventListener("DOMContentLoaded", inicializarConfiguracion);
