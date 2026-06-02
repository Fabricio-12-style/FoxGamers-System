(() => {
  let carrito = [];
  let productosBase = [];
  let clienteSeleccionado = null;

  const IGV_RATE = 0.18; // 18%

  // =======================================================
  // 1. INICIALIZACIÓN
  // =======================================================
  (async function init() {
    if (!localStorage.getItem("usuarioFoxGamers")) {
      return (window.location.href = "../../login/login.html");
    }
    await cargarProductosPOS();
    await cargarHistorialVentas(); // Llenamos la tabla principal al entrar
  })();

  // =======================================================
  // 2. BUSCADOR DE PRODUCTOS
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

    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const lblCatalogo = document.getElementById("catTotalItems");
    if (lblCatalogo) lblCatalogo.textContent = totalItems;
  }

  // =======================================================
  // 4. CÁLCULOS Y PAGOS
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

  if (inputEfectivo) inputEfectivo.addEventListener("input", validarCaja);

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
      btnProcesar.disabled = false;
    }
  }

  // =======================================================
  // 5. PROCESAR VENTA (SIN IMPRESIÓN AUTOMÁTICA)
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
          Swal.fire({
            icon: "success",
            title: "¡Venta Completada!",
            text: `Documento generado: ${dataVenta.NumeroDoc}`,
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
          '<i class="fas fa-check-circle mr-2"></i> COBRAR';
        validarCaja();
      }
    });
  }

  // =======================================================
  // 6. HISTORIAL DE VENTAS CON NUEVOS BOTONES
  // =======================================================
  async function cargarHistorialVentas() {
    const tabla = document.getElementById("tablaHistorialVentas");
    try {
      const res = await fetch("http://localhost:3000/api/ventas");
      if (!res.ok) throw new Error("Error en red");
      const ventas = await res.json();
      tabla.innerHTML = "";

      if (ventas.length === 0) {
        tabla.innerHTML =
          '<tr><td colspan="9" class="text-muted py-4">No hay ventas registradas hoy.</td></tr>';
        return;
      }

      ventas.forEach((v) => {
        const estadoBadge =
          v.Estado === "ANULADA"
            ? '<span class="badge badge-danger px-2 py-1">ANULADA</span>'
            : '<span class="badge badge-success px-2 py-1">COMPLETADA</span>';

        const totalFloat = parseFloat(v.Total);
        const subtotalDesc = (totalFloat / 1.18).toFixed(2);

        tabla.innerHTML += `
                <tr>
                    <td class="font-weight-bold">${v.NumeroDoc}</td>
                    <td class="text-left small font-weight-bold">${v.ClienteNombre || "Sin Cliente"}</td>
                    <td class="small">${v.FechaVenta}</td>
                    <td class="small font-weight-bold text-muted">${v.MetodoPago || "N/A"}</td>
                    <td class="small">S/ ${subtotalDesc}</td>
                    <td class="small">S/ 0.00</td>
                    <td class="font-weight-bold" style="color: var(--fox-cyan);">S/ ${totalFloat.toFixed(2)}</td>
                    <td>${estadoBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-info shadow-sm" onclick="verDetalleVenta(${v.VentaID})" title="Ver Detalle">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger shadow-sm mx-1" onclick="anularVenta(${v.VentaID})" title="Anular Venta" ${v.Estado === "ANULADA" ? "disabled" : ""}>
                            <i class="fas fa-times-circle"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary shadow-sm" onclick="imprimirTicketHistorial(${v.VentaID})" title="Imprimir Ticket">
                            <i class="fas fa-print"></i>
                        </button>
                    </td>
                </tr>
            `;
      });
    } catch (e) {
      tabla.innerHTML =
        '<tr><td colspan="9" class="text-danger font-weight-bold">Error al cargar historial</td></tr>';
    }
  }

  // =======================================================
  // 7. BÚSQUEDA Y SELECCIÓN DE CLIENTE
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
          if (!res.ok) throw new Error("Fallo la búsqueda");
          const data = await res.json();

          const tbody = document.getElementById("listaResultadosClientes");
          tbody.innerHTML = "";

          if (data && data.length > 0) {
            data.forEach((c) => {
              tbody.innerHTML += `
                                <tr>
                                    <td>${c.Documento || "N/A"}</td>
                                    <td>${c.NombreRazonSocial}</td>
                                    <td>
                                        <button class="btn btn-sm btn-info" onclick="seleccionarCliente(${c.ClienteID}, '${c.NombreRazonSocial.replace(/'/g, "\\'")}')">
                                            Seleccionar
                                        </button>
                                    </td>
                                </tr>
                            `;
            });
            $("#modalBuscarCliente").modal("show");
          } else {
            Swal.fire("No encontrado", "Cliente no registrado.", "warning");
          }
        } catch (err) {
          console.error("Error buscando cliente:", err);
          Swal.fire(
            "Error",
            "Fallo al buscar cliente en el servidor.",
            "error",
          );
        }
      }
    });
  }

  // =======================================================
  // ACCIONES DE TABLA: IMPRIMIR, ANULAR, DETALLE
  // =======================================================

  window.imprimirTicketHistorial = async (idVenta) => {
    try {
      const res = await fetch(`http://localhost:3000/api/ventas/${idVenta}`);
      const data = await res.json();

      if (data.success) {
        const cabecera = data.cabecera;
        const detalles = data.detalles;

        document.getElementById("tkNumero").textContent = cabecera.NumeroDoc;
        document.getElementById("tkFecha").textContent = cabecera.FechaVenta;
        document.getElementById("tkFechaPie").textContent =
          new Date().toLocaleDateString("es-PE");
        document.getElementById("tkVendedor").textContent =
          cabecera.UsuarioNombre || "Cajero";
        document.getElementById("tkCliente").textContent =
          cabecera.ClienteNombre || "CLIENTE GENERAL";
        document.getElementById("tkMetodo").textContent = cabecera.MetodoPago;

        let htmlItems = "";
        detalles.forEach((item) => {
          htmlItems += `
                    <div style="display: flex; margin-bottom: 3px;">
                        <div style="width: 15%;">${item.Cantidad}</div>
                        <div style="width: 55%; padding-right: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${item.ProductoNombre}
                        </div>
                        <div style="width: 30%; text-align: right;">S/ ${parseFloat(item.Subtotal).toFixed(2)}</div>
                    </div>
                `;
        });
        document.getElementById("tkItems").innerHTML = htmlItems;

        document.getElementById("tkSubtotal").textContent = parseFloat(
          cabecera.Subtotal,
        ).toFixed(2);
        document.getElementById("tkIGV").textContent = parseFloat(
          cabecera.IGV,
        ).toFixed(2);
        document.getElementById("tkTotal").textContent = parseFloat(
          cabecera.Total,
        ).toFixed(2);

        window.print();
      } else {
        Swal.fire(
          "Error",
          "No se pudo recuperar la información del ticket.",
          "error",
        );
      }
    } catch (e) {
      console.error("Error al imprimir ticket del historial:", e);
      Swal.fire("Error", "Problemas de conexión con el servidor.", "error");
    }
  };

  window.verDetalleVenta = async (idVenta) => {
    try {
      const res = await fetch(`http://localhost:3000/api/ventas/${idVenta}`);
      const data = await res.json();

      if (data.success) {
        const cabecera = data.cabecera;
        const detalles = data.detalles;

        document.getElementById("detNumDoc").textContent = cabecera.NumeroDoc;
        document.getElementById("detCliente").textContent =
          cabecera.ClienteNombre || "CLIENTE GENERAL";
        document.getElementById("detVendedor").textContent =
          cabecera.UsuarioNombre || "Cajero";

        const fechaLimpia = cabecera.FechaVenta.includes("T")
          ? cabecera.FechaVenta.split("T")[0]
          : cabecera.FechaVenta;
        document.getElementById("detFecha").textContent = fechaLimpia;
        document.getElementById("detMetodo").textContent = cabecera.MetodoPago;

        let htmlItems = "";
        detalles.forEach((item) => {
          htmlItems += `
                    <tr>
                        <td class="text-left">${item.ProductoNombre}</td>
                        <td class="text-info">S/ ${parseFloat(item.PrecioUnitario).toFixed(2)}</td>
                        <td>${item.Cantidad}</td>
                        <td class="text-right font-weight-bold">S/ ${parseFloat(item.Subtotal).toFixed(2)}</td>
                    </tr>
                `;
        });
        document.getElementById("detTablaItems").innerHTML = htmlItems;

        document.getElementById("detSubtotal").textContent =
          `S/ ${parseFloat(cabecera.Subtotal).toFixed(2)}`;
        document.getElementById("detIGV").textContent =
          `S/ ${parseFloat(cabecera.IGV).toFixed(2)}`;
        document.getElementById("detTotal").textContent =
          `S/ ${parseFloat(cabecera.Total).toFixed(2)}`;

        document.getElementById("btnReimprimirDesdeDetalle").onclick = () => {
          $("#modalDetalleVenta").modal("hide");
          setTimeout(() => window.imprimirTicketHistorial(idVenta), 500);
        };

        $("#modalDetalleVenta").modal("show");
      } else {
        Swal.fire(
          "Error",
          "No se pudo recuperar la información del ticket.",
          "error",
        );
      }
    } catch (e) {
      console.error("Error al ver detalle de venta:", e);
      Swal.fire("Error", "Problemas de conexión con el servidor.", "error");
    }
  };

  window.anularVenta = async (idVenta) => {
    const confirmacion = await Swal.fire({
      title: "¿Confirmar Anulación?",
      text: "Los productos retornarán al Kardex automáticamente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, Anular",
      cancelButtonText: "Cancelar",
    });

    if (confirmacion.isConfirmed) {
      const usuarioInfo = localStorage.getItem("usuarioFoxGamers");
      const usuario = JSON.parse(usuarioInfo);

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
        } else {
          Swal.fire("Error", result.mensaje, "error");
        }
      } catch (e) {
        Swal.fire("Error", "Fallo de conexión con el servidor.", "error");
      }
    }
  };

  window.seleccionarCliente = (id, nombre) => {
    clienteSeleccionado = id;
    document.getElementById("lblNombreCliente").textContent = nombre;
    document
      .getElementById("posClienteSeleccionado")
      .classList.remove("d-none");
    $("#modalBuscarCliente").modal("hide");
  };

  // =======================================================
  // 8. CATÁLOGO VISUAL DE PRODUCTOS
  // =======================================================
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
      let stockBadge = "";
      let btnAgregar = "";
      const colorCard = p.StockActual <= 0 ? "opacity: 0.6;" : "";

      if (p.StockActual <= 0) {
        stockBadge =
          '<span class="badge badge-secondary px-2 py-1 mb-2">Agotado</span>';
        btnAgregar =
          '<button class="btn btn-secondary btn-block font-weight-bold" disabled>Agotado</button>';
      } else if (p.StockActual < 5) {
        stockBadge =
          '<span class="badge badge-warning text-dark px-2 py-1 mb-2">Pocas unidades</span>';
        btnAgregar = `<button class="btn btn-success btn-block font-weight-bold" onclick="agregarDesdeCatalogo(${p.ProductoID})" style="background-color: #10b981;"><i class="fas fa-cart-plus"></i> Agregar</button>`;
      } else {
        stockBadge =
          '<span class="badge badge-success px-2 py-1 mb-2" style="background-color: #10b981;">Disponible</span>';
        btnAgregar = `<button class="btn btn-success btn-block font-weight-bold" onclick="agregarDesdeCatalogo(${p.ProductoID})" style="background-color: #10b981;"><i class="fas fa-cart-plus"></i> Agregar</button>`;
      }
      let imgUrl = "";

      if (p.Imagen && p.Imagen.trim() !== "") {
        imgUrl = `http://localhost:3000/uploads/productos/${p.Imagen}`;

        imgUrl = p.Imagen;
      } else {
        const inicial = p.Nombre.charAt(0).toUpperCase();
        imgUrl = `https://ui-avatars.com/api/?name=${inicial}&background=334155&color=64ffda&size=150&font-size=0.6`;
      }

      grid.innerHTML += `
            <div class="col-xl-3 col-lg-4 col-md-6 mb-4">
                <div class="card h-100 border-0 shadow-sm" style="background-color: var(--fox-card); border-radius: 12px; overflow: hidden; ${colorCard}">
                    <img src="${imgUrl}" class="card-img-top" style="height: 140px; object-fit: contain; background-color: #1e293b; padding: 10px;" onerror="this.src='https://ui-avatars.com/api/?name=${p.Nombre.charAt(0).toUpperCase()}&background=334155&color=64ffda&size=150&font-size=0.6'">
                    <div class="card-body p-3 d-flex flex-column text-white">
                        <div>${stockBadge}</div>
                        <h6 class="font-weight-bold mt-1 mb-2" style="font-size: 0.95rem; line-height: 1.2;">${p.Nombre}</h6>
                        <small class="text-muted d-block mb-3 border-bottom border-secondary pb-2">Cod: ${p.Codigo}</small>
                        <div class="mt-auto">
                            <h4 class="font-weight-bold mb-1" style="color: var(--fox-cyan);">S/ ${parseFloat(p.PrecioVenta).toFixed(2)}</h4>
                            <div class="text-muted small mb-3">Stock: ${p.StockActual}</div>
                            ${btnAgregar}
                        </div>
                    </div>
                </div>
            </div>
        `;
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
})();
