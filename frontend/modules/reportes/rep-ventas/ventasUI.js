import { obtenerReporteVentas } from "./ventasApi.js";
import {
  generarCabeceraPDF,
  estiloTablaCorporativa,
  convertirImagenABase64,
} from "../../../shared/utils/pdfHelper.js";

const txtFechaInicio = document.getElementById("txtFechaInicio");
const txtFechaFin = document.getElementById("txtFechaFin");
const cboEstado = document.getElementById("cboEstado");
const cboMetodoPago = document.getElementById("cboMetodoPago");
const txtBusquedaRapida = document.getElementById("txtBusquedaRapida");
const frmFiltros = document.getElementById("frmFiltrosVentas");
const cuerpoTabla = document.getElementById("cuerpoTablaVentas");
const zonaKPIs = document.getElementById("zonaKPIsVentas");
const btnExportarExcel = document.getElementById("btnExportarExcel");
const btnExportarPDF = document.getElementById("btnExportarPDF");

let dataActual = null;
let datosEmpresa = null;
let logoEmpresaBase64 = null;

const inicializarConfiguracion = async () => {
  const hoy = new Date();
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  txtFechaInicio.value = primerDia.toISOString().split("T")[0];
  txtFechaFin.value = hoy.toISOString().split("T")[0];

  try {
    const res = await fetch("http://localhost:3000/api/empresa", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("tokenFoxGamers")}`,
      },
    });
    if (res.ok) {
      datosEmpresa = await res.json();
      try {
        logoEmpresaBase64 = await convertirImagenABase64(
          "/shared/img/Fox-limpio.png",
        );
      } catch (e) {}
    }
  } catch (error) {}
};

const validarFechas = () => {
  const inicio = txtFechaInicio.value;
  const fin = txtFechaFin.value;

  if (!inicio || !fin) {
    Swal.fire("Atención", "Debe seleccionar ambas fechas.", "warning");
    return false;
  }

  if (new Date(inicio) > new Date(fin)) {
    Swal.fire(
      "Atención",
      "La fecha de inicio no puede ser mayor a la fecha de fin.",
      "warning",
    );
    return false;
  }
  return true;
};

const renderizarKPIs = (resumen) => {
  const total = resumen ? resumen.Total : 0;
  const transacciones = resumen ? resumen.CantidadTransacciones : 0;

  zonaKPIs.innerHTML = `
        <div class="col-md-6 mb-3">
            <div class="info-box shadow-sm" style="border-radius: 8px;">
                <span class="info-box-icon bg-success elevation-1"><i class="fas fa-coins"></i></span>
                <div class="info-box-content">
                    <span class="info-box-text font-weight-bold text-muted">Ingresos Totales (Filtro Actual)</span>
                    <span class="info-box-number" style="font-size: 1.5rem; color: #0f172a;">S/ ${parseFloat(total).toFixed(2)}</span>
                </div>
            </div>
        </div>
        <div class="col-md-6 mb-3">
            <div class="info-box shadow-sm" style="border-radius: 8px;">
                <span class="info-box-icon bg-info elevation-1"><i class="fas fa-receipt"></i></span>
                <div class="info-box-content">
                    <span class="info-box-text font-weight-bold text-muted">Transacciones Totales</span>
                    <span class="info-box-number" style="font-size: 1.5rem; color: #0f172a;">${transacciones}</span>
                </div>
            </div>
        </div>
    `;
};

const renderizarTabla = (ventas) => {
  cuerpoTabla.innerHTML = "";
  dataActual = ventas;

  if (!ventas || ventas.length === 0) {
    cuerpoTabla.innerHTML = `<tr><td colspan="7" class="text-muted py-4">No hay ventas que coincidan con los filtros.</td></tr>`;
    document.getElementById("txtTotalRegistros").textContent =
      "Total: 0 ventas";
    btnExportarExcel.disabled = true;
    btnExportarPDF.disabled = true;
    return;
  }

  ventas.forEach((v) => {
    const esMixto = v.MetodoResumen === "MIXTO";
    const badgeEstado =
      v.Estado === "COMPLETADA" ? "badge-success" : "badge-danger";
    const iconoToggle = esMixto
      ? `<i class="fas fa-chevron-right btn-toggle-detalle" data-id="${v.VentaID}"></i>`
      : "";

    let htmlPrincipal = `
            <tr class="main-row">
                <td class="align-middle">${iconoToggle}</td>
                <td class="align-middle font-weight-bold">N-${v.VentaID}</td>
                <td class="align-middle">${new Date(v.FechaCreacion).toLocaleDateString("es-PE")}</td>
                <td class="align-middle text-left">${v.Cliente}</td>
                <td class="align-middle"><span class="badge ${badgeEstado}">${v.Estado}</span></td>
                <td class="align-middle">${v.MetodoResumen}</td>
                <td class="align-middle font-weight-bold text-success">S/ ${parseFloat(v.Total).toFixed(2)}</td>
            </tr>
        `;

    let htmlDetalle = "";
    if (esMixto && v.Pagos) {
      htmlDetalle += `<tr class="tr-detalle d-none" id="detalle-${v.VentaID}"><td colspan="7"><div class="p-2">
                <table class="table table-sm table-borderless mb-0 w-50 mx-auto text-muted"><tbody>`;
      v.Pagos.forEach((p) => {
        htmlDetalle += `<tr><td class="text-right w-50">↳ ${p.Metodo}:</td><td class="text-left font-weight-bold">S/ ${parseFloat(p.MontoRecibido - (p.Vuelto || 0)).toFixed(2)}</td></tr>`;
      });
      htmlDetalle += `</tbody></table></div></td></tr>`;
    }

    cuerpoTabla.innerHTML += htmlPrincipal + htmlDetalle;
  });

  document.getElementById("txtTotalRegistros").textContent =
    `Total: ${ventas.length} ventas`;
  document.getElementById("txtUltimaConsulta").textContent =
    `Última consulta: ${new Date().toLocaleTimeString()}`;
  btnExportarExcel.disabled = false;
  btnExportarPDF.disabled = false;
};

const cargarReporte = async () => {
  if (!validarFechas()) return;

  Swal.fire({
    title: "Generando reporte...",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
  const res = await obtenerReporteVentas(
    txtFechaInicio.value,
    txtFechaFin.value,
    cboEstado.value,
    cboMetodoPago.value,
    txtBusquedaRapida.value,
  );
  Swal.close();

  if (res.success) {
    renderizarKPIs(res.resumen);
    renderizarTabla(res.ventas);
  } else {
    Swal.fire("Error", res.mensaje || "Error al obtener reporte", "error");
  }
};

frmFiltros.addEventListener("submit", (e) => {
  e.preventDefault();
  cargarReporte();
});

let timeoutBusqueda;
txtBusquedaRapida.addEventListener("input", () => {
  clearTimeout(timeoutBusqueda);
  timeoutBusqueda = setTimeout(() => {
    if (validarFechas()) cargarReporte();
  }, 800);
});

cuerpoTabla.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-toggle-detalle")) {
    const id = e.target.getAttribute("data-id");
    const filaDetalle = document.getElementById(`detalle-${id}`);
    if (filaDetalle) {
      filaDetalle.classList.toggle("d-none");
      e.target.classList.toggle("open");
    }
  }
});

btnExportarPDF.addEventListener("click", () => {
  if (!validarFechas()) return;
  if (!dataActual || dataActual.length === 0) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const rangoFechas = `${txtFechaInicio.value} al ${txtFechaFin.value}`;

  const startY = generarCabeceraPDF(
    doc,
    "Reporte Detallado de Ventas",
    rangoFechas,
    datosEmpresa,
    logoEmpresaBase64,
  );

  let bodyData = [];
  dataActual.forEach((v) => {
    bodyData.push([
      `N-${v.VentaID}`,
      new Date(v.FechaCreacion).toLocaleDateString("es-PE"),
      v.Cliente,
      v.Estado,
      v.MetodoResumen,
      `S/ ${parseFloat(v.Total).toFixed(2)}`,
    ]);

    if (v.MetodoResumen === "MIXTO" && v.Pagos) {
      v.Pagos.forEach((p) => {
        bodyData.push([
          { content: "", colSpan: 3 },
          {
            content: `↳ ${p.Metodo}`,
            styles: {
              fontStyle: "italic",
              halign: "right",
              textColor: [100, 116, 139],
            },
          },
          {
            content: `S/ ${parseFloat(p.MontoRecibido - (p.Vuelto || 0)).toFixed(2)}`,
            styles: {
              fontStyle: "italic",
              halign: "right",
              textColor: [100, 116, 139],
            },
          },
        ]);
      });
    }
  });

  doc.autoTable({
    startY: startY,
    head: [["N° Doc", "Fecha", "Cliente", "Estado", "Método(s)", "Total (S/)"]],
    body: bodyData,
    ...estiloTablaCorporativa,
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "left" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "right", fontStyle: "bold", textColor: [21, 128, 61] },
    },
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generado por Sistema Fox Gamers - Página ${i} de ${totalPages}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    );
  }
  doc.save(`Ventas_Detalladas_${txtFechaInicio.value}.pdf`);
});

btnExportarExcel.addEventListener("click", async () => {
  if (!validarFechas()) return;

  try {
    let url = `http://localhost:3000/api/reportes/exportar-excel?fechaInicio=${txtFechaInicio.value}&fechaFin=${txtFechaFin.value}`;
    if (cboEstado.value) url += `&estado=${cboEstado.value}`;
    if (cboMetodoPago.value) url += `&metodoPago=${cboMetodoPago.value}`;
    if (txtBusquedaRapida.value)
      url += `&busqueda=${encodeURIComponent(txtBusquedaRapida.value)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("tokenFoxGamers")}`,
      },
    });

    if (!res.ok) throw new Error("Error en el servidor");

    const arrayBuffer = await res.arrayBuffer();
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `Ventas_Detalladas_${txtFechaInicio.value}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    Swal.fire("Error", "Problema al generar Excel.", "error");
  }
});

document.addEventListener("DOMContentLoaded", inicializarConfiguracion);