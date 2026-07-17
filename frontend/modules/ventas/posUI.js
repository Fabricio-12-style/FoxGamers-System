import { posApi } from "./posApi.js";
import { posState } from "./posState.js";

let debounceHistorial = null;
let totalActualVenta = 0;
const BASE_URL = "http://localhost:3000";

const inicializarModulo = async () => {
  const usuarioInfo = localStorage.getItem("usuarioFoxGamers");
  if (!usuarioInfo) return (window.location.href = "../../login/login.html");

  posState.init(usuarioInfo);
  document.getElementById("posVendedorActivo").textContent =
    posState.usuarioActivo.NombreUsuario || "Cajero";

  try {
    const [productos, descuentos, empresaRes] = await Promise.all([
      posApi.obtenerProductosPOS(),
      posApi.obtenerDescuentos(),
      posApi.obtenerDatosEmpresa(),
    ]);
    posState.setMaestros(productos, descuentos, empresaRes.data);

    if (empresaRes.data) {
      const pTicketPie = document.querySelector("#zonaTicket p");
      if (pTicketPie)
        pTicketPie.innerHTML = `${empresaRes.data.NombreComercial}<br>Tel: ${empresaRes.data.Telefono}`;
    }

    const webJson = await posApi.obtenerConfigWeb();
    const logoActivo = webJson?.logos?.find(
      (l) => l.Activo == 1 || l.Activo === true,
    );
    if (logoActivo) {
      const urlLogo = logoActivo.ImagenURL.startsWith("http")
        ? logoActivo.ImagenURL
        : `${BASE_URL}${logoActivo.ImagenURL}`;
      if (document.getElementById("tkLogo"))
        document.getElementById("tkLogo").src = urlLogo;
      if (document.getElementById("visorLogo"))
        document.getElementById("visorLogo").src = urlLogo;
    }
  } catch (e) {
    console.error("Error cargando maestros POS", e);
  }

  cargarHistorialVentas();
  configurarEventosDOM();
};

const actualizarVistaCarrito = () => {
  const body = document.getElementById("posTablaCarrito");
  if (!body) return;
  body.innerHTML = "";
  let totalNeto = 0;
  let totalDescuento = 0;

  if (posState.carrito.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="py-4 italic text-muted">No hay productos en el carrito.</td></tr>`;
    actualizarTotalesUI(0, 0);
    return;
  }

  posState.carrito.forEach((item, index) => {
    const montoDesc = posState.calcularMontoDescuento(
      item.descuento,
      item.precio,
      item.cantidad,
    );
    const subtotal = item.precio * item.cantidad - montoDesc;
    totalNeto += item.precio * item.cantidad;
    totalDescuento += montoDesc;

    const precioHtml = item.descuento
      ? `<span style="text-decoration:line-through; font-size:11px;" class="text-muted">S/ ${item.precio.toFixed(2)}</span><br><span class="text-success font-weight-bold">S/ ${(item.precio - montoDesc / item.cantidad).toFixed(2)}</span>`
      : `<span class="font-weight-bold">S/ ${item.precio.toFixed(2)}</span>`;

    body.innerHTML += `
        <tr>
            <!-- Columna principal adaptable -->
            <td class="text-left py-2 align-middle">
                <div class="font-weight-bold text-dark mb-1" style="font-size: 0.9rem;">${item.nombre}</div>
                
                <!-- Este bloque solo aparece en MÓVIL para agrupar los datos -->
                <div class="d-flex d-md-none justify-content-between align-items-center mt-2 bg-light p-2 rounded border">
                    <div style="font-size: 0.85rem;">${precioHtml}</div>
                    <div style="width: 70px;">
                        <input type="number" value="${item.cantidad}" min="1" max="${item.stockMaximo}" class="form-control form-control-sm text-center font-weight-bold px-1" onchange="cambiarCantidad(${index}, this.value)">
                    </div>
                    <div class="font-weight-bold text-primary" style="font-size: 0.9rem;">S/ ${subtotal.toFixed(2)}</div>
                    <button class="btn btn-sm btn-danger px-2 py-1" onclick="eliminarItem(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
            
            <!-- Columnas exclusivas de PC -->
            <td class="d-none d-md-table-cell align-middle">${precioHtml}</td>
            <td class="d-none d-md-table-cell align-middle" width="80">
                <input type="number" value="${item.cantidad}" min="1" max="${item.stockMaximo}" class="form-control form-control-sm text-center font-weight-bold" onchange="cambiarCantidad(${index}, this.value)">
            </td>
            <td class="d-none d-md-table-cell font-weight-bold text-dark align-middle">S/ ${subtotal.toFixed(2)}</td>
            <td class="d-none d-md-table-cell align-middle text-right">
                <button class="btn btn-sm btn-danger px-2 py-1 shadow-sm" onclick="eliminarItem(${index})"><i class="fas fa-times"></i></button>
            </td>
        </tr>`;
  });
  actualizarTotalesUI(totalNeto, totalDescuento);
};

const actualizarTotalesUI = (totalBruto, totalDescuento) => {
  totalActualVenta = totalBruto - totalDescuento;

  const lblSub = document.getElementById("posSubtotal");
  const lblTot = document.getElementById("posTotal");
  if (lblSub) lblSub.textContent = `S/ ${totalActualVenta.toFixed(2)}`;
  if (lblTot) lblTot.textContent = `S/ ${totalActualVenta.toFixed(2)}`;

  const filaDesc = document.getElementById("filaDescuento");
  if (filaDesc) {
    filaDesc.style.display = totalDescuento > 0 ? "" : "none";
    document.getElementById("posDescuento").textContent =
      `-S/ ${totalDescuento.toFixed(2)}`;
  }
  validarCaja();
};

const validarCaja = () => {
  const btnProcesar = document.getElementById("btnProcesarVenta");
  if (!btnProcesar) return;
  if (posState.carrito.length === 0) {
    btnProcesar.disabled = true;
    return;
  }

  const isMixto = document.getElementById("chkPagoDividido")?.checked;
  if (isMixto) {
    const totalIngresado = posState.pagosMixtos.reduce(
      (sum, p) => sum + p.monto,
      0,
    );
    document.getElementById("lblTotalIngresadoMix").textContent =
      `S/ ${totalIngresado.toFixed(2)}`;

    if (totalIngresado < totalActualVenta) {
      document.getElementById("lblFaltaMix").textContent =
        `S/ ${(totalActualVenta - totalIngresado).toFixed(2)}`;
      document.getElementById("zonaVueltoMix").classList.add("d-none");
      btnProcesar.disabled = true;
    } else {
      document.getElementById("lblFaltaMix").textContent = `S/ 0.00`;
      const exceso = totalIngresado - totalActualVenta;
      const tieneEfectivo = posState.pagosMixtos.some(
        (p) => p.metodo === "EFECTIVO",
      );

      if (exceso > 0 && tieneEfectivo) {
        document.getElementById("lblVueltoMix").textContent =
          `S/ ${exceso.toFixed(2)}`;
        document.getElementById("zonaVueltoMix").classList.remove("d-none");
        btnProcesar.disabled = false;
      } else if (exceso > 0 && !tieneEfectivo) {
        document.getElementById("lblTotalIngresadoMix").textContent =
          `S/ ${totalIngresado.toFixed(2)} (Exceso denegado)`;
        document.getElementById("zonaVueltoMix").classList.add("d-none");
        btnProcesar.disabled = true;
      } else {
        document.getElementById("zonaVueltoMix").classList.add("d-none");
        btnProcesar.disabled = false;
      }
    }
  } else {
    const metodo = document.getElementById("posMetodoPago")?.value;
    const inputEf = document.getElementById("posEfectivoRecibido");
    const lblVuelto = document.getElementById("posVuelto");

    if (metodo === "EFECTIVO" && inputEf && lblVuelto) {
      const efectivoInput = parseFloat(inputEf.value) || 0;
      const vuelto = efectivoInput - totalActualVenta;
      lblVuelto.textContent =
        vuelto >= 0 ? `S/ ${vuelto.toFixed(2)}` : "Falta Dinero";
      lblVuelto.className =
        vuelto >= 0
          ? "h4 m-0 font-weight-bold text-success"
          : "h6 m-0 font-weight-bold text-danger";
      btnProcesar.disabled = vuelto < 0;
    } else {
      btnProcesar.disabled = false;
    }
  }
};

const configurarEventosDOM = () => {
  const inputBuscarProd = document.getElementById("posBuscarProducto");
  if (inputBuscarProd) {
    const resultDiv = document.createElement("div");
    resultDiv.className = "list-group position-absolute w-100 shadow-lg";
    resultDiv.style.zIndex = "1000";
    inputBuscarProd.parentNode.appendChild(resultDiv);

    inputBuscarProd.addEventListener("input", (e) => {
      const txt = e.target.value.toLowerCase();
      resultDiv.innerHTML = "";
      if (txt.length < 2) return;

      const filtrados = posState.productosBase.filter(
        (p) =>
          p.Nombre.toLowerCase().includes(txt) ||
          p.Codigo.toLowerCase().includes(txt),
      );
      filtrados.forEach((p) => {
        const item = document.createElement("a");
        item.href = "#";
        item.className =
          "list-group-item list-group-item-action d-flex justify-content-between";
        item.innerHTML = `<div><strong>${p.Nombre}</strong><br><small>${p.Codigo} | S/ ${p.PrecioVenta.toFixed(2)}</small></div>
                                  <span class="badge ${p.StockActual > 0 ? "badge-success" : "badge-danger"}">${p.StockActual > 0 ? p.StockActual + " und" : "Sin Stock"}</span>`;

        item.addEventListener("click", (eClick) => {
          eClick.preventDefault();
          if (p.StockActual > 0) {
            window.agregarAlCarrito(p.ProductoID);
            inputBuscarProd.value = "";
            resultDiv.innerHTML = "";
          }
        });
        resultDiv.appendChild(item);
      });
    });
    document.addEventListener("click", (e) => {
      if (e.target !== inputBuscarProd) resultDiv.innerHTML = "";
    });
  }

  const inputHistorial = document.getElementById("inputBuscarHistorial");
  if (inputHistorial) {
    inputHistorial.addEventListener("input", (e) => {
      const valor = e.target.value;
      clearTimeout(debounceHistorial);
      debounceHistorial = setTimeout(() => {
        cargarHistorialVentas(valor);
      }, 400);
    });
  }

  document
    .getElementById("posBuscarCliente")
    ?.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const query = e.target.value.trim();
        if (!query) return;
        const data = await posApi.buscarCliente(query);

        if (data && data.length > 0) {
          const tbody = document.getElementById("listaResultadosClientes");
          tbody.innerHTML = "";
          posState.esClienteNuevo = false;
          document.getElementById("panelNuevoCliente").classList.add("d-none");
          data.forEach((c) => {
            tbody.innerHTML += `<tr><td class="font-weight-bold">${c.Documento || "N/A"}</td><td class="dato-critico">${c.NombreRazonSocial}</td>
                    <td><button class="btn btn-sm btn-fox-cyan" onclick="seleccionarCliente(${c.ClienteID}, '${c.NombreRazonSocial.replace(/'/g, "\\'")}')">Seleccionar</button></td></tr>`;
          });
          $("#modalBuscarCliente").modal("show");
        } else if (query.length === 8 || query.length === 11) {
          posState.esClienteNuevo = true;
          posState.clienteSeleccionado = null;
          const tipoDoc = query.length === 8 ? "dni" : "ruc";
          document.getElementById("nuevoCliDoc").value = query;
          document
            .getElementById("panelNuevoCliente")
            .classList.remove("d-none");
          document
            .getElementById("zonaBusquedaCliente")
            .classList.add("d-none");

          const inputNombre = document.getElementById("nuevoCliNombre");
          inputNombre.value = "Consultando...";

          const dataExt = await posApi.consultarDniRuc(tipoDoc, query);
          inputNombre.value = dataExt.success
            ? dataExt.data.nombreCompleto
            : "";
          if (!dataExt.success)
            inputNombre.placeholder =
              "No encontrado. Digite el nombre manualmente.";
          validarCaja();
        }
      }
    });

  document
    .getElementById("chkPagoDividido")
    ?.addEventListener("change", (e) => {
      document
        .getElementById("panelPagoSimple")
        .classList.toggle("d-none", e.target.checked);
      document
        .getElementById("panelPagoMixto")
        .classList.toggle("d-none", !e.target.checked);
      validarCaja();
    });

  document.getElementById("posMetodoPago")?.addEventListener("change", (e) => {
    document
      .getElementById("panelEfectivoSimple")
      .classList.toggle("d-none", e.target.value !== "EFECTIVO");
    validarCaja();
  });
  document
    .getElementById("posEfectivoRecibido")
    ?.addEventListener("input", validarCaja);

  document
    .getElementById("btnAgregarPagoMix")
    ?.addEventListener("click", () => {
      const metodo = document.getElementById("mixMetodoSelect").value;
      const monto =
        parseFloat(document.getElementById("mixMontoInput").value) || 0;
      if (monto <= 0) return;
      const existe = posState.pagosMixtos.find((p) => p.metodo === metodo);
      if (existe) existe.monto += monto;
      else posState.pagosMixtos.push({ metodo, monto });
      document.getElementById("mixMontoInput").value = "";

      const lista = document.getElementById("listaPagosMixtos");
      lista.innerHTML = "";
      posState.pagosMixtos.forEach((p, idx) => {
        lista.innerHTML += `<li class="list-group-item d-flex justify-content-between"><span>${p.metodo}</span><span>S/ ${p.monto.toFixed(2)} <button class="btn btn-sm text-danger ml-2" onclick="eliminarPagoMix(${idx})"><i class="fas fa-trash"></i></button></span></li>`;
      });
      validarCaja();
    });

  document
    .getElementById("btnClienteGeneral")
    ?.addEventListener("click", () => {
      posState.clienteSeleccionado = null;
      posState.esClienteNuevo = false;
      document.getElementById("lblNombreCliente").textContent =
        "Público General";
      document
        .getElementById("posClienteSeleccionado")
        .classList.remove("d-none");
      document.getElementById("zonaBusquedaCliente").classList.add("d-none");
      document.getElementById("panelNuevoCliente").classList.add("d-none");
      validarCaja();
    });

  document.getElementById("btnQuitarCliente")?.addEventListener("click", () => {
    posState.clienteSeleccionado = null;
    posState.esClienteNuevo = false;
    document.getElementById("posClienteSeleccionado").classList.add("d-none");
    document.getElementById("zonaBusquedaCliente").classList.remove("d-none");
    document.getElementById("posBuscarCliente").value = "";
    validarCaja();
  });

  document.getElementById("btnAbrirCatalogo")?.addEventListener("click", () => {
    const grid = document.getElementById("gridCatalogoProductos");
    grid.innerHTML = "";
    posState.productosBase.forEach((p) => {
      const stockBadge =
        p.StockActual <= 0
          ? '<span class="badge badge-danger mb-2">Agotado</span>'
          : '<span class="badge badge-success mb-2">Disponible</span>';
      const btnAgregar =
        p.StockActual <= 0
          ? '<button class="btn btn-secondary btn-block font-weight-bold" disabled>Agotado</button>'
          : `<button class="btn btn-fox-success btn-block" onclick="agregarDesdeCatalogo(${p.ProductoID})"><i class="fas fa-cart-plus"></i> Agregar</button>`;
      const imgUrl =
        p.ImagenURL && p.ImagenURL.trim() !== ""
          ? p.ImagenURL.startsWith("http")
            ? p.ImagenURL
            : `${BASE_URL}${p.ImagenURL}`
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.Nombre.charAt(0))}&background=f1f5f9&color=1e293b&size=150`;

      grid.innerHTML += `
            <div class="col-xl-3 col-lg-4 col-md-6 mb-4">
                <div class="card h-100 border shadow-sm" style="border-radius: 12px; overflow: hidden; ${p.StockActual <= 0 ? "opacity: 0.6;" : ""}">
                    <img src="${imgUrl}" class="card-img-top border-bottom" style="height: 140px; object-fit: contain; padding: 10px;">
                    <div class="card-body p-3 d-flex flex-column">
                        <div>${stockBadge}</div>
                        <h6 class="dato-critico mt-2 mb-1">${p.Nombre}</h6>
                        <small class="d-block mb-3 border-bottom pb-2 text-muted">Cod: ${p.Codigo}</small>
                        <div class="mt-auto">
                            <h4 class="dato-critico mb-1">S/ ${parseFloat(p.PrecioVenta).toFixed(2)}</h4>
                            <div class="small font-weight-bold mb-3 text-muted">Stock: ${p.StockActual}</div>
                            ${btnAgregar}
                        </div>
                    </div>
                </div>
            </div>`;
    });
    $("#modalCatalogo").modal("show");
  });

  document
    .getElementById("btnProcesarVenta")
    ?.addEventListener("click", async () => {
      const btn = document.getElementById("btnProcesarVenta");
      btn.disabled = true;
      btn.innerHTML =
        '<i class="fas fa-spinner fa-spin mr-2"></i> PROCESANDO...';

      let desglosePagosFinal = [];
      let metodoCabecera = document.getElementById("chkPagoDividido")?.checked
        ? "MIXTO"
        : document.getElementById("posMetodoPago").value;

      if (metodoCabecera === "MIXTO") {
        const totalIngresado = posState.pagosMixtos.reduce(
          (sum, p) => sum + p.monto,
          0,
        );
        const vueltoCalculado = totalIngresado - totalActualVenta;

        posState.pagosMixtos.forEach((p) =>
          desglosePagosFinal.push({
            metodo: p.metodo,
            montoRecibido: p.monto,
            vuelto: p.metodo === "EFECTIVO" ? vueltoCalculado : 0,
          }),
        );
      } else {
        const recibido =
          metodoCabecera === "EFECTIVO"
            ? parseFloat(document.getElementById("posEfectivoRecibido").value)
            : totalActualVenta;
        desglosePagosFinal.push({
          metodo: metodoCabecera,
          montoRecibido: recibido,
          vuelto:
            metodoCabecera === "EFECTIVO" ? recibido - totalActualVenta : 0,
        });
      }

      const dataVenta = {
        ClienteID: posState.esClienteNuevo
          ? null
          : posState.clienteSeleccionado,
        UsuarioID:
          posState.usuarioActivo.UsuarioID || posState.usuarioActivo.id,
        MetodoPago: metodoCabecera,
        Observacion: posState.esClienteNuevo
          ? "Venta POS + Alta Cliente"
          : "Venta POS",
        pagos: desglosePagosFinal,
        items: posState.carrito.map((i) => ({
          ProductoID: i.id,
          cantidad: i.cantidad,
        })),
        ClienteNuevo: posState.esClienteNuevo
          ? {
              Documento: document.getElementById("nuevoCliDoc").value,
              NombreRazonSocial:
                document.getElementById("nuevoCliNombre").value,
            }
          : null,
      };

      try {
        const res = await posApi.finalizarVenta(dataVenta);
        if (res.success) {
          Swal.fire({
            icon: "success",
            title: "¡Venta Completada!",
            text: `Doc: ${res.NumeroDoc}`,
            timer: 2000,
            showConfirmButton: false,
          });
          posState.limpiarCaja();
          actualizarVistaCarrito();
          $("#modalPOS").modal("hide");

          if (document.getElementById("posEfectivoRecibido"))
            document.getElementById("posEfectivoRecibido").value = "";
          if (document.getElementById("posBuscarCliente"))
            document.getElementById("posBuscarCliente").value = "";
          document
            .getElementById("posClienteSeleccionado")
            .classList.add("d-none");
          document
            .getElementById("zonaBusquedaCliente")
            .classList.remove("d-none");

          cargarHistorialVentas();
          posApi
            .obtenerProductosPOS()
            .then((p) => (posState.productosBase = p.filter((x) => x.Activo)));
        } else Swal.fire("Error", res.mensaje, "error");
      } catch (e) {
        Swal.fire("Error", "Fallo de conexión.", "error");
      } finally {
        btn.innerHTML =
          '<i class="fas fa-check-circle mr-2"></i> CONFIRMAR VENTA';
        validarCaja();
      }
    });

  document
    .getElementById("tablaHistorialVentas")
    ?.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-expandir");
      if (btn) {
        const filaPrincipal = btn.closest(".fila-principal");
        const filaDetalle = filaPrincipal.nextElementSibling;

        filaDetalle.classList.toggle("d-none");

        const icono = btn.querySelector("i");
        if (icono.classList.contains("fa-plus")) {
          icono.classList.remove("fa-plus");
          icono.classList.add("fa-minus");
        } else {
          icono.classList.remove("fa-minus");
          icono.classList.add("fa-plus");
        }
      }
    });
};

const cargarHistorialVentas = async (q = "") => {
  const tabla = document.getElementById("tablaHistorialVentas");
  if (!tabla) return;
  try {
    const ventas = await posApi.obtenerVentas(q);
    tabla.innerHTML = "";
    if (ventas.length === 0)
      return (tabla.innerHTML =
        '<tr><td colspan="10" class="py-4 text-muted">No hay registros.</td></tr>');

    ventas.forEach((v) => {
      const badge =
        v.Estado === "ANULADA"
          ? '<span class="badge badge-danger">ANULADA</span>'
          : '<span class="badge badge-success">COMPLETADA</span>';
      const subtotalCalculado = (
        parseFloat(v.Total) + parseFloat(v.TotalDescuento)
      ).toFixed(2);
      const fechaLimpia = v.FechaVenta.includes("T")
        ? v.FechaVenta.replace("T", " ").substring(0, 16)
        : v.FechaVenta;

      tabla.innerHTML += `
            <tr class="fila-principal">
                <!-- 1. Expansor Móvil -->
                <td class="d-table-cell d-md-none align-middle text-center" style="width: 45px; padding: 12px 5px;">
                    <button class="btn btn-sm btn-light btn-expandir m-0 shadow-sm" style="border-radius: 50%;">
                        <i class="fas fa-plus text-primary" style="font-size: 1.1rem;"></i>
                    </button>
                </td>
                
                <!-- 2. N° Doc (Le quitamos el width: 100% para no romper la vista PC) -->
                <td class="text-left align-middle" style="padding: 12px 10px;">
                    <div class="font-weight-bold" style="font-size: 0.95rem; color: var(--fox-bg-dark);">${v.NumeroDoc}</div>
                    
                    <!-- Resumen móvil: Cliente y Estado Apilados -->
                    <div class="d-block d-md-none mt-1 text-truncate" style="font-size: 0.75rem; color: var(--fox-text-gray); max-width: 150px;">
                        <i class="fas fa-user mr-1"></i>${v.ClienteNombre || "GENERAL"}
                    </div>
                    <div class="d-block d-md-none mt-1">
                        ${badge}
                    </div>
                </td>
                
                <!-- 3. Ocultos en celular (Solo PC) -->
                <td class="text-left text-dark align-middle d-none d-md-table-cell">${v.ClienteNombre || "CLIENTE GENERAL"}</td>
                <td class="align-middle d-none d-md-table-cell">${fechaLimpia}</td>
                <td class="align-middle d-none d-md-table-cell">${v.MetodoPago}</td>
                <td class="align-middle d-none d-md-table-cell">S/ ${subtotalCalculado}</td>
                <td class="text-danger align-middle d-none d-md-table-cell">S/ ${parseFloat(v.TotalDescuento).toFixed(2)}</td>
                
                <!-- 4. Total (Alineado a la derecha) -->
                <td class="font-weight-bold text-success align-middle text-right" style="font-size: 1.05rem; white-space: nowrap; padding-right: 15px;">
                    S/ ${parseFloat(v.Total).toFixed(2)}
                </td>
                
                <!-- 5. Estado (Oculto en celular) -->
                <td class="align-middle d-none d-md-table-cell">${badge}</td>
                
                <!-- 6. Acciones (Solo PC) -->
                <td class="align-middle d-none d-md-table-cell">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-fox-cyan shadow-sm" onclick="verDetalleVenta(${v.VentaID})" title="Ver Detalle"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm btn-info shadow-sm" onclick="enviarTicketEmail(${v.VentaID})" title="Enviar Correo"><i class="fas fa-envelope"></i></button>
                        <button class="btn btn-sm btn-dark shadow-sm" onclick="imprimirTicketHistorial(${v.VentaID})" title="Imprimir"><i class="fas fa-print"></i></button>
                        <button class="btn btn-sm btn-danger shadow-sm" onclick="anularVenta(${v.VentaID})" ${v.Estado === "ANULADA" ? "disabled" : ""} title="Anular"><i class="fas fa-times-circle"></i></button>
                    </div>
                </td>
            </tr>
            
            <!-- FILA OCULTA EXPANSIBLE (MÓVIL) -->
            <tr class="fila-detalle d-none d-md-none shadow-inner">
                <td colspan="10" class="p-3 text-left" style="background: #f8fafc; border-bottom: 3px solid var(--fox-cyan);">
                    
                    <!-- Info Fecha y Método -->
                    <div class="d-flex justify-content-between mb-3 pb-2 border-bottom text-muted" style="font-size: 0.8rem;">
                        <span><i class="far fa-calendar-alt mr-1"></i> ${fechaLimpia}</span>
                        <span class="font-weight-bold text-dark"><i class="fas fa-wallet mr-1"></i> ${v.MetodoPago}</span>
                    </div>

                    <!-- Info Financiera Extra -->
                    <div class="d-flex justify-content-between text-center mb-2" style="font-size: 0.85rem;">
                        <div class="flex-fill" style="border-right: 1px solid #dee2e6;">
                            <span class="d-block font-weight-bold text-muted small mb-1">Subtotal</span>
                            <strong style="color: var(--fox-bg-dark);">S/ ${subtotalCalculado}</strong>
                        </div>
                        <div class="flex-fill">
                            <span class="d-block font-weight-bold text-muted small mb-1">Descuento</span>
                            <strong class="text-danger">S/ ${parseFloat(v.TotalDescuento).toFixed(2)}</strong>
                        </div>
                    </div>

                    <!-- Botones de Acción Móvil (Cuadrícula 2x2 para incluir el Correo sin apretar) -->
                    <div class="row m-0 mt-3">
                        <div class="col-6 p-1">
                            <button onclick="verDetalleVenta(${v.VentaID})" class="btn btn-fox-cyan btn-block font-weight-bold text-truncate" style="border-radius: 6px; padding: 8px 2px; font-size: 0.8rem;">
                                <i class="fas fa-eye mr-1"></i> Ver
                            </button>
                        </div>
                        <div class="col-6 p-1">
                            <button onclick="enviarTicketEmail(${v.VentaID})" class="btn btn-info btn-block font-weight-bold text-truncate" style="border-radius: 6px; padding: 8px 2px; font-size: 0.8rem;">
                                <i class="fas fa-envelope mr-1"></i> Correo
                            </button>
                        </div>
                        <div class="col-6 p-1">
                            <button onclick="imprimirTicketHistorial(${v.VentaID})" class="btn btn-dark btn-block font-weight-bold text-truncate" style="border-radius: 6px; padding: 8px 2px; font-size: 0.8rem;">
                                <i class="fas fa-print mr-1"></i> Print
                            </button>
                        </div>
                        <div class="col-6 p-1">
                            <button onclick="anularVenta(${v.VentaID})" class="btn btn-danger btn-block font-weight-bold text-truncate" style="border-radius: 6px; padding: 8px 2px; font-size: 0.8rem;" ${v.Estado === "ANULADA" ? "disabled" : ""}>
                                <i class="fas fa-times-circle mr-1"></i> Anular
                            </button>
                        </div>
                    </div>
                </td>
            </tr>`;
    });
  } catch (e) {
    tabla.innerHTML =
      '<tr><td colspan="10" class="text-danger font-weight-bold">Error al cargar historial</td></tr>';
  }
};

window.agregarAlCarrito = (id) => {
  const p = posState.productosBase.find((x) => x.ProductoID === id);
  const itemEnCarrito = posState.carrito.find((x) => x.id === id);
  if (itemEnCarrito) {
    if (itemEnCarrito.cantidad < p.StockActual) itemEnCarrito.cantidad++;
    else Swal.fire("Límite", "Stock máximo alcanzado", "warning");
  } else {
    posState.carrito.push({
      id: p.ProductoID,
      nombre: p.Nombre,
      precio: p.PrecioVenta,
      cantidad: 1,
      stockMaximo: p.StockActual,
      descuento: posState.buscarDescuento(p.ProductoID, p.CategoriaID),
    });
  }
  actualizarVistaCarrito();
};

window.agregarDesdeCatalogo = (id) => {
  window.agregarAlCarrito(id);
  const lbl = document.getElementById("catTotalItems");
  if (lbl) {
    lbl.textContent = posState.carrito.reduce((s, i) => s + i.cantidad, 0);
  }
};

window.cambiarCantidad = (index, cant) => {
  posState.carrito[index].cantidad = parseInt(cant);
  actualizarVistaCarrito();
};
window.eliminarItem = (index) => {
  posState.carrito.splice(index, 1);
  actualizarVistaCarrito();
};
window.eliminarPagoMix = (index) => {
  posState.pagosMixtos.splice(index, 1);
  document.getElementById("btnAgregarPagoMix").click();
};

window.seleccionarCliente = (id, nombre) => {
  posState.clienteSeleccionado = id;
  posState.esClienteNuevo = false;
  document.getElementById("lblNombreCliente").textContent = nombre;

  document.getElementById("posClienteSeleccionado").classList.remove("d-none");
  document.getElementById("zonaBusquedaCliente").classList.add("d-none");
  document.getElementById("panelNuevoCliente").classList.add("d-none");

  $("#modalBuscarCliente").modal("hide");
  validarCaja();
};

window.anularVenta = async (id) => {
  const conf = await Swal.fire({
    title: "¿Anular?",
    text: "Se restaurará el Kardex",
    icon: "warning",
    showCancelButton: true,
  });
  if (conf.isConfirmed) {
    const res = await posApi.anularVenta(
      id,
      posState.usuarioActivo.UsuarioID || posState.usuarioActivo.id,
    );
    if (res.success) {
      Swal.fire("Anulado", res.mensaje, "success");
      cargarHistorialVentas();
    }
  }
};

window.verDetalleVenta = async (idVenta) => {
  try {
    const data = await posApi.obtenerDetalleVenta(idVenta);
    if (data.success) {
      const { cabecera, detalles, pagos } = data;
      const sumaDesc = detalles.reduce(
        (acc, i) => acc + (parseFloat(i.Descuento) || 0),
        0,
      );

      if (document.getElementById("detNumDoc"))
        document.getElementById("detNumDoc").textContent = cabecera.NumeroDoc;
      if (document.getElementById("detComprobante"))
        document.getElementById("detComprobante").textContent =
          cabecera.NumeroDoc;
      if (document.getElementById("detCliente"))
        document.getElementById("detCliente").textContent =
          cabecera.ClienteNombre || "PÚBLICO GENERAL";
      if (document.getElementById("detVendedor"))
        document.getElementById("detVendedor").textContent =
          cabecera.UsuarioNombre || "Cajero";
      if (document.getElementById("detFecha"))
        document.getElementById("detFecha").textContent =
          cabecera.FechaVenta.includes("T")
            ? cabecera.FechaVenta.split("T").join(" ").substring(0, 16)
            : cabecera.FechaVenta;

      if (document.getElementById("detMetodo"))
        document.getElementById("detMetodo").textContent = cabecera.MetodoPago;

      let htmlItems = "";
      detalles.forEach((i) => {
        const desc = parseFloat(i.Descuento) || 0;
        htmlItems += `<tr><td class="text-left"><strong>${i.ProductoNombre}</strong></td>
                <td>${i.Cantidad}</td><td>S/ ${parseFloat(i.PrecioUnitario).toFixed(2)}</td>
                <td>${desc > 0 ? `<span class="text-danger">-S/ ${desc.toFixed(2)}</span>` : "-"}</td>
                <td class="text-right font-weight-bold">S/ ${parseFloat(i.Subtotal).toFixed(2)}</td></tr>`;
      });
      if (document.getElementById("detTablaItems"))
        document.getElementById("detTablaItems").innerHTML = htmlItems;

      if (document.getElementById("detSubtotal"))
        document.getElementById("detSubtotal").textContent =
          `S/ ${parseFloat(cabecera.Subtotal).toFixed(2)}`;
      if (document.getElementById("detTotal"))
        document.getElementById("detTotal").textContent =
          `S/ ${parseFloat(cabecera.Total).toFixed(2)}`;

      if (sumaDesc > 0 && document.getElementById("filaDetDescuento")) {
        document.getElementById("filaDetDescuento").classList.remove("d-none");
        document.getElementById("detDescTotal").textContent =
          `-S/ ${sumaDesc.toFixed(2)}`;
      } else if (document.getElementById("filaDetDescuento")) {
        document.getElementById("filaDetDescuento").classList.add("d-none");
      }

      let htmlPagos = "";
      if (pagos.length > 0) {
        pagos.forEach((p) => {
          htmlPagos += `<tr><td class="text-left font-weight-bold" style="color:#475569;">• ${p.Metodo}</td><td class="text-right font-weight-bold">S/ ${parseFloat(p.MontoRecibido).toFixed(2)}</td></tr>`;
          if (p.Metodo === "EFECTIVO" && p.Vuelto > 0) {
            htmlPagos += `<tr><td class="text-left text-danger small">Vuelto entregado</td><td class="text-right text-danger font-weight-bold">-S/ ${parseFloat(p.Vuelto).toFixed(2)}</td></tr>`;
          }
        });
      } else {
        htmlPagos = `<tr><td class="text-left font-weight-bold" style="color:#475569;">• ${cabecera.MetodoPago}</td><td class="text-right font-weight-bold">S/ ${parseFloat(cabecera.Total).toFixed(2)}</td></tr>`;
      }
      if (document.getElementById("detTablaPagos"))
        document.getElementById("detTablaPagos").innerHTML = htmlPagos;

      $("#modalDetalleVenta").modal("show");
    } else {
      Swal.fire(
        "Aviso",
        data.mensaje || "El ticket no pudo ser consultado",
        "warning",
      );
    }
  } catch (e) {
    console.error(e);
    Swal.fire("Error", "Fallo al conectar con el servidor", "error");
  }
};

window.imprimirTicketHistorial = async (idVenta) => {
  try {
    const data = await posApi.obtenerDetalleVenta(idVenta);
    if (data.success) {
      const { cabecera, detalles, pagos } = data;
      const emp = posState.datosEmpresaGlobal || {
        NombreComercial: "FOX GAMERS",
        RUC: "123456789",
        Direccion: "Local",
        Telefono: "123",
        Correo: "x@x.com",
      };
      const desc = detalles.reduce(
        (acc, i) => acc + (parseFloat(i.Descuento) || 0),
        0,
      );

      if (document.getElementById("visorNumero"))
        document.getElementById("visorNumero").textContent = cabecera.NumeroDoc;
      if (document.getElementById("visorCliente"))
        document.getElementById("visorCliente").textContent =
          cabecera.ClienteNombre || "PÚBLICO GENERAL";
      if (document.getElementById("visorDocCliente"))
        document.getElementById("visorDocCliente").textContent =
          cabecera.ClienteDoc || "---";
      if (document.getElementById("visorFecha"))
        document.getElementById("visorFecha").textContent =
          cabecera.FechaVenta.split("T")[0];
      if (document.getElementById("visorVendedor"))
        document.getElementById("visorVendedor").textContent =
          cabecera.UsuarioNombre || "Cajero";

      if (document.getElementById("visorMetodo"))
        document.getElementById("visorMetodo").textContent =
          cabecera.MetodoPago;

      const visorLogo = document.getElementById("visorLogo");
      if (visorLogo && visorLogo.nextElementSibling) {
        visorLogo.nextElementSibling.innerHTML = `
                    <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #0A192F; letter-spacing: -0.5px; text-transform: uppercase;">${emp.NombreComercial}</h1>
                    <p style="margin: 5px 0; font-size: 12px; font-weight: 600; color: #475569;">${emp.Direccion || ""}</p>
                    <p style="margin: 0; font-size: 12px; color: #475569;">Tel: ${emp.Telefono || ""} | Correo: ${emp.Correo || ""}</p>`;
      }

      const headerRuc = document.querySelector("#modalVistaPreviaA4 h3");
      if (headerRuc) headerRuc.textContent = `R.U.C. ${emp.RUC}`;

      let a4Html = "";
      detalles.forEach((i) => {
        a4Html += `<tr><td style="padding:10px;text-align:center;">${i.Cantidad}</td><td style="padding:10px;text-align:center;">UND</td><td style="padding:10px;text-align:left;"><strong>${i.ProductoNombre}</strong></td><td style="padding:10px;text-align:center;">S/ ${parseFloat(i.PrecioUnitario).toFixed(2)}</td><td style="padding:10px;text-align:right;">S/ ${parseFloat(i.Subtotal).toFixed(2)}</td></tr>`;
      });
      if (document.getElementById("visorTablaItems"))
        document.getElementById("visorTablaItems").innerHTML = a4Html;

      if (document.getElementById("visorSubtotal"))
        document.getElementById("visorSubtotal").textContent =
          `S/ ${parseFloat(cabecera.Subtotal).toFixed(2)}`;
      if (document.getElementById("visorDescuento"))
        document.getElementById("visorDescuento").textContent =
          desc > 0 ? `-S/ ${desc.toFixed(2)}` : `S/ 0.00`;
      if (document.getElementById("visorTotal"))
        document.getElementById("visorTotal").textContent =
          `S/ ${parseFloat(cabecera.Total).toFixed(2)}`;

      let a4HtmlPagos = "";
      if (pagos.length > 0) {
        pagos.forEach((p) => {
          a4HtmlPagos += `<tr><td style="padding: 4px 0; color: #475569; font-size: 12px;">• ${p.Metodo}</td><td style="padding: 4px 0; text-align: right; font-weight: bold; font-size: 12px;">S/ ${parseFloat(p.MontoRecibido).toFixed(2)}</td></tr>`;
          if (p.Metodo === "EFECTIVO" && p.Vuelto > 0) {
            a4HtmlPagos += `<tr><td style="padding: 4px 0; color: #ef4444; font-size: 12px;">Vuelto</td><td style="padding: 4px 0; text-align: right; color: #ef4444; font-weight: bold; font-size: 12px;">-S/ ${parseFloat(p.Vuelto).toFixed(2)}</td></tr>`;
          }
        });
      } else {
        a4HtmlPagos = `<tr><td style="padding: 4px 0; color: #475569; font-size: 12px;">• ${cabecera.MetodoPago}</td><td style="padding: 4px 0; text-align: right; font-weight: bold; font-size: 12px;">S/ ${parseFloat(cabecera.Total).toFixed(2)}</td></tr>`;
      }
      if (document.getElementById("visorTablaPagos"))
        document.getElementById("visorTablaPagos").innerHTML = a4HtmlPagos;

      const btnImprimir = document.getElementById("btnImprimirA4Final");
      if (btnImprimir) {
        const nuevoBtn = btnImprimir.cloneNode(true);
        btnImprimir.parentNode.replaceChild(nuevoBtn, btnImprimir);
        nuevoBtn.onclick = () => {
          document.body.classList.add("print-a4");
          window.print();
          setTimeout(() => {
            document.body.classList.remove("print-a4");
          }, 600);
        };
      }

      $("#modalVistaPreviaA4").modal("show");
    } else {
      Swal.fire("Aviso", data.mensaje || "El comprobante no existe", "warning");
    }
  } catch (e) {
    console.error(e);
    Swal.fire("Error", "Fallo de conexión al cargar vista previa", "error");
  }
};

window.enviarTicketEmail = async (idVenta) => {
  const { value: email } = await Swal.fire({
    title: "Enviar Comprobante",
    input: "email",
    showCancelButton: true,
    confirmButtonText: "Enviar",
  });
  if (email) {
    Swal.fire({
      title: "Enviando...",
      didOpen: () => {
        Swal.showLoading();
      },
    });
    const res = await posApi.enviarTicket(idVenta, email);
    if (res.success) Swal.fire("Enviado", res.mensaje, "success");
    else Swal.fire("Error", res.mensaje, "error");
  }
};

inicializarModulo();