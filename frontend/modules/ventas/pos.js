(() => {
  let carrito = [];
  let productosBase = [];
  let clienteSeleccionado = null;
  let descuentosVigentes = [];
  let pagosMixtos = [];
  let esClienteNuevo = false;

  let datosEmpresaGlobal = null;
  let debounceTimeoutHistorial = null;

  const IGV_RATE = 0.18;
  const BASE_URL = "http://localhost:3000";

  const getUrl = (path) => {
    if (!path) return null;
    return path.startsWith("http") ? path : `${BASE_URL}${path}`;
  };

  // =======================================================
  // 1. INICIALIZACIÓN
  // =======================================================
  (async function init() {
    const usuarioInfo = localStorage.getItem("usuarioFoxGamers");
    if (!usuarioInfo) {
      return (window.location.href = "../../login/login.html");
    }

    const usuario = JSON.parse(usuarioInfo);
    const lblVendedor = document.getElementById("posVendedorActivo");
    if (lblVendedor) {
      lblVendedor.textContent =
        usuario.NombreUsuario || usuario.Nombre || "Cajero";
    }

    await cargarProductosPOS();
    await cargarHistorialVentas();
    await cargarDatosEmpresa();
  })();

  async function cargarDatosEmpresa() {
    try {
      const res = await fetch(`${BASE_URL}/api/empresa/publica`);
      const resJson = await res.json();
      if (resJson.success) {
        datosEmpresaGlobal = resJson.data;
        const pTicketPie = document.querySelector("#zonaTicket p");
        if (pTicketPie)
          pTicketPie.innerHTML = `${datosEmpresaGlobal.NombreComercial}<br>Tel: ${datosEmpresaGlobal.Telefono}`;
      }
    } catch (e) {
      console.error("Error al sincronizar datos maestros de la empresa:", e);
    }
  }

  // =======================================================
  // 2. BUSCADOR DE PRODUCTOS (APUNTANDO AL NUEVO ENDPOINT POS)
  // =======================================================
  async function cargarProductosPOS() {
    try {
      const timestamp = new Date().getTime();
      const [resProductos, resDescuentos] = await Promise.all([
        fetch(`${BASE_URL}/api/productos/pos?t=${timestamp}`, {
          headers: { "Cache-Control": "no-cache" },
        }),
        fetch(`${BASE_URL}/api/descuentos/vigentes?t=${timestamp}`, {
          headers: { "Cache-Control": "no-cache" },
        }),
      ]);
      const productos = await resProductos.json();
      const descuentos = await resDescuentos.json();

      productosBase = productos.filter(
        (p) => p.Activo === true || p.Activo === 1,
      );
      descuentosVigentes = Array.isArray(descuentos) ? descuentos : [];
    } catch (error) {
      console.error("Error cargando productos al POS:", error);
    }
  }

  function buscarDescuentoParaProducto(productoID, categoriaID) {
    const porProducto = descuentosVigentes.find(
      (d) => d.AplicaA === "PRODUCTO" && d.ReferenciaID === productoID,
    );
    if (porProducto) return porProducto;
    const porCategoria = descuentosVigentes.find(
      (d) => d.AplicaA === "CATEGORIA" && d.ReferenciaID === categoriaID,
    );
    if (porCategoria) return porCategoria;
    const general = descuentosVigentes.find((d) => d.AplicaA === "GENERAL");
    if (general) return general;
    return null;
  }

  function calcularMontoDescuento(descuento, precio, cantidad) {
    if (!descuento) return 0;
    if (descuento.TipoDescuento === "PORCENTAJE") {
      return (
        Math.round(precio * cantidad * (descuento.Valor / 100) * 100) / 100
      );
    }
    return Math.min(descuento.Valor, precio * cantidad);
  }

  const inputBuscarProd = document.getElementById("posBuscarProducto");
  if (inputBuscarProd) {
    const resultDiv = document.createElement("div");
    resultDiv.className = "list-group position-absolute w-100 shadow-lg";
    resultDiv.style.zIndex = "1000";
    resultDiv.style.maxHeight = "250px";
    resultDiv.style.overflowY = "auto";
    inputBuscarProd.parentNode.appendChild(resultDiv);

    inputBuscarProd.addEventListener("input", (e) => {
      const txt = e.target.value.toLowerCase();
      resultDiv.innerHTML = "";
      if (txt.length < 2) return;

      const filtrados = productosBase.filter(
        (p) =>
          p.Nombre.toLowerCase().includes(txt) ||
          p.Codigo.toLowerCase().includes(txt),
      );
      filtrados.forEach((p) => {
        const item = document.createElement("a");
        item.href = "#";
        item.className =
          "list-group-item list-group-item-action d-flex justify-content-between align-items-center";

        const stockBadge =
          p.StockActual > 0
            ? `<span class="badge badge-success">${p.StockActual} und</span>`
            : `<span class="badge badge-danger">Sin Stock</span>`;

        item.innerHTML = `
            <div>
                <strong class="dato-critico">${p.Nombre}</strong><br>
                <small class="font-weight-bold" style="color: var(--fox-text-gray);">${p.Codigo} | S/ ${p.PrecioVenta.toFixed(2)}</small>
            </div>
            ${stockBadge}`;

        item.addEventListener("click", (eClick) => {
          eClick.preventDefault();
          if (p.StockActual > 0) {
            agregarAlCarrito(p.ProductoID);
            inputBuscarProd.value = "";
            resultDiv.innerHTML = "";
            inputBuscarProd.focus();
          }
        });
        resultDiv.appendChild(item);
      });
    });

    document.addEventListener("click", (e) => {
      if (e.target !== inputBuscarProd) resultDiv.innerHTML = "";
    });
  }

  // =======================================================
  // 3. LÓGICA DEL CARRITO
  // =======================================================
  function agregarAlCarrito(id) {
    const prod = productosBase.find((p) => p.ProductoID === id);
    if (!prod || prod.StockActual <= 0) return;

    const itemEnCarrito = carrito.find((item) => item.id === id);
    if (itemEnCarrito) {
      if (itemEnCarrito.cantidad < prod.StockActual) {
        itemEnCarrito.cantidad++;
      } else {
        return Swal.fire(
          "Límite alcanzado",
          "No hay más stock disponible.",
          "warning",
        );
      }
    } else {
      const discount = buscarDescuentoParaProducto(
        prod.ProductoID,
        prod.CategoriaID,
      );
      carrito.push({
        id: prod.ProductoID,
        nombre: prod.Nombre,
        precio: prod.PrecioVenta,
        cantidad: 1,
        stockMaximo: prod.StockActual,
        descuento: discount,
      });
    }
    actualizarVistaCarrito();
  }

  window.cambiarCantidad = (index, nuevaCantidad) => {
    const cantidadReal = parseInt(nuevaCantidad);
    if (isNaN(cantidadReal) || cantidadReal <= 0) {
      eliminarItem(index);
      return;
    }
    if (cantidadReal > carrito[index].stockMaximo) {
      Swal.fire(
        "Stock Insuficiente",
        `Solo hay ${carrito[index].stockMaximo} unidades.`,
        "warning",
      );
      carrito[index].cantidad = carrito[index].stockMaximo;
    } else {
      carrito[index].cantidad = cantidadReal;
    }
    actualizarVistaCarrito();
  };

  window.eliminarItem = (index) => {
    carrito.splice(index, 1);
    actualizarVistaCarrito();
  };

  function actualizarVistaCarrito() {
    const body = document.getElementById("posTablaCarrito");
    body.innerHTML = "";
    let total = 0;
    if (carrito.length === 0) {
      body.innerHTML = `<tr><td colspan="5" class="py-4 italic" style="color: var(--fox-text-gray);">No hay productos en el carrito.</td></tr>`;
      actualizarTotales(0);
      return;
    }

    carrito.forEach((item, index) => {
      const montoDesc = calcularMontoDescuento(
        item.descuento,
        item.precio,
        item.cantidad,
      );
      const subtotal = item.precio * item.cantidad - montoDesc;
      total += item.precio * item.cantidad;

      const precioHTML = item.descuento
        ? `<span style="text-decoration:line-through;color:#94a3b8;font-size:11px;">S/ ${item.precio.toFixed(2)}</span>
       <br><span class="dato-critico" style="color:var(--fox-green);">S/ ${(item.precio - calcularMontoDescuento(item.descuento, item.precio, 1)).toFixed(2)}</span>`
        : `<span class="font-weight-bold">S/ ${item.precio.toFixed(2)}</span>`;

      const descBadge = item.descuento
        ? `<br><span class="badge" style="background:#d1fae5;color:#065f46;font-size:9px;">
         ${item.descuento.TipoDescuento === "PORCENTAJE" ? `-${item.descuento.Valor}%` : `-S/ ${item.descuento.Valor}`}
         ${item.descuento.Nombre ? `· ${item.descuento.Nombre}` : ""}
       </span>`
        : "";

      body.innerHTML += `
    <tr>
        <td class="text-left py-2 dato-critico">${item.nombre}${descBadge}</td>
        <td>${precioHTML}</td>
        <td width="80">
            <input type="number" value="${item.cantidad}" min="1" max="${item.stockMaximo}" class="form-control form-control-sm text-center font-weight-bold" onchange="cambiarCantidad(${index}, this.value)">
        </td>
        <td class="dato-critico">S/ ${subtotal.toFixed(2)}</td>
        <td>
            <button class="btn btn-sm btn-fox-danger px-2 py-1" onclick="eliminarItem(${index})"><i class="fas fa-times"></i></button>
        </td>
    </tr>`;
    });
    actualizarTotales(total);

    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const lblCatalogo = document.getElementById("catTotalItems");
    if (lblCatalogo) lblCatalogo.textContent = totalItems;
  }

  // =======================================================
  // 4. CÁLCULOS Y CONTROL FINANCIERO DE CAJA
  // =======================================================
  let totalActualVenta = 0;

  function actualizarTotales(total) {
    totalActualVenta = total;
    let nombresDescuentosAplicados = [];

    const totalDescuento = carrito.reduce((sum, item) => {
      const monto = calcularMontoDescuento(
        item.descuento,
        item.precio,
        item.cantidad,
      );
      if (monto > 0 && item.descuento && item.descuento.Nombre) {
        if (!nombresDescuentosAplicados.includes(item.descuento.Nombre)) {
          nombresDescuentosAplicados.push(item.descuento.Nombre);
        }
      }
      return sum + monto;
    }, 0);

    const totalFinal = total - totalDescuento;
    totalActualVenta = totalFinal;

    const subtotal = totalFinal / (1 + IGV_RATE);
    const igv = totalFinal - subtotal;

    document.getElementById("posSubtotal").textContent =
      `S/ ${subtotal.toFixed(2)}`;
    document.getElementById("posIGV").textContent = `S/ ${igv.toFixed(2)}`;
    document.getElementById("posTotal").textContent =
      `S/ ${totalFinal.toFixed(2)}`;

    const filaDesc = document.getElementById("filaDescuento");
    if (filaDesc) {
      if (totalDescuento > 0) {
        filaDesc.style.display = "";
        const textoNombres =
          nombresDescuentosAplicados.length > 0
            ? `<br><small class="text-muted" style="font-size:10px;">(${nombresDescuentosAplicados.join(", ")})</small>`
            : "";
        document.getElementById("posDescuento").innerHTML =
          `-S/ ${totalDescuento.toFixed(2)}${textoNombres}`;
      } else {
        filaDesc.style.display = "none";
      }
    }
    validarCaja();
  }

  const chkPagoDividido = document.getElementById("chkPagoDividido");
  const panelPagoSimple = document.getElementById("panelPagoSimple");
  const panelPagoMixto = document.getElementById("panelPagoMixto");
  const selectMetodoPago = document.getElementById("posMetodoPago");
  const panelEfectivoSimple = document.getElementById("panelEfectivoSimple");
  const inputEfectivo = document.getElementById("posEfectivoRecibido");
  const lblVuelto = document.getElementById("posVuelto");
  const btnProcesar = document.getElementById("btnProcesarVenta");

  if (chkPagoDividido) {
    chkPagoDividido.addEventListener("change", (e) => {
      pagosMixtos = [];
      document.getElementById("listaPagosMixtos").innerHTML = "";
      document.getElementById("mixMontoInput").value = "";

      if (e.target.checked) {
        panelPagoSimple.classList.add("d-none");
        panelPagoMixto.classList.remove("d-none");
      } else {
        panelPagoSimple.classList.remove("d-none");
        panelPagoMixto.classList.add("d-none");
      }
      validarCaja();
    });
  }

  if (selectMetodoPago) {
    selectMetodoPago.addEventListener("change", (e) => {
      if (e.target.value === "EFECTIVO") {
        panelEfectivoSimple.classList.remove("d-none");
      } else {
        panelEfectivoSimple.classList.add("d-none");
        inputEfectivo.value = "";
        lblVuelto.textContent = "S/ 0.00";
      }
      validarCaja();
    });
  }

  if (inputEfectivo) inputEfectivo.addEventListener("input", validarCaja);

  const btnAgregarPagoMix = document.getElementById("btnAgregarPagoMix");
  if (btnAgregarPagoMix) {
    btnAgregarPagoMix.addEventListener("click", () => {
      const metodo = document.getElementById("mixMetodoSelect").value;
      const monto =
        parseFloat(document.getElementById("mixMontoInput").value) || 0;

      if (monto <= 0)
        return Swal.fire("Atención", "Ingresa un monto válido.", "warning");

      const existe = pagosMixtos.find((p) => p.metodo === metodo);
      if (existe) existe.monto += monto;
      else pagosMixtos.push({ metodo, monto });

      document.getElementById("mixMontoInput").value = "";
      renderizarListaPagosMixtos();
      validarCaja();
    });
  }

  function renderizarListaPagosMixtos() {
    const lista = document.getElementById("listaPagosMixtos");
    lista.innerHTML = "";
    pagosMixtos.forEach((p, idx) => {
      lista.innerHTML += `
        <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0 py-2">
          <span class="font-weight-bold text-success"><i class="fas fa-check mr-2"></i>${p.metodo}</span>
          <div>
            <span class="mr-3 font-weight-bold">S/ ${p.monto.toFixed(2)}</span>
            <button class="btn btn-sm text-danger p-0" onclick="eliminarPagoMix(${idx})"><i class="fas fa-trash-alt"></i></button>
          </div>
        </li>`;
    });
  }

  window.eliminarPagoMix = (index) => {
    pagosMixtos.splice(index, 1);
    renderizarListaPagosMixtos();
    validarCaja();
  };

  function validarCaja() {
    if (carrito.length === 0) {
      btnProcesar.disabled = true;
      return;
    }

    if (chkPagoDividido && chkPagoDividido.checked) {
      const totalIngresado = pagosMixtos.reduce((sum, p) => sum + p.monto, 0);
      const falta = totalActualVenta - totalIngresado;
      document.getElementById("lblTotalIngresadoMix").textContent =
        `S/ ${totalIngresado.toFixed(2)}`;

      if (falta > 0) {
        document.getElementById("lblFaltaMix").textContent =
          `S/ ${falta.toFixed(2)}`;
        document
          .getElementById("lblFaltaMix")
          .classList.replace("text-success", "text-danger");
        document.getElementById("zonaVueltoMix").classList.add("d-none");
        btnProcesar.disabled = true;
      } else {
        document.getElementById("lblFaltaMix").textContent = `S/ 0.00`;
        document
          .getElementById("lblFaltaMix")
          .classList.replace("text-danger", "text-success");

        const exceso = totalIngresado - totalActualVenta;
        const tieneEfectivo = pagosMixtos.some((p) => p.metodo === "EFECTIVO");

        if (exceso > 0 && tieneEfectivo) {
          document.getElementById("lblVueltoMix").textContent =
            `S/ ${exceso.toFixed(2)}`;
          document.getElementById("zonaVueltoMix").classList.remove("d-none");
        } else if (exceso > 0 && !tieneEfectivo) {
          document.getElementById("lblTotalIngresadoMix").textContent =
            `S/ ${totalIngresado.toFixed(2)} (Exceso denegado)`;
          btnProcesar.disabled = true;
          return;
        } else {
          document.getElementById("zonaVueltoMix").classList.add("d-none");
        }
        btnProcesar.disabled = false;
      }
    } else {
      const metodo = document.getElementById("posMetodoPago").value;
      if (metodo === "EFECTIVO") {
        const pagado = parseFloat(inputEfectivo.value) || 0;
        const vuelto = pagado - totalActualVenta;

        if (vuelto >= 0) {
          lblVuelto.textContent = `S/ ${vuelto.toFixed(2)}`;
          lblVuelto.classList.replace("text-danger", "text-success");
          btnProcesar.disabled = false;
        } else {
          lblVuelto.textContent = "Monto insuficiente";
          lblVuelto.classList.replace("text-success", "text-danger");
          btnProcesar.disabled = true;
        }
      } else {
        btnProcesar.disabled = false;
      }
    }

    if (esClienteNuevo) {
      const val = document.getElementById("nuevoCliNombre").value.trim();
      if (val.length < 3) btnProcesar.disabled = true;
    }
  }

  // =======================================================
  // 5. PROCESAR VENTA TRANSACCIONAL
  // =======================================================
  if (btnProcesar) {
    btnProcesar.addEventListener("click", async () => {
      const usuarioInfo = localStorage.getItem("usuarioFoxGamers");
      const usuario = JSON.parse(usuarioInfo);

      btnProcesar.disabled = true;
      btnProcesar.innerHTML =
        '<i class="fas fa-spinner fa-spin mr-2"></i> PROCESANDO...';

      let desglosePagosFinal = [];
      let metodoPagoString = "";

      if (chkPagoDividido.checked) {
        metodoPagoString = "MIXTO";
        const totalIngresado = pagosMixtos.reduce((sum, p) => sum + p.monto, 0);
        const vueltoCalculado = totalIngresado - totalActualVenta;

        pagosMixtos.forEach((p) => {
          desglosePagosFinal.push({
            metodo: p.metodo,
            montoRecibido: p.monto,
            vuelto: p.metodo === "EFECTIVO" ? vueltoCalculado : 0,
          });
        });
      } else {
        metodoPagoString = selectMetodoPago.value;
        const recibido =
          metodoPagoString === "EFECTIVO"
            ? parseFloat(inputEfectivo.value) || totalActualVenta
            : totalActualVenta;
        const vuelto =
          metodoPagoString === "EFECTIVO" ? recibido - totalActualVenta : 0;

        desglosePagosFinal.push({
          metodo: metodoPagoString,
          montoRecibido: recibido,
          vuelto: vuelto,
        });
      }

      const dataVenta = {
        ClienteID: esClienteNuevo ? null : clienteSeleccionado,
        UsuarioID: usuario.UsuarioID || usuario.id,
        MetodoPago: metodoPagoString,
        Observacion: esClienteNuevo
          ? "Venta POS + Alta de Cliente"
          : "Venta Rápida POS",
        pagos: desglosePagosFinal,
        items: carrito.map((item) => ({
          ProductoID: item.id,
          cantidad: item.cantidad,
        })),
        ClienteNuevo: esClienteNuevo
          ? {
              Documento: document.getElementById("nuevoCliDoc").value,
              NombreRazonSocial: document
                .getElementById("nuevoCliNombre")
                .value.trim(),
            }
          : null,
      };

      try {
        const res = await fetch("http://localhost:3000/api/ventas/finalizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataVenta),
        });
        const result = await res.json();

        if (result.success) {
          Swal.fire({
            icon: "success",
            title: "¡Venta Completada!",
            text: `Documento generado: ${result.NumeroDoc}`,
            timer: 2000,
            showConfirmButton: false,
          });

          carrito = [];
          clienteSeleccionado = null;
          esClienteNuevo = false;
          pagosMixtos = [];
          document.getElementById("listaPagosMixtos").innerHTML = "";
          if (inputEfectivo) inputEfectivo.value = "";
          document.getElementById("posBuscarCliente").value = "";
          document.getElementById("nuevoCliNombre").value = "";
          document
            .getElementById("posClienteSeleccionado")
            .classList.add("d-none");
          document.getElementById("panelNuevoCliente").classList.add("d-none");
          document
            .getElementById("zonaBusquedaCliente")
            .classList.remove("d-none");
          chkPagoDividido.checked = false;
          panelPagoSimple.classList.remove("d-none");
          panelPagoMixto.classList.add("d-none");

          actualizarVistaCarrito();
          await cargarProductosPOS();
          await cargarHistorialVentas();
        } else {
          Swal.fire(
            "Error",
            result.mensaje || "No se pudo procesar la venta.",
            "error",
          );
        }
      } catch (e) {
        Swal.fire(
          "Error Crítico",
          "Fallo de conexión con el servidor.",
          "error",
        );
      } finally {
        btnProcesar.innerHTML =
          '<i class="fas fa-check-circle mr-2"></i> CONFIRMAR VENTA';
        validarCaja();
      }
    });
  }

  // =======================================================
  // 6. HISTORIAL DE VENTAS (OPTIMIZADO Y CON ROMPE-CACHÉ)
  // =======================================================
  async function cargarHistorialVentas(terminoBusqueda = "") {
    const tabla = document.getElementById("tablaHistorialVentas");
    const lblModo = document.getElementById("lblModoCarga");
    if (!tabla) return;

    try {
      const urlBase =
        terminoBusqueda.trim() !== ""
          ? `${BASE_URL}/api/ventas?q=${encodeURIComponent(terminoBusqueda)}`
          : `${BASE_URL}/api/ventas`;

      const urlFresca =
        urlBase +
        (urlBase.includes("?") ? "&" : "?") +
        "t=" +
        new Date().getTime();

      const res = await fetch(urlFresca, {
        headers: { "Cache-Control": "no-cache" },
      });
      const ventas = await res.json();
      tabla.innerHTML = "";

      if (lblModo) {
        lblModo.textContent =
          terminoBusqueda.trim() !== ""
            ? `Resultados encontrados: ${ventas.length}`
            : "Mostrando últimos 5 registros";
        lblModo.className =
          terminoBusqueda.trim() !== ""
            ? "badge badge-info p-2"
            : "badge badge-secondary p-2";
      }

      if (ventas.length === 0) {
        tabla.innerHTML =
          '<tr><td colspan="9" class="py-4 italic" style="color: var(--fox-text-gray);">No se encontraron coincidencias.</td></tr>';
        return;
      }

      ventas.forEach((v) => {
        const estadoBadge =
          v.Estado === "ANULADA"
            ? '<span class="badge badge-danger">ANULADA</span>'
            : '<span class="badge badge-success">COMPLETADA</span>';
        const totalFloat = parseFloat(v.Total);
        const subtotalDesc = (totalFloat / 1.18).toFixed(2);

        tabla.innerHTML += `
            <tr>
                <td class="font-weight-bold">${v.NumeroDoc}</td>
                <td class="text-left dato-critico">${v.ClienteNombre || "CLIENTE GENERAL"}</td>
                <td>${v.FechaVenta}</td>
                <td class="font-weight-bold" style="color: var(--fox-text-gray);">${v.MetodoPago || "N/A"}</td>
                <td>S/ ${subtotalDesc}</td>
                <td>S/ 0.00</td>
                <td class="dato-critico text-fox-orange">S/ ${totalFloat.toFixed(2)}</td>
                <td>${estadoBadge}</td>
                <td>
                    <button class="btn btn-sm btn-fox-cyan mx-1" onclick="verDetalleVenta(${v.VentaID})" title="Ver Detalle"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-info mx-1" onclick="enviarTicketEmail(${v.VentaID})" title="Enviar por Correo"><i class="fas fa-envelope"></i></button>
                    <button class="btn btn-sm btn-fox-danger mx-1" onclick="anularVenta(${v.VentaID})" title="Anular Venta" ${v.Estado === "ANULADA" ? "disabled" : ""}><i class="fas fa-times-circle"></i></button>
                    <button class="btn btn-sm btn-dark mx-1" onclick="imprimirTicketHistorial(${v.VentaID})" title="Imprimir Nota de Venta"><i class="fas fa-print"></i></button>
                </td>
            </tr>`;
      });
    } catch (e) {
      tabla.innerHTML =
        '<tr><td colspan="9" class="text-danger font-weight-bold">Error al cargar historial</td></tr>';
    }
  }

  const inputHistorial = document.getElementById("inputBuscarHistorial");
  if (inputHistorial) {
    inputHistorial.addEventListener("input", (e) => {
      const valor = e.target.value;
      clearTimeout(debounceTimeoutHistorial);
      debounceTimeoutHistorial = setTimeout(() => {
        cargarHistorialVentas(valor);
      }, 400);
    });
  }

  // =======================================================
  // 7. GESTIÓN CLIENTES
  // =======================================================
  const inputBuscarCliente = document.getElementById("posBuscarCliente");
  if (inputBuscarCliente) {
    inputBuscarCliente.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const query = e.target.value.trim();
        if (!query) return;

        try {
          const res = await fetch(
            `http://localhost:3000/api/clientes/buscar?q=${query}`,
          );
          const data = await res.json();
          const tbody = document.getElementById("listaResultadosClientes");
          tbody.innerHTML = "";

          if (data && data.length > 0) {
            esClienteNuevo = false;
            document
              .getElementById("panelNuevoCliente")
              .classList.add("d-none");
            data.forEach((c) => {
              tbody.innerHTML += `
                <tr>
                    <td class="font-weight-bold">${c.Documento || "N/A"}</td>
                    <td class="dato-critico">${c.NombreRazonSocial}</td>
                    <td>
                        <button class="btn btn-sm btn-fox-cyan" onclick="seleccionarCliente(${c.ClienteID}, '${c.NombreRazonSocial.replace(/'/g, "\\'")}')">Seleccionar</button>
                    </td>
                </tr>`;
            });
            $("#modalBuscarCliente").modal("show");
          } else {
            if (!isNaN(query) && (query.length === 8 || query.length === 11)) {
              esClienteNuevo = true;
              clienteSeleccionado = null;

              const tipoDoc = query.length === 8 ? "dni" : "ruc";
              const inputNombre = document.getElementById("nuevoCliNombre");

              document.getElementById("nuevoCliDoc").value = query;
              document
                .getElementById("panelNuevoCliente")
                .classList.remove("d-none");
              document
                .getElementById("zonaBusquedaCliente")
                .classList.add("d-none");

              inputNombre.value = `Consultando ${tipoDoc.toUpperCase()} en vivo...`;
              inputNombre.disabled = true;
              if (btnProcesar) btnProcesar.disabled = true;

              try {
                const resExt = await fetch(
                  `http://localhost:3000/api/clientes/consultar/${tipoDoc}/${query}`,
                );
                const dataExt = await resExt.json();

                if (dataExt.success && dataExt.data) {
                  inputNombre.value = dataExt.data.nombreCompleto;
                } else {
                  inputNombre.value = "";
                  inputNombre.placeholder =
                    "No encontrado. Digite el nombre manualmente.";
                }
              } catch (errExt) {
                inputNombre.value = "";
                inputNombre.placeholder =
                  "Error de conexión. Digite el nombre manualmente.";
              } finally {
                inputNombre.disabled = false;
                inputNombre.focus();
                validarCaja();
              }
            } else {
              Swal.fire(
                "Atención",
                "El DNI/RUC debe tener 8 u 11 dígitos para la consulta en vivo.",
                "warning",
              );
            }
          }
        } catch (err) {
          Swal.fire(
            "Error",
            "Fallo al buscar cliente en la base de datos local.",
            "error",
          );
        }
      }
    });
  }

  const btnClienteGeneral = document.getElementById("btnClienteGeneral");
  if (btnClienteGeneral) {
    btnClienteGeneral.addEventListener("click", () => {
      clienteSeleccionado = null;
      esClienteNuevo = false;

      document.getElementById("lblNombreCliente").textContent =
        "Público General";
      document
        .getElementById("posClienteSeleccionado")
        .classList.remove("d-none");
      document.getElementById("zonaBusquedaCliente").classList.add("d-none");
      document.getElementById("panelNuevoCliente").classList.add("d-none");

      validarCaja();
    });
  }

  const btnQuitarCliente = document.getElementById("btnQuitarCliente");
  if (btnQuitarCliente) {
    btnQuitarCliente.addEventListener("click", (e) => {
      e.preventDefault();

      clienteSeleccionado = null;
      esClienteNuevo = false;

      document.getElementById("posClienteSeleccionado").classList.add("d-none");
      document.getElementById("zonaBusquedaCliente").classList.remove("d-none");
      document.getElementById("posBuscarCliente").value = "";

      validarCaja();
    });
  }

  // =======================================================
  // 8. ACCIONES DE FILTRADO, DETALLES Y MOTORES DE IMPRESIÓN
  // =======================================================
  window.imprimirTicketHistorial = async (idVenta) => {
    try {
      if (document.activeElement) document.activeElement.blur();

      const res = await fetch(`http://localhost:3000/api/ventas/${idVenta}`);
      const data = await res.json();

      if (data.success) {
        const { cabecera, detalles, pagos } = data;
        const sumaDescuentosGral = detalles.reduce(
          (acc, item) => acc + (parseFloat(item.Descuento) || 0),
          0,
        );
        const fechaLimpia = cabecera.FechaVenta.includes("T")
          ? cabecera.FechaVenta.split("T")[0]
          : cabecera.FechaVenta;

        document.getElementById("visorNumero").textContent = cabecera.NumeroDoc;
        document.getElementById("visorCliente").textContent =
          cabecera.ClienteNombre || "PÚBLICO GENERAL";
        document.getElementById("visorDocCliente").textContent =
          cabecera.ClienteDoc || "Sin Documento";
        document.getElementById("visorFecha").textContent = fechaLimpia;
        document.getElementById("visorMetodo").textContent =
          cabecera.MetodoPago;
        document.getElementById("visorVendedor").textContent =
          cabecera.UsuarioNombre || "Cajero";

        const emp = datosEmpresaGlobal || {
          NombreComercial: "FOX GAMERS",
          RUC: "20123456789",
          Direccion: "Av. Principal 123, Chiclayo - Perú",
          Telefono: "+51 961 460 326",
          Correo: "ventas@foxgamers.pe",
        };

        const visorLogo = document.getElementById("visorLogo");
        if (visorLogo) {
          const contenedorTextos = visorLogo.nextElementSibling;
          if (contenedorTextos) {
            contenedorTextos.innerHTML = `
                    <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #0A192F; letter-spacing: -0.5px; text-transform: uppercase;">${emp.NombreComercial}</h1>
                    <p style="margin: 5px 0; font-size: 12px; font-weight: 600; color: #475569;">${emp.Direccion}</p>
                    <p style="margin: 0; font-size: 12px; color: #475569;">Tel: ${emp.Telefono} | Web: ${emp.Correo}</p>
                `;
          }
        }

        const rucHeaderElement = document.querySelector(
          "#modalVistaPreviaA4 h3",
        );
        if (rucHeaderElement) {
          rucHeaderElement.textContent = `R.U.C. ${emp.RUC}`;
        }

        const tkLogo = document.getElementById("tkLogo");
        if (visorLogo && tkLogo && tkLogo.src) {
          visorLogo.src = tkLogo.src;
        }

        const visorPagosLista = document.getElementById("visorPagosLista");
        if (pagos.length > 0) {
          visorPagosLista.innerHTML = pagos
            .map(
              (p) => `
                <div style="display: flex; justify-content: space-between; gap: 15px;">
                    <span>• ${p.Metodo}:</span>
                    <span>S/ ${parseFloat(p.MontoRecibido).toFixed(2)}</span>
                </div>
                ${
                  p.Metodo === "EFECTIVO" && parseFloat(p.Vuelto) > 0
                    ? `
                <div style="display: flex; justify-content: space-between; color: #ef4444; padding-left: 10px; font-size: 11px;">
                    <span>Vuelto entregado:</span>
                    <span>-S/ ${parseFloat(p.Vuelto).toFixed(2)}</span>
                </div>`
                    : ""
                }`,
            )
            .join("");
        } else {
          visorPagosLista.innerHTML = `<div style="display: flex; justify-content: space-between;"><span>• ${cabecera.MetodoPago}:</span><span>S/ ${parseFloat(cabecera.Total).toFixed(2)}</span></div>`;
        }

        let a4Html = "";
        detalles.forEach((item) => {
          a4Html += `
            <tr style="border-bottom: 1px solid #cbd5e1;">
                <td style="padding: 10px; text-align: center; font-weight: bold;">${parseFloat(item.Cantidad).toFixed(2)}</td>
                <td style="padding: 10px; text-align: center; color: #64748b;">UND</td>
                <td style="padding: 10px; text-align: left;">
                    <strong>${item.ProductoNombre}</strong><br>
                    <small style="color: #64748b;">${item.ProductoCodigo || "N/A"}</small>
                </td>
                <td style="padding: 10px; text-align: center;">S/ ${parseFloat(item.PrecioUnitario).toFixed(2)}</td>
                <td style="padding: 10px; text-align: right; font-weight: 700; color: #0A192F;">S/ ${parseFloat(item.Subtotal).toFixed(2)}</td>
            </tr>`;
        });
        document.getElementById("visorTablaItems").innerHTML = a4Html;

        document.getElementById("visorSubtotal").textContent =
          `S/ ${parseFloat(cabecera.Subtotal).toFixed(2)}`;
        document.getElementById("visorDescuento").textContent =
          sumaDescuentosGral > 0
            ? `-S/ ${sumaDescuentosGral.toFixed(2)}`
            : `S/ 0.00`;
        document.getElementById("visorTotal").textContent =
          `S/ ${parseFloat(cabecera.Total).toFixed(2)}`;

        $("#modalVistaPreviaA4").modal("show");
      }
    } catch (e) {
      console.error(e);
      Swal.fire(
        "Error",
        "No se pudo renderizar la vista previa de la nota.",
        "error",
      );
    }
  };

  window.verDetalleVenta = async (idVenta) => {
    try {
      const res = await fetch(`http://localhost:3000/api/ventas/${idVenta}`);
      const data = await res.json();

      if (data.success) {
        const { cabecera, detalles, pagos } = data;
        const sumaDescuentosGral = detalles.reduce(
          (acc, item) => acc + (parseFloat(item.Descuento) || 0),
          0,
        );

        document.getElementById("detNumDoc").textContent = cabecera.NumeroDoc;
        document.getElementById("detComprobante").textContent =
          cabecera.NumeroDoc;
        document.getElementById("detCliente").textContent =
          cabecera.ClienteNombre || "PÚBLICO GENERAL";
        document.getElementById("detVendedor").textContent =
          cabecera.UsuarioNombre || "Cajero Default";

        const fechaLimpia = cabecera.FechaVenta.includes("T")
          ? cabecera.FechaVenta.split("T")[0]
          : cabecera.FechaVenta;
        const horaLimpia = cabecera.FechaVenta.includes("T")
          ? cabecera.FechaVenta.split("T")[1].substring(0, 5)
          : "";
        document.getElementById("detFecha").textContent =
          `${fechaLimpia} ${horaLimpia}`;
        document.getElementById("detMetodo").textContent = cabecera.MetodoPago;

        let htmlItems = "";
        detalles.forEach((item) => {
          const desc = parseFloat(item.Descuento) || 0;
          const descuentoTexto =
            desc > 0
              ? `<span class="text-danger font-weight-bold">-S/ ${desc.toFixed(2)}</span><br><small class="text-muted" style="font-size: 10px;">${item.DescuentoNombre || "Promoción"}</small>`
              : '<span class="text-muted">-</span>';
          htmlItems += `
            <tr>
                <td class="text-left">
                    <strong class="text-dark">${item.ProductoNombre}</strong><br>
                    <small class="text-muted">Cod: ${item.ProductoCodigo || "N/A"}</small>
                </td>
                <td class="font-weight-bold">${item.Cantidad}</td>
                <td class="font-weight-bold text-secondary">S/ ${parseFloat(item.PrecioUnitario).toFixed(2)}</td>
                <td>${descuentoTexto}</td>
                <td class="font-weight-bold text-dark text-right">S/ ${parseFloat(item.Subtotal).toFixed(2)}</td>
            </tr>`;
        });
        document.getElementById("detTablaItems").innerHTML = htmlItems;
        document.getElementById("detSubtotal").textContent =
          `S/ ${parseFloat(cabecera.Subtotal).toFixed(2)}`;
        document.getElementById("detTotal").textContent =
          `S/ ${parseFloat(cabecera.Total).toFixed(2)}`;

        const fDesc = document.getElementById("filaDetDescuento");
        if (sumaDescuentosGral > 0) {
          fDesc.classList.remove("d-none");
          document.getElementById("detDescTotal").textContent =
            `-S/ ${sumaDescuentosGral.toFixed(2)}`;
        } else {
          fDesc.classList.add("d-none");
        }

        const panelPagos = document.getElementById("panelDetallePagos");
        const listaPagos = document.getElementById("detListaPagos");
        if (cabecera.MetodoPago === "MIXTO" && pagos.length > 0) {
          panelPagos.classList.remove("d-none");
          listaPagos.innerHTML = pagos
            .map(
              (p) => `
            <li class="d-flex justify-content-between mb-1">
                <span>${p.Metodo}:</span> 
                <span class="text-success">S/ ${parseFloat(p.MontoRecibido).toFixed(2)}</span>
            </li>`,
            )
            .join("");

          const pagoEfectivo = pagos.find(
            (p) => p.Metodo === "EFECTIVO" && parseFloat(p.Vuelto) > 0,
          );
          if (pagoEfectivo) {
            listaPagos.innerHTML += `<li class="d-flex justify-content-between mt-2 border-top pt-1 text-danger"><span>Vuelto:</span><span>S/ ${parseFloat(pagoEfectivo.Vuelto).toFixed(2)}</span></li>`;
          }
        } else {
          panelPagos.classList.add("d-none");
        }

        document.getElementById("visorNumero").textContent = cabecera.NumeroDoc;
        document.getElementById("visorCliente").textContent =
          cabecera.ClienteNombre || "Público General";
        document.getElementById("visorDocCliente").textContent =
          cabecera.ClienteDoc || "Sin Documento";
        document.getElementById("visorFecha").textContent = fechaLimpia;
        document.getElementById("visorMetodo").textContent =
          cabecera.MetodoPago;
        document.getElementById("visorVendedor").textContent =
          cabecera.UsuarioNombre || "Cajero";

        const navBrandImg =
          document.querySelector(".brand-link img") ||
          document.querySelector("img");
        const visorLogo = document.getElementById("visorLogo");
        if (visorLogo && navBrandImg) visorLogo.src = navBrandImg.src;

        const visorPagosLista = document.getElementById("visorPagosLista");
        if (pagos.length > 0) {
          visorPagosLista.innerHTML = pagos
            .map(
              (p) => `
                <div style="display: flex; justify-content: space-between; gap: 15px;">
                    <span>• ${p.Metodo}:</span>
                    <span>S/ ${parseFloat(p.MontoRecibido).toFixed(2)}</span>
                </div>
                ${
                  p.Metodo === "EFECTIVO" && parseFloat(p.Vuelto) > 0
                    ? `
                <div style="display: flex; justify-content: space-between; color: #ef4444; padding-left: 10px; font-size: 11px;">
                    <span>Vuelto entregado:</span>
                    <span>-S/ ${parseFloat(p.Vuelto).toFixed(2)}</span>
                </div>`
                    : ""
                }`,
            )
            .join("");
        } else {
          visorPagosLista.innerHTML = `<div style="display: flex; justify-content: space-between;"><span>• ${cabecera.MetodoPago}:</span><span>S/ ${parseFloat(cabecera.Total).toFixed(2)}</span></div>`;
        }

        let a4Html = "";
        detalles.forEach((item) => {
          const etiquetaDesc =
            parseFloat(item.Descuento) > 0
              ? `<br><span style="color: #ef4444; font-size: 10px; font-weight: 600;">(Aplica: ${item.DescuentoNombre || "Promoción"})</span>`
              : "";

          a4Html += `
            <tr style="border-bottom: 1px solid #cbd5e1;">
                <td style="padding: 10px; text-align: center; font-weight: bold;">${parseFloat(item.Cantidad).toFixed(2)}</td>
                <td style="padding: 10px; text-align: center; color: #64748b;">UND</td>
                <td style="padding: 10px; text-align: left;">
                    <strong>${item.ProductoNombre}</strong><br>
                    <small style="color: #64748b;">${item.ProductoCodigo || "N/A"}</small>
                    ${etiquetaDesc}
                </td>
                <td style="padding: 10px; text-align: center;">S/ ${parseFloat(item.PrecioUnitario).toFixed(2)}</td>
                <td style="padding: 10px; text-align: right; font-weight: 700; color: #0A192F;">S/ ${parseFloat(item.Subtotal).toFixed(2)}</td>
            </tr>`;
        });
        document.getElementById("visorTablaItems").innerHTML = a4Html;

        document.getElementById("visorSubtotal").textContent =
          `S/ ${parseFloat(cabecera.Subtotal).toFixed(2)}`;
        document.getElementById("visorDescuento").textContent =
          sumaDescuentosGral > 0
            ? `-S/ ${sumaDescuentosGral.toFixed(2)}`
            : `S/ 0.00`;
        document.getElementById("visorTotal").textContent =
          `S/ ${parseFloat(cabecera.Total).toFixed(2)}`;

        // document.getElementById("btnReimprimirA4").onclick = () => {
        //   if (document.activeElement) document.activeElement.blur();
        //   $("#modalDetalleVenta").modal("hide");
        //   setTimeout(() => {
        //     $("#modalVistaPreviaA4").modal("show");
        //   }, 400);
        // };

        document.getElementById("btnImprimirA4Final").onclick = () => {
          document.body.classList.add("print-a4");
          window.print();
          setTimeout(() => {
            document.body.classList.remove("print-a4");
          }, 600);
        };

        $("#modalDetalleVenta").modal("show");
      }
    } catch (e) {
      console.error(e);
      Swal.fire(
        "Error",
        "Problemas al armar el desglose del detalle.",
        "error",
      );
    }
  };

  // =======================================================
  // 9. FUNCIONES SECUNDARIAS
  // =======================================================
  window.anularVenta = async (idVenta) => {
    const confirmacion = await Swal.fire({
      title: "¿Confirmar Anulación?",
      text: "Los productos retornarán al Kardex.",
      icon: "warning",
      showCancelButton: true,
    });
    if (confirmacion.isConfirmed) {
      const usuario = JSON.parse(localStorage.getItem("usuarioFoxGamers"));
      try {
        const res = await fetch(
          `http://localhost:3000/api/ventas/anular/${idVenta}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              UsuarioID: usuario.UsuarioID || usuario.id,
            }),
          },
        );
        const result = await res.json();
        if (result.success) {
          Swal.fire("¡Anulado!", result.mensaje, "success");
          cargarHistorialVentas();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  window.seleccionarCliente = (id, nombre) => {
    clienteSeleccionado = id;
    esClienteNuevo = false;
    document.getElementById("lblNombreCliente").textContent = nombre;
    document
      .getElementById("posClienteSeleccionado")
      .classList.remove("d-none");
    document.getElementById("zonaBusquedaCliente").classList.add("d-none");
    $("#modalBuscarCliente").modal("hide");
    validarCaja();
  };

  const btnCatalogo = document.getElementById("btnAbrirCatalogo");
  if (btnCatalogo) {
    btnCatalogo.addEventListener("click", () => {
      renderizarCatalogo();
      $("#modalCatalogo").modal("show");
    });
  }

  function renderizarCatalogo() {
    const grid = document.getElementById("gridCatalogoProductos");
    grid.innerHTML = "";
    productosBase.forEach((p) => {
      let stockBadge =
        p.StockActual <= 0
          ? '<span class="badge badge-danger mb-2">Agotado</span>'
          : '<span class="badge badge-success mb-2">Disponible</span>';
      let btnAgregar =
        p.StockActual <= 0
          ? '<button class="btn btn-secondary btn-block font-weight-bold" disabled>Agotado</button>'
          : `<button class="btn btn-fox-success btn-block" onclick="agregarDesdeCatalogo(${p.ProductoID})"><i class="fas fa-cart-plus"></i> Agregar</button>`;
      const imgUrl =
        p.ImagenURL && p.ImagenURL.trim() !== ""
          ? getUrl(p.ImagenURL)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.Nombre.charAt(0))}&background=f1f5f9&color=1e293b&size=150`;
      grid.innerHTML += `
        <div class="col-xl-3 col-lg-4 col-md-6 mb-4">
            <div class="card h-100 border shadow-sm" style="border-radius: 12px; overflow: hidden; ${p.StockActual <= 0 ? "opacity: 0.6;" : ""}">
                <img src="${imgUrl}" class="card-img-top border-bottom" style="height: 140px; object-fit: contain; padding: 10px;">
                <div class="card-body p-3 d-flex flex-column">
                    <div>${stockBadge}</div>
                    <h6 class="dato-critico mt-2 mb-1">${p.Nombre}</h6>
                    <small class="d-block mb-3 border-bottom pb-2" style="color: var(--fox-text-gray);">Cod: ${p.Codigo}</small>
                    <div class="mt-auto">
                        <h4 class="dato-critico mb-1">S/ ${parseFloat(p.PrecioVenta).toFixed(2)}</h4>
                        <div class="small font-weight-bold mb-3" style="color: var(--fox-text-gray);">Stock: ${p.StockActual}</div>
                        ${btnAgregar}
                    </div>
                </div>
            </div>
        </div>`;
    });
  }

  window.agregarDesdeCatalogo = (id) => {
    agregarAlCarrito(id);
    const lblCatalogo = document.getElementById("catTotalItems");
    lblCatalogo.classList.add("animate__animated", "animate__rubberBand");
    setTimeout(() => {
      lblCatalogo.classList.remove("animate__animated", "animate__rubberBand");
    }, 1000);
  };

  // =======================================================
  // 10. ENVÍO DE TICKET POR CORREO ELECTRÓNICO
  // =======================================================
  window.enviarTicketEmail = async (idVenta) => {
    const { value: email } = await Swal.fire({
      title: "Enviar Comprobante",
      input: "email",
      inputLabel: "Correo electrónico del cliente",
      showCancelButton: true,
      confirmButtonColor: "#0ea5e9",
      confirmButtonText: '<i class="fas fa-paper-plane mr-1"></i> Enviar',
      cancelButtonText: "Cancelar",
      inputPlaceholder: "ejemplo@correo.com",
      customClass: { confirmButton: "btn btn-fox-cyan" },
    });

    if (email) {
      Swal.fire({
        title: "Enviando...",
        text: "Despachando correo al servidor.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      try {
        const res = await fetch(
          `${BASE_URL}/api/ventas/enviar-ticket/${idVenta}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ correoDestino: email }),
          },
        );

        const result = await res.json();

        if (result.success) {
          Swal.fire("¡Enviado!", result.mensaje, "success");
        } else {
          Swal.fire("Error", result.mensaje, "error");
        }
      } catch (error) {
        Swal.fire(
          "Error de Conexión",
          "No se pudo comunicar con el servidor de correo.",
          "error",
        );
      }
    }
  };
})();
