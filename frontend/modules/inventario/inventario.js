(() => {
  let listaInventarioGlobal = [];
  const placeholderImg = "https://placehold.co/50x50/1e293b/00f2ff?text=Fox";

  listarInventario();

  async function listarInventario() {
    try {
      const res = await fetch("http://localhost:3000/api/productos");
      listaInventarioGlobal = await res.json();
      renderizarTabla(listaInventarioGlobal);
    } catch (e) {
      console.error("Error cargando inventario:", e);
    }
  }

  function renderizarTabla(datos) {
    const tabla = document.getElementById("tablaInventario");
    if (!tabla) return;
    tabla.innerHTML = "";

    datos.forEach((p) => {
      const esBajoStock = p.StockActual <= p.StockMinimo;
      const rowStyle = p.Activo
        ? ""
        : "opacity: 0.6; filter: grayscale(1); background-color: #f8f9fa;";

      const urlImagen = p.ImagenURL
        ? `http://localhost:3000${p.ImagenURL}`
        : placeholderImg;

      tabla.innerHTML += `
                <tr style="${rowStyle}">
                    <td>
                        <img src="${urlImagen}" onerror="this.src='${placeholderImg}'" style="height: 40px; width: 40px; object-fit: contain; border-radius: 4px; background: #fff; padding: 2px; border: 1px solid #dee2e6;">
                    </td>
                    <td class="text-left font-weight-bold" style="color: var(--fox-dark);">${p.ModeloBase || "Sin especificar"}</td>
                    <td class="text-left">
                        <div style="color: #000; padding: 6px 12px; border-radius: 4px; border-left: 4px solid var(--fox-dark); display: inline-block; min-width: 160px;">
                            <small class="d-block font-weight-bold" style="font-size: 0.65rem; opacity: 0.7;">${p.NombreCategoria || "GENERAL"}</small>
                            <strong style="font-size: 0.85rem;">${p.Atributo || "ESTÁNDAR"}</strong>
                        </div>
                    </td>
                    <td class="font-weight-bold ${esBajoStock && p.Activo ? "text-danger blink" : ""}" style="color: var(--fox-dark);">${p.StockActual}</td>
                    <td class="font-weight-bold ${esBajoStock && p.Activo ? "text-danger blink" : ""}" style="color: var(--fox-dark);">${p.StockMinimo}</td>
                    <td class="font-weight-bold" style="color: var(--fox-dark);">S/ ${parseFloat(p.PrecioCompra || 0).toFixed(2)}</td>
                    <td class="font-weight-bold" style="color: var(--fox-dark);">S/ ${parseFloat(p.PrecioVenta || 0).toFixed(2)}</td>
                    <td><span class="badge ${esBajoStock ? "badge-danger" : "badge-success"}">${esBajoStock ? "Reabastecer" : "En Stock"}</span></td>
                    <td>
                        <div class="btn-group">
                            <button onclick="abrirAjuste(${p.ProductoID})" class="btn btn-sm btn-info mx-1 shadow-sm" style="border-radius: 4px; width: 34px; height: 34px;" title="Ajuste de Stock" ${!p.Activo ? "disabled" : ""}>
                                <i class="fas fa-exchange-alt"></i>
                            </button>
                            <button onclick="verKardex(${p.ProductoID})" class="btn btn-sm btn-fox mx-1 shadow-sm" style="border-radius: 4px; width: 34px; height: 34px;" title="Ver Historial">
                                <i class="fas fa-history"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
    });
  }
  // ABRIR MODAL DE AJUSTE
  window.abrirAjuste = (id) => {
    const p = listaInventarioGlobal.find((item) => item.ProductoID === id);
    const form = document.getElementById("formAjusteStock");
    const lbl = document.getElementById("lblProductoAjuste");
    const lblStock = document.getElementById("lblStockActualAjuste"); // Referencia añadida para claridad visual

    if (!p || !form || !lbl) return;

    form.dataset.id = id;
    lbl.textContent = p.Nombre;
    if (lblStock) lblStock.textContent = p.StockActual; // Mostramos el stock actual al abrir

    form.reset();
    document.getElementById("ajusteMotivoSelect").disabled = true; // Reiniciar estado
    document.getElementById("divAjusteProveedor").classList.add("d-none"); // Reiniciar estado

    $("#modalAjusteStock").modal("show");
  };

  // GUARDAR AJUSTE DE STOCK (CON VALIDACIONES BLINDADAS)
  const formAjuste = document.getElementById("formAjusteStock");
  if (formAjuste) {
    formAjuste.addEventListener("submit", async (e) => {
      e.preventDefault();

      const cantidadVal = parseInt(
        document.getElementById("ajusteCantidad").value,
      );
      const tipoAjuste = document.getElementById("ajusteTipo").value;
      const motivoBase = document.getElementById("ajusteMotivoSelect").value;

      if (!cantidadVal || cantidadVal <= 0) {
        Swal.fire(
          "Cantidad Inválida",
          "La cantidad a mover debe ser al menos 1.",
          "warning",
        );
        return;
      }
      if (!tipoAjuste || !motivoBase) {
        Swal.fire(
          "Datos Incompletos",
          "Debe seleccionar un Tipo de Movimiento y un Motivo.",
          "warning",
        );
        return;
      }

      const idProducto = e.target.dataset.id;
      const usuarioString = localStorage.getItem("usuarioFoxGamers");
      const usuario = JSON.parse(usuarioString);

      const proveedorID =
        !divAjusteProveedor.classList.contains("d-none") &&
        document.getElementById("ajusteProveedorSelect").value
          ? parseInt(document.getElementById("ajusteProveedorSelect").value)
          : null;

      const numDoc = document.getElementById("ajusteDocumento").value.trim();
      const obs = document.getElementById("ajusteObservacion").value.trim();

      let motivoFinal = motivoBase;
      if (numDoc) motivoFinal += ` | Doc: ${numDoc}`;
      if (obs) motivoFinal += ` - Obs: ${obs}`;

      const data = {
        idProducto: idProducto,
        tipoAjuste: tipoAjuste,
        cantidad: cantidadVal,
        motivo: motivoFinal,
        proveedorID: proveedorID,
        idUsuario: usuario.UsuarioID || usuario.id,
      };

      // VALIDACIÓN DE SALIDA (FRONTEND)
      const pActual = listaInventarioGlobal.find(
        (p) => p.ProductoID == idProducto,
      );
      if (tipoAjuste === "SALIDA" && cantidadVal > pActual.StockActual) {
        Swal.fire(
          "Stock Insuficiente",
          `Operación denegada. Solo tienes ${pActual.StockActual} unidades disponibles.`,
          "error",
        );
        return;
      }

      try {
        const res = await fetch("http://localhost:3000/api/productos/ajuste", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();

        if (result.success) {
          $("#modalAjusteStock").modal("hide");
          listarInventario();
          Swal.fire({
            icon: "success",
            title: "Movimiento Registrado",
            text: result.mensaje,
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          Swal.fire("Operación Fallida", result.mensaje, "error"); // Captura rechazos del backend
        }
      } catch (err) {
        Swal.fire(
          "Error de Conexión",
          "No se pudo procesar el ajuste de stock.",
          "error",
        );
      }
    });
  }

  // KARDEX Y DEPENDENCIAS
  window.verKardex = async (id) => {
    const p = listaInventarioGlobal.find((item) => item.ProductoID === id);
    const lbl = document.getElementById("lblKardexProducto");
    const tabla = document.getElementById("tablaKardex");

    if (!p || !lbl || !tabla) return;

    lbl.textContent = p.Nombre;
    tabla.innerHTML =
      '<tr><td colspan="5" class="text-dark">Cargando historial...</td></tr>';

    try {
      const res = await fetch(
        `http://localhost:3000/api/productos/kardex/${id}`,
      );
      const movimientos = await res.json();
      tabla.innerHTML = "";

      if (movimientos.length === 0) {
        tabla.innerHTML =
          '<tr><td colspan="5" class="text-muted italic">Sin movimientos registrados.</td></tr>';
      } else {
        movimientos.forEach((m) => {
          const colorTexto =
            m.tipo === "ENTRADA" ? "text-success" : "text-danger";
          const badgeClase =
            m.tipo === "ENTRADA" ? "badge-success" : "badge-danger";

          tabla.innerHTML += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td class="small text-muted">${m.fecha}</td>
                        <td class="font-weight-bold text-dark">${m.usuario}</td>
                        <td><span class="badge ${badgeClase}" style="font-size: 0.65rem;">${m.tipo}</span></td>
                        <td class="font-weight-bold ${colorTexto}">${m.tipo === "ENTRADA" ? "+" : "-"}${m.cant}</td>
                        <td class="text-left small" style="color: #000; font-weight: 500;">${m.motivo}</td>
                    </tr>`;
        });
      }
      $("#modalKardex").modal("show");
    } catch (e) {
      console.error(e);
    }
  };

  const inputBuscar = document.getElementById("buscarInventario");
  if (inputBuscar) {
    inputBuscar.addEventListener("input", (e) => {
      const txt = e.target.value.toLowerCase();
      const filtrados = listaInventarioGlobal.filter(
        (p) =>
          (p.ModeloBase && p.ModeloBase.toLowerCase().includes(txt)) ||
          (p.Atributo && p.Atributo.toLowerCase().includes(txt)),
      );
      renderizarTabla(filtrados);
    });
  }

  // LOGICA DE SELECTS EN CASCADA
  const ajusteTipo = document.getElementById("ajusteTipo");
  const ajusteMotivoSelect = document.getElementById("ajusteMotivoSelect");
  const divAjusteProveedor = document.getElementById("divAjusteProveedor");
  const ajusteProveedorSelect = document.getElementById(
    "ajusteProveedorSelect",
  );

  const motivos = {
    ENTRADA: [
      { val: "Compra a Proveedor", text: "Compra a Proveedor" },
      { val: "Devolución de Cliente", text: "Devolución de Cliente" },
      { val: "Ajuste Positivo", text: "Ajuste Positivo (Sobrante)" },
    ],
    SALIDA: [
      { val: "Venta Manual", text: "Venta Manual / Uso Interno" },
      { val: "Devolución a Proveedor", text: "Devolución a Proveedor (RMA)" },
      { val: "Merma / Dañado", text: "Merma / Producto Dañado" },
      { val: "Ajuste Negativo", text: "Ajuste Negativo (Faltante)" },
    ],
  };

  async function cargarProveedoresParaAjuste() {
    try {
      const res = await fetch("http://localhost:3000/api/proveedores");
      const proveedores = await res.json();
      ajusteProveedorSelect.innerHTML =
        '<option value="" disabled selected>-- Seleccione Proveedor --</option>';

      proveedores
        .filter((p) => p.Activo)
        .forEach((p) => {
          ajusteProveedorSelect.innerHTML += `<option value="${p.ProveedorID}">${p.RazonSocial}</option>`;
        });
    } catch (error) {
      console.error("No se pudieron cargar los proveedores", error);
    }
  }

  cargarProveedoresParaAjuste();

  if (ajusteTipo) {
    ajusteTipo.addEventListener("change", (e) => {
      const tipo = e.target.value;
      ajusteMotivoSelect.innerHTML =
        '<option value="" disabled selected>-- Seleccione Motivo --</option>';

      if (tipo) {
        ajusteMotivoSelect.disabled = false;
        motivos[tipo].forEach((m) => {
          ajusteMotivoSelect.innerHTML += `<option value="${m.val}">${m.text}</option>`;
        });
      }
      divAjusteProveedor.classList.add("d-none");
      ajusteProveedorSelect.required = false;
    });
  }

  if (ajusteMotivoSelect) {
    ajusteMotivoSelect.addEventListener("change", (e) => {
      const motivo = e.target.value;
      if (
        motivo === "Compra a Proveedor" ||
        motivo === "Devolución a Proveedor"
      ) {
        divAjusteProveedor.classList.remove("d-none");
        ajusteProveedorSelect.required = true;
      } else {
        divAjusteProveedor.classList.add("d-none");
        ajusteProveedorSelect.required = false;
      }
    });
  }
})();
