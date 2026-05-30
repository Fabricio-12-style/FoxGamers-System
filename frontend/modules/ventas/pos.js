(() => {
  let carrito = [];
  let productosBase = [];
  let clienteSeleccionado = null;

  const IGV_RATE = 0.18; 

  // =======================================================
  // 1. INICIALIZACIÓN
  // =======================================================
  (async function init() {
    if (!localStorage.getItem("usuarioFoxGamers")) {
      return (window.location.href = "../../login/login.html");
    }
    await cargarProductosPOS();
  })();

  // =======================================================
  // 2. BUSCADOR INTELIGENTE DE PRODUCTOS
  // =======================================================
  async function cargarProductosPOS() {
    try {
      const res = await fetch("http://localhost:3000/api/productos");
      const productos = await res.json();
      productosBase = productos.filter(
        (p) => p.Activo === true || p.Activo === 1,
      );
    } catch (error) {
      console.error("Error cargando productos al POS:", error);
    }
  }

  const inputBuscarProd = document.getElementById("posBuscarProducto");
  if (inputBuscarProd) {
    // Creamos un contenedor flotante para los resultados
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
          "list-group-item list-group-item-action list-group-item-dark d-flex justify-content-between align-items-center";

        const stockBadge =
          p.StockActual > 0
            ? `<span class="badge badge-success badge-pill">${p.StockActual} und</span>`
            : `<span class="badge badge-danger badge-pill">Sin Stock</span>`;

        item.innerHTML = `
                    <div>
                        <strong class="text-white">${p.Nombre}</strong><br>
                        <small class="text-info">${p.Codigo} | S/ ${p.PrecioVenta.toFixed(2)}</small>
                    </div>
                    ${stockBadge}
                `;

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

    // Ocultar resultados al hacer click fuera
    document.addEventListener("click", (e) => {
      if (e.target !== inputBuscarProd) resultDiv.innerHTML = "";
    });
  }

  // =======================================================
  // 3. LÓGICA DEL CARRITO DE COMPRAS
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
      carrito.push({
        id: prod.ProductoID,
        nombre: prod.Nombre,
        precio: prod.PrecioVenta,
        cantidad: 1,
        stockMaximo: prod.StockActual,
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
      body.innerHTML =
        '<tr><td colspan="5" class="text-muted py-4 italic">No hay productos en el carrito.</td></tr>';
      actualizarTotales(0);
      return;
    }

    carrito.forEach((item, index) => {
      const subtotal = item.precio * item.cantidad;
      total += subtotal;
      body.innerHTML += `
                <tr style="border-bottom: 1px solid #334155;">
                    <td class="text-left py-2 font-weight-bold" style="font-size: 0.9rem;">${item.nombre}</td>
                    <td class="text-info font-weight-bold">S/ ${item.precio.toFixed(2)}</td>
                    <td width="80">
                        <input type="number" value="${item.cantidad}" min="1" max="${item.stockMaximo}" 
                            class="form-control form-control-sm bg-dark text-white border-info text-center" 
                            onchange="cambiarCantidad(${index}, this.value)">
                    </td>
                    <td class="font-weight-bold">S/ ${subtotal.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-sm text-danger" onclick="eliminarItem(${index})"><i class="fas fa-times-circle"></i></button>
                    </td>
                </tr>`;
    });
    actualizarTotales(total);
  }

  // =======================================================
  // 4. CÁLCULOS FINANCIEROS Y VUELTO
  // =======================================================
  let totalActualVenta = 0;

  function actualizarTotales(total) {
    totalActualVenta = total;
    const subtotal = total / (1 + IGV_RATE);
    const igv = total - subtotal;

    document.getElementById("posSubtotal").textContent =
      `S/ ${subtotal.toFixed(2)}`;
    document.getElementById("posIGV").textContent = `S/ ${igv.toFixed(2)}`;
    document.getElementById("posTotal").textContent = `S/ ${total.toFixed(2)}`;

    validarCaja();
  }

  const selectMetodoPago = document.getElementById("posMetodoPago");
  const inputEfectivo = document.getElementById("posEfectivoRecibido");
  const panelEfectivo = document.getElementById("panelEfectivo");
  const lblVuelto = document.getElementById("posVuelto");
  const btnProcesar = document.getElementById("btnProcesarVenta");

  if (selectMetodoPago) {
    selectMetodoPago.addEventListener("change", (e) => {
      if (e.target.value === "EFECTIVO") {
        panelEfectivo.classList.remove("d-none");
      } else {
        panelEfectivo.classList.add("d-none");
        inputEfectivo.value = "";
        lblVuelto.textContent = "S/ 0.00";
      }
      validarCaja();
    });
  }

  if (inputEfectivo) {
    inputEfectivo.addEventListener("input", validarCaja);
  }

  function validarCaja() {
    if (carrito.length === 0) {
      btnProcesar.disabled = true;
      return;
    }

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
      btnProcesar.disabled = false; // Otros métodos asumen pago exacto
    }
  }

  // =======================================================
  // 5. PROCESAR VENTA FINAL
  // =======================================================
  if (btnProcesar) {
    btnProcesar.addEventListener("click", async () => {
      const usuarioInfo = localStorage.getItem("usuarioFoxGamers");
      const usuario = JSON.parse(usuarioInfo);

      btnProcesar.disabled = true;
      btnProcesar.innerHTML =
        '<i class="fas fa-spinner fa-spin mr-2"></i> PROCESANDO...';

      const dataVenta = {
        ClienteID: clienteSeleccionado,
        UsuarioID: usuario.UsuarioID || usuario.id,
        NumeroDoc: "TK-" + Date.now().toString().slice(-6),
        MetodoPago: document.getElementById("posMetodoPago").value,
        Observacion: "Venta Rápida POS",
        items: carrito.map((item) => ({
          ProductoID: item.id,
          cantidad: item.cantidad,
        })),
      };

      try {
        const res = await fetch("http://localhost:3000/api/ventas/finalizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataVenta),
        });
        const result = await res.json();
        if (result.success) {
          document.getElementById("tkNumero").textContent = dataVenta.NumeroDoc;
          document.getElementById("tkFecha").textContent =
            new Date().toLocaleString("es-PE");

          const nombreCliente = document
            .getElementById("posClienteSeleccionado")
            .classList.contains("d-none")
            ? "CLIENTE GENERAL"
            : document.getElementById("lblNombreCliente").textContent;
          document.getElementById("tkCliente").textContent = nombreCliente;
          document.getElementById("tkMetodo").textContent =
            dataVenta.MetodoPago;

          let htmlItems = "";
          carrito.forEach((item) => {
            const subtotalItem = (item.precio * item.cantidad).toFixed(2);
            htmlItems += `
                            <div style="display: flex; font-size: 11px; margin-bottom: 5px;">
                                <div style="width: 15%;">${item.cantidad}</div>
                                <div style="width: 60%; padding-right: 5px;">${item.nombre}</div>
                                <div style="width: 25%; text-align: right;">${subtotalItem}</div>
                            </div>
                        `;
          });
          document.getElementById("tkItems").innerHTML = htmlItems;

          document.getElementById("tkSubtotal").textContent = (
            totalActualVenta / 1.18
          ).toFixed(2);
          document.getElementById("tkIGV").textContent = (
            totalActualVenta -
            totalActualVenta / 1.18
          ).toFixed(2);
          document.getElementById("tkTotal").textContent =
            totalActualVenta.toFixed(2);

          window.print();

          Swal.fire({
            icon: "success",
            title: "¡Venta Completada!",
            text: `Ticket impreso: ${dataVenta.NumeroDoc}`,
            timer: 2000,
            showConfirmButton: false,
          });

          carrito = [];
          clienteSeleccionado = null;
          if (inputEfectivo) inputEfectivo.value = "";
          document.getElementById("posBuscarCliente").value = "";
          document
            .getElementById("posClienteSeleccionado")
            .classList.add("d-none");
          actualizarVistaCarrito();
          cargarProductosPOS();
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
          '<i class="fas fa-check-circle mr-2"></i> COBRAR';
        validarCaja();
      }
    });
  }

  // =======================================================
  // 6. CLIENTE (Búsqueda Rápida)
  // =======================================================
  const btnClienteGral = document.getElementById("btnClienteGeneral");
  if (btnClienteGral) {
    btnClienteGral.addEventListener("click", () => {
      clienteSeleccionado = null;
      document.getElementById("lblNombreCliente").textContent =
        "CLIENTES VARIOS (SIN DOC)";
      document
        .getElementById("posClienteSeleccionado")
        .classList.remove("d-none");
    });
  }
})();

// =======================================================
// 7. CARGAR HISTORIAL DE VENTAS DEL DÍA
// =======================================================
async function cargarHistorialVentas() {
  const tabla = document.getElementById("tablaHistorialVentas");
  try {
    const res = await fetch("http://localhost:3000/api/ventas");
    const ventas = await res.json();
    tabla.innerHTML = "";

    if (ventas.length === 0) {
      tabla.innerHTML =
        '<tr><td colspan="7" class="text-muted py-4">No hay ventas hoy.</td></tr>';
      return;
    }

    ventas.forEach((v) => {
      tabla.innerHTML += `
                <tr>
                    <td>${v.NumeroDoc}</td>
                    <td class="text-left">${v.ClienteNombre || "Sin Cliente"}</td>
                    <td>${v.FechaVenta}</td>
                    <td>${v.MetodoPago}</td>
                    <td class="font-weight-bold">S/ ${parseFloat(v.Total).toFixed(2)}</td>
                    <td><span class="badge badge-success">COMPLETADA</span></td>
                    <td><button class="btn btn-sm btn-info"><i class="fas fa-eye"></i></button></td>
                </tr>
            `;
    });
  } catch (e) {
    tabla.innerHTML =
      '<tr><td colspan="7" class="text-danger">Error al cargar historial</td></tr>';
  }
}
