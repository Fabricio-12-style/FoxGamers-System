(() => {
  let listaInventarioGlobal = [];
  let debounceTimeoutInventario = null;
  const placeholderImg = "https://placehold.co/50x50/f8fafc/1e293b?text=Fox";
  const BASE_URL = "http://localhost:3000";

  // =======================================================
  // 1. OBTENER LISTADO DE INVENTARIO (HÍBRIDO TOP-5 / SEARCH)
  // =======================================================
  async function listarInventario(terminoBusqueda = "") {
    const lblModo = document.getElementById("lblModoCargaInventario");
    try {
      const url =
        terminoBusqueda.trim() !== ""
          ? `${BASE_URL}/api/productos?q=${encodeURIComponent(terminoBusqueda)}`
          : `${BASE_URL}/api/productos`;

      const res = await fetch(url);
      listaInventarioGlobal = await res.json();

      if (lblModo) {
        lblModo.textContent =
          terminoBusqueda.trim() !== ""
            ? `Resultados encontrados: ${listaInventarioGlobal.length}`
            : "Mostrando últimos 5 registros";
        lblModo.className =
          terminoBusqueda.trim() !== ""
            ? "badge badge-info p-2"
            : "badge badge-secondary p-2";
      }

      renderizarTabla(listaInventarioGlobal);
    } catch (e) {
      console.error("Error cargando inventario:", e);
    }
  }

  listarInventario();

  // =======================================================
  // 2. RENDERIZADO DINÁMICO DE FILAS
  // =======================================================
  function renderizarTabla(datos) {
    const tabla = document.getElementById("tablaInventario");
    if (!tabla) return;
    tabla.innerHTML = "";

    if (datos.length === 0) {
      tabla.innerHTML =
        '<tr><td colspan="9" class="py-4 italic" style="color: var(--fox-text-gray);">No se encontraron productos en el inventario.</td></tr>';
      return;
    }

    datos.forEach((p) => {
      const esBajoStock = p.StockActual <= p.StockMinimo;
      const rowStyle = p.Activo
        ? ""
        : "opacity: 0.5; filter: grayscale(1); background-color: #f1f5f9;";
      const urlImagen = p.ImagenURL
        ? `${BASE_URL}${p.ImagenURL}`
        : placeholderImg;

      tabla.innerHTML += `
        <tr style="${rowStyle}">
            <td>
                <img src="${urlImagen}" onerror="this.src='${placeholderImg}'" style="height: 40px; width: 40px; object-fit: contain; border-radius: 4px; background: #fff; padding: 2px; border: 1px solid #dee2e6;">
            </td>
            <td class="text-left dato-critico">${p.ModeloBase || "Sin especificar"}</td>
            <td class="text-left">
                <div style="color: var(--fox-text-gray); padding: 4px 10px; border-left: 3px solid var(--fox-cyan); display: inline-block; min-width: 160px;">
                    <small class="d-block font-weight-bold" style="font-size: 0.7rem;">${p.NombreCategoria || "GENERAL"}</small>
                    <strong style="font-size: 0.85rem; color: var(--fox-text-black);">${p.Atributo || "ESTÁNDAR"}</strong>
                </div>
            </td>
            <td class="dato-critico ${esBajoStock && p.Activo ? "text-danger" : ""}">${p.StockActual}</td>
            <td class="font-weight-bold text-muted">${p.StockMinimo}</td>
            <td class="font-weight-bold">S/ ${parseFloat(p.PrecioCompra || 0).toFixed(2)}</td>
            <td class="dato-critico">S/ ${parseFloat(p.PrecioVenta || 0).toFixed(2)}</td>
            <td><span class="badge ${esBajoStock ? "badge-danger" : "badge-success"}">${esBajoStock ? "Reabastecer" : "En Stock"}</span></td>
            <td>
                <div class="btn-group">
                    <button onclick="abrirAjuste(${p.ProductoID})" class="btn btn-sm btn-fox-cyan mx-1" style="border-radius: 4px; width: 34px; height: 34px;" title="Ajuste de Stock" ${!p.Activo ? "disabled" : ""}>
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

  // =======================================================
  // 3. APERTURA DE FORMULARIO DE AJUSTES
  // =======================================================
  window.abrirAjuste = (id) => {
    const p = listaInventarioGlobal.find((item) => item.ProductoID === id);
    const form = document.getElementById("formAjusteStock");
    const lbl = document.getElementById("lblProductoAjuste");
    const lblStock = document.getElementById("lblStockActualAjuste");

    if (!p || !form || !lbl) return;

    form.dataset.id = id;
    lbl.textContent = p.ModeloBase || "Producto";
    if (lblStock) lblStock.textContent = p.StockActual;

    form.reset();
    document.getElementById("ajusteMotivoSelect").disabled = true;
    document.getElementById("divAjusteProveedor").classList.add("d-none");

    $("#modalAjusteStock").modal("show");
  };

  // =======================================================
  // 4. TRANSACCIÓN DE AJUSTE DE STOCK
  // =======================================================
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
        return Swal.fire(
          "Cantidad Inválida",
          "La cantidad a mover debe ser al menos 1.",
          "warning",
        );
      }
      if (!tipoAjuste || !motivoBase) {
        return Swal.fire(
          "Datos Incompletos",
          "Debe seleccionar un Tipo de Movimiento y un Motivo.",
          "warning",
        );
      }

      const idProducto = e.target.dataset.id;
      const usuario = JSON.parse(localStorage.getItem("usuarioFoxGamers"));
      const divAjusteProveedor = document.getElementById("divAjusteProveedor");

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

      const pActual = listaInventarioGlobal.find(
        (p) => p.ProductoID == idProducto,
      );
      if (
        tipoAjuste === "SALIDA" &&
        pActual &&
        cantidadVal > pActual.StockActual
      ) {
        return Swal.fire(
          "Stock Insuficiente",
          `Operación denegada. Solo tienes ${pActual.StockActual} unidades disponibles.`,
          "error",
        );
      }

      try {
        const res = await fetch(`${BASE_URL}/api/productos/ajuste`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();

        if (result.success) {
          $("#modalAjusteStock").modal("hide");
          listarInventario(document.getElementById("buscarInventario").value);
          Swal.fire({
            icon: "success",
            title: "Movimiento Registrado",
            text: result.mensaje,
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          Swal.fire("Operación Fallida", result.mensaje, "error");
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

  // =======================================================
  // 5. CONSULTA DE MOVIMIENTOS KARDEX POR PRODUCTO
  // =======================================================
  window.verKardex = async (id) => {
    const p = listaInventarioGlobal.find((item) => item.ProductoID === id);
    const lbl = document.getElementById("lblKardexProducto");
    const tabla = document.getElementById("tablaKardex");

    if (!p || !lbl || !tabla) return;

    lbl.textContent = p.ModeloBase || "Historial";
    tabla.innerHTML =
      '<tr><td colspan="5" class="py-4 font-weight-bold" style="color: var(--fox-text-gray);">Cargando historial...</td></tr>';

    try {
      const res = await fetch(`${BASE_URL}/api/productos/kardex/${id}`);
      const movimientos = await res.json();
      tabla.innerHTML = "";

      if (movimientos.length === 0) {
        tabla.innerHTML =
          '<tr><td colspan="5" class="py-4 italic" style="color: var(--fox-text-gray);">Sin movimientos registrados.</td></tr>';
      } else {
        movimientos.forEach((m) => {
          const colorTexto =
            m.tipo === "ENTRADA" ? "text-success" : "text-danger";
          const badgeClase =
            m.tipo === "ENTRADA" ? "badge-success" : "badge-danger";

          tabla.innerHTML += `
            <tr>
                <td class="small font-weight-bold" style="color: var(--fox-text-gray);">${m.fecha}</td>
                <td class="dato-critico" style="font-size: 0.95rem;">${m.usuario}</td>
                <td><span class="badge ${badgeClase}">${m.tipo}</span></td>
                <td class="dato-critico ${colorTexto}" style="font-size: 1.1rem;">${m.tipo === "ENTRADA" ? "+" : "-"}${m.cant}</td>
                <td class="text-left font-weight-bold" style="color: var(--fox-text-gray); font-size: 0.85rem;">${m.motivo}</td>
            </tr>`;
        });
      }
      $("#modalKardex").modal("show");
    } catch (e) {
      console.error(e);
      tabla.innerHTML =
        '<tr><td colspan="5" class="py-4 text-danger font-weight-bold">Error al cargar datos.</td></tr>';
    }
  };

  // =======================================================
  // 6. MOTOR DE ESCUDO DEBOUNCE (HOSTING PROTECTOR)
  // =======================================================
  const inputBuscar = document.getElementById("buscarInventario");
  if (inputBuscar) {
    inputBuscar.addEventListener("input", (e) => {
      const valor = e.target.value;
      clearTimeout(debounceTimeoutInventario);
      debounceTimeoutInventario = setTimeout(() => {
        listarInventario(valor);
      }, 400);
    });
  }

  // =======================================================
  // 7. COMPORTAMIENTO DE SELECTS EN CASCADA Y PROVEEDORES
  // =======================================================
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
      const res = await fetch(`${BASE_URL}/api/proveedores`);
      const proveedores = await res.json();
      if (!ajusteProveedorSelect) return;
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