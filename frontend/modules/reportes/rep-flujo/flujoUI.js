import { obtenerFlujoCaja } from "./flujoApi.js";
import {
  generarCabeceraPDF,
  estiloTablaCorporativa,
  convertirImagenABase64,
} from "../../../shared/utils/pdfHelper.js";

const txtFecha = document.getElementById("txtFechaFlujo");
const cboCajero = document.getElementById("cboCajeroFlujo");
const frmFiltros = document.getElementById("frmFiltrosFlujo");
const cuerpoTabla = document.getElementById("cuerpoTablaFlujo");
const zonaKPIs = document.getElementById("zonaKPIsFlujo");
const btnExportarExcel = document.getElementById("btnExportarExcelFlujo");
const btnExportarPDF = document.getElementById("btnExportarPDFFlujo");

let dataActual = null;
let kpisActuales = null;
let datosEmpresa = null;
let logoEmpresaBase64 = null;

const inicializarConfiguracion = async () => {
  txtFecha.value = new Date().toISOString().split("T")[0];

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

const renderizarKPIs = (kpis) => {
  zonaKPIs.innerHTML = `
        <div class="col px-2 mb-3">
            <div class="info-box shadow-sm border-0" style="border-radius: 8px; background-color: #059669; color: white;">
                <span class="info-box-icon elevation-1" style="background: rgba(255,255,255,0.2);"><i class="fas fa-money-bill-wave"></i></span>
                <div class="info-box-content">
                    <span class="info-box-text font-weight-bold">Efectivo</span>
                    <span class="info-box-number" style="font-size: 1.2rem;">S/ ${parseFloat(kpis.totalEfectivoTienda).toFixed(2)}</span>
                </div>
            </div>
        </div>
        <div class="col px-2 mb-3">
            <div class="info-box shadow-sm border-0" style="border-radius: 8px; background-color: #7c3aed; color: white;">
                <span class="info-box-icon elevation-1" style="background: rgba(255,255,255,0.2);"><i class="fas fa-mobile-alt"></i></span>
                <div class="info-box-content">
                    <span class="info-box-text font-weight-bold">Yape/Plin</span>
                    <span class="info-box-number" style="font-size: 1.2rem;">S/ ${parseFloat(kpis.totalDigitalTienda).toFixed(2)}</span>
                </div>
            </div>
        </div>
        <div class="col px-2 mb-3">
            <div class="info-box shadow-sm border-0" style="border-radius: 8px; background-color: #0284c7; color: white;">
                <span class="info-box-icon elevation-1" style="background: rgba(255,255,255,0.2);"><i class="fas fa-credit-card"></i></span>
                <div class="info-box-content">
                    <span class="info-box-text font-weight-bold">POS</span>
                    <span class="info-box-number" style="font-size: 1.2rem;">S/ ${parseFloat(kpis.totalTarjetaTienda).toFixed(2)}</span>
                </div>
            </div>
        </div>
        <div class="col px-2 mb-3">
            <div class="info-box shadow-sm border-0" style="border-radius: 8px; background-color: #d97706; color: white;">
                <span class="info-box-icon elevation-1" style="background: rgba(255,255,255,0.2);"><i class="fas fa-university"></i></span>
                <div class="info-box-content">
                    <span class="info-box-text font-weight-bold">Transferencia</span>
                    <span class="info-box-number" style="font-size: 1.2rem;">S/ ${parseFloat(kpis.totalTransferenciaTienda).toFixed(2)}</span>
                </div>
            </div>
        </div>
        <div class="col px-2 mb-3">
            <div class="info-box shadow-sm border-0" style="border-radius: 8px; background-color: #0f172a; color: white;">
                <span class="info-box-icon elevation-1" style="background: rgba(255,255,255,0.2);"><i class="fas fa-coins"></i></span>
                <div class="info-box-content">
                    <span class="info-box-text font-weight-bold">Total General</span>
                    <span class="info-box-number" style="font-size: 1.3rem;">S/ ${parseFloat(kpis.granTotal).toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
};

const renderizarTabla = (detalles) => {
  cuerpoTabla.innerHTML = "";
  dataActual = detalles;

  if (!detalles || detalles.length === 0) {
    cuerpoTabla.innerHTML = `<tr><td colspan="6" class="text-muted py-4">No hay movimientos registrados para esta fecha.</td></tr>`;
    btnExportarExcel.disabled = true;
    btnExportarPDF.disabled = true;
    return;
  }

  detalles.forEach((row) => {
    cuerpoTabla.innerHTML += `
        <tr>
            <td class="align-middle text-left font-weight-bold"><i class="fas fa-user-circle text-muted mr-2"></i>${row.Cajero}</td>
            <td class="align-middle">
                <div class="font-weight-bold text-success">S/ ${parseFloat(row.TotalEfectivo).toFixed(2)}</div>
                <small class="text-muted">${row.TransaccionesEfectivo} transacciones</small>
            </td>
            <td class="align-middle">
                <div class="font-weight-bold" style="color: #6d28d9;">S/ ${parseFloat(row.TotalDigital).toFixed(2)}</div>
                <small class="text-muted">${row.TransaccionesDigital} transacciones</small>
            </td>
            <td class="align-middle">
                <div class="font-weight-bold" style="color: #0369a1;">S/ ${parseFloat(row.TotalTarjeta).toFixed(2)}</div>
                <small class="text-muted">${row.TransaccionesTarjeta} transacciones</small>
            </td>
            <td class="align-middle">
                <div class="font-weight-bold" style="color: #d97706;">S/ ${parseFloat(row.TotalTransferencia).toFixed(2)}</div>
                <small class="text-muted">${row.TransaccionesTransferencia} transacciones</small>
            </td>
            <td class="align-middle font-weight-bold h6 text-white" style="background-color: #0f172a;">
                S/ ${parseFloat(row.TotalGenerado).toFixed(2)}
            </td>
        </tr>`;
  });

  btnExportarExcel.disabled = false;
  btnExportarPDF.disabled = false;
};

frmFiltros.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!txtFecha.value) return;

  Swal.fire({
    title: "Calculando Cierre...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  const res = await obtenerFlujoCaja(txtFecha.value, cboCajero.value);
  Swal.close();

  if (res.success) {
    kpisActuales = res.kpis;
    renderizarKPIs(res.kpis);
    renderizarTabla(res.detalles);
  } else {
    Swal.fire("Error", res.mensaje || "Error al obtener reporte", "error");
  }
});

btnExportarPDF.addEventListener("click", () => {
  if (!dataActual) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const startY = generarCabeceraPDF(
    doc,
    `Flujo de Caja y Cierre Diario`,
    `Día de Operación: ${txtFecha.value}`,
    datosEmpresa,
    logoEmpresaBase64,
  );

  const bodyData = dataActual.map((r) => [
    r.Cajero,
    `S/ ${parseFloat(r.TotalEfectivo).toFixed(2)}\n(${r.TransaccionesEfectivo} tx)`,
    `S/ ${parseFloat(r.TotalDigital).toFixed(2)}\n(${r.TransaccionesDigital} tx)`,
    `S/ ${parseFloat(r.TotalTarjeta).toFixed(2)}\n(${r.TransaccionesTarjeta} tx)`,
    `S/ ${parseFloat(r.TotalTransferencia).toFixed(2)}\n(${r.TransaccionesTransferencia} tx)`,
    `S/ ${parseFloat(r.TotalGenerado).toFixed(2)}`,
  ]);

  if (kpisActuales) {
    bodyData.push([
      "TOTAL GENERAL",
      `S/ ${parseFloat(kpisActuales.totalEfectivoTienda).toFixed(2)}`,
      `S/ ${parseFloat(kpisActuales.totalDigitalTienda).toFixed(2)}`,
      `S/ ${parseFloat(kpisActuales.totalTarjetaTienda).toFixed(2)}`,
      `S/ ${parseFloat(kpisActuales.totalTransferenciaTienda).toFixed(2)}`,
      `S/ ${parseFloat(kpisActuales.granTotal).toFixed(2)}`,
    ]);
  }

  doc.autoTable({
    startY: startY,
    head: [
      [
        "Cajero / Vendedor",
        "Efectivo",
        "Digital (Yape)",
        "POS (Tarjeta)",
        "Transferencia",
        "Total",
      ],
    ],
    body: bodyData,
    ...estiloTablaCorporativa,
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "right", fontStyle: "bold" },
    },
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

  doc.save(`Flujo_Caja_${txtFecha.value}.pdf`);
});

btnExportarExcel.addEventListener("click", async () => {
  if (!txtFecha.value) return;
  const originalHTML = btnExportarExcel.innerHTML;
  btnExportarExcel.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btnExportarExcel.disabled = true;

  try {
    let url = `http://localhost:3000/api/reportes/exportar-flujo-excel?fecha=${txtFecha.value}`;
    if (cboCajero.value) url += `&usuarioId=${cboCajero.value}`;

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
    a.download = `FlujoCaja_${txtFecha.value}.xlsx`;
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