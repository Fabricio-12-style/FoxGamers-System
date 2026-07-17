import { obtenerReporteInventario } from "./productosApi.js";
import {
  generarCabeceraPDF,
  estiloTablaCorporativa,
  convertirImagenABase64,
} from "../../../shared/utils/pdfHelper.js";

const txtFechaInicio = document.getElementById("txtFechaInicioInv");
const txtFechaFin = document.getElementById("txtFechaFinInv");
const cboCategoria = document.getElementById("cboCategoriaInv");
const cboEstadoStock = document.getElementById("cboEstadoStock");
const txtBusqueda = document.getElementById("txtBusquedaInv");
const frmFiltros = document.getElementById("frmFiltrosInventario");
const cuerpoTabla = document.getElementById("cuerpoTablaInventario");
const listaMobile = document.getElementById("listaMobileInventario");
const zonaKPIs = document.getElementById("zonaKPIsInventario");
const btnExportarExcel = document.getElementById("btnExportarExcelInv");
const btnExportarPDF = document.getElementById("btnExportarPDFInv");

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

const renderizarKPIs = (kpis) => {
  const pEstrella = kpis.productoEstrella;
  const txtEstrella = pEstrella
    ? `${pEstrella.Producto} (${pEstrella.Ventas} unds)`
    : "Ninguno";

  zonaKPIs.innerHTML = `
        <div class="col-md-4 mb-3">
            <div class="info-box shadow-sm bg-danger" style="border-radius: 8px;">
                <span class="info-box-icon elevation-1" style="background: rgba(255,255,255,0.2);"><i class="fas fa-exclamation-triangle text-white"></i></span>
                <div class="info-box-content text-white">
                    <span class="info-box-text font-weight-bold">Agotados</span>
                    <span class="info-box-number" style="font-size: 1.5rem;">${kpis.totalAgotados}</span>
                </div>
            </div>
        </div>
        <div class="col-md-4 mb-3">
            <div class="info-box shadow-sm bg-warning" style="border-radius: 8px;">
                <span class="info-box-icon elevation-1" style="background: rgba(255,255,255,0.2);"><i class="fas fa-battery-quarter text-white"></i></span>
                <div class="info-box-content text-white">
                    <span class="info-box-text font-weight-bold">Stock Bajo</span>
                    <span class="info-box-number" style="font-size: 1.5rem;">${kpis.totalBajos}</span>
                </div>
            </div>
        </div>
        <div class="col-md-4 mb-3">
            <div class="info-box shadow-sm bg-success" style="border-radius: 8px;">
                <span class="info-box-icon elevation-1" style="background: rgba(255,255,255,0.2);"><i class="fas fa-star text-white"></i></span>
                <div class="info-box-content text-white">
                    <span class="info-box-text font-weight-bold">Producto Estrella</span>
                    <span class="info-box-number" style="font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${txtEstrella}</span>
                </div>
            </div>
        </div>
    `;
};

const renderizarTabla = (productos) => {
  cuerpoTabla.innerHTML = "";
  listaMobile.innerHTML = "";
  dataActual = productos;

  if (!productos || productos.length === 0) {
    cuerpoTabla.innerHTML = `<tr><td colspan="6" class="text-muted py-4">No se encontraron productos.</td></tr>`;
    listaMobile.innerHTML = `<div class="text-muted py-4 text-center">No se encontraron productos.</div>`;
    btnExportarExcel.disabled = true;
    btnExportarPDF.disabled = true;
    return;
  }

  productos.forEach((p, index) => {
    let badgeClass = "badge-success";
    if (p.EstadoStock === "AGOTADO") badgeClass = "badge-danger";
    else if (p.EstadoStock === "BAJO") badgeClass = "badge-warning";

    cuerpoTabla.innerHTML += `
            <tr>
                <td class="align-middle font-weight-bold">${index + 1}</td>
                <td class="align-middle text-left font-weight-bold">${p.Producto}</td>
                <td class="align-middle">${p.Categoria}</td>
                <td class="align-middle font-weight-bold text-primary">${p.Ventas}</td>
                <td class="align-middle font-weight-bold">${p.StockActual}</td>
                <td class="align-middle"><span class="badge ${badgeClass} p-2">${p.EstadoStock}</span></td>
            </tr>
        `;

    listaMobile.innerHTML += `
            <div class="card border-0 shadow-sm mb-2" style="border-radius: 10px;">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="font-weight-bold text-dark">${index + 1}. ${p.Producto}</div>
                        <span class="badge ${badgeClass} p-2">${p.EstadoStock}</span>
                    </div>
                    <div class="small text-muted">Categoría</div>
                    <div class="font-weight-bold">${p.Categoria}</div>
                    <div class="small text-muted mt-2">Ventas / stock</div>
                    <div class="font-weight-bold text-primary">${p.Ventas} unds · ${p.StockActual} stock</div>
                </div>
            </div>`;
  });

  document.getElementById("txtTotalInv").textContent =
    `Total: ${productos.length} productos`;
  document.getElementById("txtUltimaConsultaInv").textContent =
    `Última consulta: ${new Date().toLocaleTimeString()}`;
  btnExportarExcel.disabled = false;
  btnExportarPDF.disabled = false;
};

const cargarReporte = async () => {
  if (!validarFechas()) return;
  Swal.fire({
    title: "Generando...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  const res = await obtenerReporteInventario(
    txtFechaInicio.value,
    txtFechaFin.value,
    cboCategoria.value,
    cboEstadoStock.value,
    txtBusqueda.value,
  );
  Swal.close();

  if (res.success) {
    renderizarKPIs(res.kpis);
    renderizarTabla(res.productos);
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

  const startY = generarCabeceraPDF(
    doc,
    "Inventario y Top Productos",
    rangoFechas,
    datosEmpresa,
    logoEmpresaBase64,
  );

  const bodyData = dataActual.map((p, i) => [
    i + 1,
    p.Producto,
    p.Categoria,
    p.Ventas,
    p.StockActual,
    p.EstadoStock,
  ]);

  doc.autoTable({
    startY: startY,
    head: [
      ["Pos.", "Producto", "Categoría", "Ventas (Unds)", "Stock", "Estado"],
    ],
    body: bodyData,
    ...estiloTablaCorporativa,
    columnStyles: {
      0: { halign: "center", fontStyle: "bold" },
      1: { halign: "left" },
      2: { halign: "left" },
      3: { halign: "center", fontStyle: "bold", textColor: [2, 132, 199] },
      4: { halign: "center", fontStyle: "bold" },
      5: { halign: "center", fontStyle: "bold" },
    },
    didParseCell: function (data) {
      if (data.section === "body" && data.column.index === 5) {
        if (data.cell.raw === "AGOTADO")
          data.cell.styles.textColor = [220, 38, 38];
        if (data.cell.raw === "BAJO")
          data.cell.styles.textColor = [217, 119, 6];
        if (data.cell.raw === "OK") data.cell.styles.textColor = [22, 163, 74];
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
  doc.save(`Inventario_${txtFechaInicio.value}.pdf`);
});

btnExportarExcel.addEventListener("click", async () => {
  if (!validarFechas()) return;
  const originalHTML = btnExportarExcel.innerHTML;
  btnExportarExcel.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>';
  btnExportarExcel.disabled = true;

  try {
    let url = `http://localhost:3000/api/reportes/exportar-inventario-excel?fechaInicio=${txtFechaInicio.value}&fechaFin=${txtFechaFin.value}`;
    if (cboCategoria.value) url += `&categoriaId=${cboCategoria.value}`;
    if (cboEstadoStock.value) url += `&estadoStock=${cboEstadoStock.value}`;
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
    a.download = `Inventario_${txtFechaInicio.value}.xlsx`;
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
