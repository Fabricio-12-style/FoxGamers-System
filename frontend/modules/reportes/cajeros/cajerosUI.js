import { obtenerReporteCajeros } from "./cajerosApi.js";
import {
  generarCabeceraPDF,
  estiloTablaCorporativa,
  convertirImagenABase64,
} from "../../../shared/utils/pdfHelper.js";

const txtFechaInicio = document.getElementById("txtFechaInicioCajeros");
const txtFechaFin = document.getElementById("txtFechaFinCajeros");
const cboEstado = document.getElementById("cboEstadoCajeros");
const cboCajero = document.getElementById("cboCajero");
const frmFiltros = document.getElementById("frmFiltrosCajeros");
const cuerpoTabla = document.getElementById("cuerpoTablaCajeros");
const listaMobile = document.getElementById("listaMobileCajeros");
const zonaKPI = document.getElementById("zonaKPICajeros");
const btnExportarExcel = document.getElementById("btnExportarExcelCajeros");
const btnExportarPDF = document.getElementById("btnExportarPDFCajeros");

let dataActual = null;
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

    const resUsuarios = await fetch("http://localhost:3000/api/usuarios", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("tokenFoxGamers")}`,
      },
    });
    if (resUsuarios.ok) {
      const usuarios = await resUsuarios.json();
      usuarios.forEach((u) => {
        cboCajero.innerHTML += `<option value="${u.UsuarioID}">${u.NombreCompleto}</option>`;
      });
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

const renderizarKPI = (cajeros) => {
  if (!cajeros || cajeros.length === 0) {
    zonaKPI.innerHTML = "";
    return;
  }

  const mejor = cajeros[0];
  const esIndividual = cboCajero.value !== "TODOS";

  const tituloKPI = esIndividual
    ? "Resumen del Vendedor"
    : "Vendedor Estrella del Periodo";
  const bgClass = esIndividual ? "bg-info" : "bg-warning";
  const icono = esIndividual ? "fa-user-check" : "fa-trophy";

  zonaKPI.innerHTML = `
        <div class="col-12 mb-3">
            <div class="info-box shadow-sm ${bgClass}" style="border-radius: 8px;">
                <span class="info-box-icon elevation-1" style="background: rgba(255,255,255,0.2);"><i class="fas ${icono} text-white"></i></span>
                <div class="info-box-content text-white">
                    <span class="info-box-text font-weight-bold">${tituloKPI}</span>
                    <span class="info-box-number" style="font-size: 1.5rem;">
                        ${mejor.Nombre} - S/ ${parseFloat(mejor.TotalVendido).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    `;
};

const renderizarTabla = (cajeros) => {
  cuerpoTabla.innerHTML = "";
  listaMobile.innerHTML = "";
  dataActual = cajeros;

  if (!cajeros || cajeros.length === 0) {
    cuerpoTabla.innerHTML = `<tr><td colspan="5" class="text-muted py-4">Sin datos registrados con estos filtros.</td></tr>`;
    listaMobile.innerHTML = `<div class="text-muted py-4 text-center">Sin datos registrados con estos filtros.</div>`;
    btnExportarExcel.disabled = true;
    btnExportarPDF.disabled = true;
    document.getElementById("txtTotalCajeros").textContent =
      "Total: 0 evaluados";
    return;
  }

  const esIndividual = cboCajero.value !== "TODOS";

  cajeros.forEach((c, index) => {
    let medalla = esIndividual
      ? "-"
      : index === 0
        ? "🥇"
        : index === 1
          ? "🥈"
          : index === 2
            ? "🥉"
            : `${index + 1}`;
    cuerpoTabla.innerHTML += `
            <tr>
                <td class="font-weight-bold h5 align-middle">${medalla}</td>
                <td class="font-weight-bold align-middle">${c.Nombre}</td>
                <td class="align-middle">${c.Transacciones}</td>
                <td class="font-weight-bold text-success align-middle">S/ ${parseFloat(c.TotalVendido).toFixed(2)}</td>
                <td class="font-weight-bold text-info align-middle">S/ ${parseFloat(c.TicketPromedio).toFixed(2)}</td>
            </tr>`;

    listaMobile.innerHTML += `
            <div class="card border-0 shadow-sm mb-2" style="border-radius: 10px;">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="font-weight-bold text-dark">${medalla} · ${c.Nombre}</div>
                        <span class="badge badge-info">${c.Transacciones} tx</span>
                    </div>
                    <div class="small text-muted">Monto generado</div>
                    <div class="font-weight-bold text-success">S/ ${parseFloat(c.TotalVendido).toFixed(2)}</div>
                    <div class="small text-muted mt-2">Ticket promedio</div>
                    <div class="font-weight-bold text-info">S/ ${parseFloat(c.TicketPromedio).toFixed(2)}</div>
                </div>
            </div>`;
  });

  btnExportarExcel.disabled = false;
  btnExportarPDF.disabled = false;
  document.getElementById("txtTotalCajeros").textContent =
    `Total: ${cajeros.length} evaluado(s)`;
  document.getElementById("txtUltimaConsultaCajeros").textContent =
    `Última consulta: ${new Date().toLocaleTimeString()}`;
};

frmFiltros.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validarFechas()) return;

  Swal.fire({
    title: "Procesando...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  const res = await obtenerReporteCajeros(
    txtFechaInicio.value,
    txtFechaFin.value,
    cboEstado.value,
    cboCajero.value,
  );

  Swal.close();

  if (res.success) {
    renderizarKPI(res.datos);
    renderizarTabla(res.datos);
  } else {
    Swal.fire("Error", res.mensaje || "Error al obtener reporte", "error");
  }
});

btnExportarPDF.addEventListener("click", () => {
  if (!validarFechas() || !dataActual || dataActual.length === 0) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const rangoFechas = `${txtFechaInicio.value} al ${txtFechaFin.value}`;

  const startY = generarCabeceraPDF(
    doc,
    "Rendimiento por Cajeros",
    rangoFechas,
    datosEmpresa,
    logoEmpresaBase64,
  );

  const bodyData = dataActual.map((c, i) => [
    cboCajero.value !== "TODOS" ? "-" : i + 1,
    c.Nombre,
    c.Transacciones,
    `S/ ${parseFloat(c.TotalVendido).toFixed(2)}`,
    `S/ ${parseFloat(c.TicketPromedio).toFixed(2)}`,
  ]);

  doc.autoTable({
    startY: startY,
    head: [
      [
        "Pos.",
        "Nombre del Vendedor",
        "Transacciones",
        "Total Generado",
        "Ticket Promedio",
      ],
    ],
    body: bodyData,
    ...estiloTablaCorporativa,
    columnStyles: {
      0: { halign: "center", fontStyle: "bold" },
      1: { halign: "left" },
      2: { halign: "center" },
      3: { halign: "right", fontStyle: "bold", textColor: [21, 128, 61] },
      4: { halign: "right", fontStyle: "bold", textColor: [2, 132, 199] },
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

  doc.save(`Rendimiento_Cajeros_${txtFechaInicio.value}.pdf`);
});

btnExportarExcel.addEventListener("click", async () => {
  if (!validarFechas()) return;

  const originalHTML = btnExportarExcel.innerHTML;
  btnExportarExcel.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>';
  btnExportarExcel.disabled = true;

  try {
    let url = `http://localhost:3000/api/reportes/exportar-cajeros-excel?fechaInicio=${txtFechaInicio.value}&fechaFin=${txtFechaFin.value}`;
    if (cboEstado.value) url += `&estado=${cboEstado.value}`;
    if (cboCajero.value) url += `&usuarioId=${cboCajero.value}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("tokenFoxGamers")}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(
        errorData.mensaje || "Error interno del servidor al generar el Excel.",
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = downloadUrl;
    a.download = `Rendimiento_Cajeros_${txtFechaInicio.value}.xlsx`;
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(downloadUrl);
    a.remove();
  } catch (error) {
    console.error("Error Exportación:", error);
    Swal.fire("Error en Exportación", error.message, "error");
  } finally {
    btnExportarExcel.innerHTML = originalHTML;
    btnExportarExcel.disabled = false;
  }
});

document.addEventListener("DOMContentLoaded", inicializarConfiguracion);
