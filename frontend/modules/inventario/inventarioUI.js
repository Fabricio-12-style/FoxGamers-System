import { inventarioApi } from "./inventarioApi.js";
import { inventarioState } from "./inventarioState.js";

const placeholderImg = "https://placehold.co/50x50/f8fafc/1e293b?text=Fox";
const BASE_URL = "http://localhost:3000";
let debounceTimeout = null;

const motivosFijos = {
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

// ==========================================
// 1. RENDERIZADO DE TABLA 
// ==========================================
const renderizarTabla = (datos) => {
  const tabla = document.getElementById("tablaInventario");
  if (!tabla) return;
  tabla.innerHTML = "";

  if (datos.length === 0) {
    tabla.innerHTML =
      '<tr><td colspan="10" class="py-4 italic" style="color: var(--fox-text-gray);">No se encontraron productos en el inventario.</td></tr>';
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
        <tr style="${rowStyle}" class="fila-principal">
            <!-- 1. Botón Expansor (Móvil) -->
            <td class="d-table-cell d-md-none align-middle text-center" style="width: 50px; padding: 12px 5px;">
                <button class="btn btn-sm btn-light btn-expandir m-0 shadow-sm" style="border-radius: 50%;">
                    <i class="fas fa-plus text-primary" style="font-size: 1.1rem;"></i>
                </button>
            </td>
            
            <!-- 2. Imagen (PC) -->
            <td class="d-none d-md-table-cell align-middle">
                <img src="${urlImagen}" onerror="this.src='${placeholderImg}'" style="height: 40px; width: 40px; object-fit: contain; border-radius: 4px; background: #fff; padding: 2px; border: 1px solid #dee2e6;">
            </td>
            
            <!-- 3. Producto (Ambos) -->
            <td class="text-left align-middle" style="padding: 12px 15px;">
                <div class="dato-critico text-wrap" style="font-size: 1rem; line-height: 1.2;">${p.ModeloBase || "Sin especificar"}</div>
                <!-- Badge de stock para móvil -->
                <div class="d-block d-md-none mt-2">
                    <span class="badge ${esBajoStock ? "badge-danger" : "badge-success"} px-2 py-1" style="font-size: 0.75rem;">
                        Stock: ${p.StockActual}
                    </span>
                </div>
            </td>
            
            <!-- 4. Presentación (PC) -->
            <td class="text-left d-none d-md-table-cell align-middle">
                <div style="color: var(--fox-text-gray); padding: 4px 10px; border-left: 3px solid var(--fox-cyan); display: inline-block; min-width: 160px;">
                    <small class="d-block font-weight-bold" style="font-size: 0.7rem;">${p.NombreCategoria || "GENERAL"}</small>
                    <strong style="font-size: 0.85rem; color: var(--fox-text-black);">${p.Atributo || "ESTÁNDAR"}</strong>
                </div>
            </td>
            
            <!-- 5. Stock Actual (PC) -->
            <td class="dato-critico d-none d-md-table-cell align-middle ${esBajoStock && p.Activo ? "text-danger" : ""}" style="font-size: 1.1rem;">${p.StockActual}</td>
            
            <!-- 6. Stock Mínimo (PC) -->
            <td class="font-weight-bold text-muted d-none d-md-table-cell align-middle">${p.StockMinimo}</td>
            
            <!-- 7. Precio Compra (PC) -->
            <td class="font-weight-bold d-none d-md-table-cell align-middle">S/ ${parseFloat(p.PrecioCompra || 0).toFixed(2)}</td>
            
            <!-- 8. Precio Venta (PC) -->
            <td class="dato-critico d-none d-md-table-cell align-middle text-primary">S/ ${parseFloat(p.PrecioVenta || 0).toFixed(2)}</td>
            
            <!-- 9. Estado (PC) -->
            <td class="align-middle d-none d-md-table-cell">
                <span class="badge ${esBajoStock ? "badge-danger" : "badge-success"}">${esBajoStock ? "Reabastecer" : "En Stock"}</span>
            </td>
            
            <!-- 10. Acciones (PC) -->
            <td class="align-middle d-none d-md-table-cell">
                <div class="btn-group">
                    <button onclick="abrirAjusteUI(${p.ProductoID})" class="btn btn-sm btn-fox-cyan mx-1 shadow-sm" style="border-radius: 4px; width: 34px; height: 34px;" title="Ajuste de Stock" ${!p.Activo ? "disabled" : ""}><i class="fas fa-exchange-alt"></i></button>
                    <button onclick="verKardexUI(${p.ProductoID})" class="btn btn-sm btn-fox mx-1 shadow-sm" style="border-radius: 4px; width: 34px; height: 34px;" title="Ver Historial"><i class="fas fa-history"></i></button>
                </div>
            </td>
        </tr>

        <!-- FILA OCULTA EXPANSIBLE (TARJETA MÓVIL) -->
        <tr class="fila-detalle d-none d-md-none shadow-inner">
            <td colspan="10" class="p-3 text-left" style="background: #f8fafc; border-bottom: 3px solid var(--fox-cyan);">
                
                <!-- Info Visual y Presentación -->
                <div class="d-flex align-items-center mb-3 pb-3 border-bottom">
                    <img src="${urlImagen}" onerror="this.src='${placeholderImg}'" style="height: 55px; width: 55px; object-fit: contain; border-radius: 6px; background: #fff; padding: 3px; border: 1px solid #dee2e6; margin-right: 15px; flex-shrink: 0;">
                    <div style="min-width: 0;">
                        <small class="text-uppercase font-weight-bold" style="color: var(--fox-text-gray); font-size: 0.65rem;">${p.NombreCategoria || "GENERAL"}</small>
                        <span class="d-block font-weight-bold text-truncate" style="font-size: 0.95rem; color: var(--fox-text-black);">${p.Atributo || "ESTÁNDAR"}</span>
                    </div>
                </div>

                <!-- Cuadrícula de Datos Numéricos -->
                <div class="d-flex justify-content-between text-center mb-3" style="font-size: 0.85rem;">
                    <div class="flex-fill" style="border-right: 1px solid #dee2e6; padding: 0 5px;">
                        <span class="d-block font-weight-bold text-muted small mb-1">Mínimo</span>
                        <strong style="font-size: 1rem;">${p.StockMinimo}</strong>
                    </div>
                    <div class="flex-fill" style="border-right: 1px solid #dee2e6; padding: 0 5px;">
                        <span class="d-block font-weight-bold text-muted small mb-1">Compra</span>
                        <strong style="font-size: 1rem;">S/${parseFloat(p.PrecioCompra || 0).toFixed(2)}</strong>
                    </div>
                    <div class="flex-fill" style="padding: 0 5px;">
                        <span class="d-block font-weight-bold text-muted small mb-1">Venta</span>
                        <strong class="text-primary" style="font-size: 1rem;">S/${parseFloat(p.PrecioVenta || 0).toFixed(2)}</strong>
                    </div>
                </div>

                <!-- Botones de Acción Móvil -->
                <div class="d-flex justify-content-between w-100">
                    <button onclick="abrirAjusteUI(${p.ProductoID})" class="btn btn-fox-cyan flex-fill mr-1 font-weight-bold text-truncate" style="border-radius: 6px; padding: 10px 0; font-size: 0.85rem;" ${!p.Activo ? "disabled" : ""}>
                        <i class="fas fa-exchange-alt mr-1"></i> Stock
                    </button>
                    <button onclick="verKardexUI(${p.ProductoID})" class="btn btn-fox flex-fill ml-1 font-weight-bold text-truncate" style="border-radius: 6px; padding: 10px 0; font-size: 0.85rem;">
                        <i class="fas fa-history mr-1"></i> Kardex
                    </button>
                </div>
            </td>
        </tr>`;
  });
};

// ==========================================
// 2. LÓGICA DE INICIALIZACIÓN Y EVENTOS
// ==========================================
const listarInventario = async (termino = "") => {
  try {
    const datos = await inventarioApi.obtenerInventario(termino);
    inventarioState.setInventario(datos);

    const lblModo = document.getElementById("lblModoCargaInventario");
    if (lblModo) {
      lblModo.textContent =
        termino.trim() !== ""
          ? `Resultados: ${datos.length}`
          : "Mostrando registros críticos";
      lblModo.className =
        termino.trim() !== ""
          ? "badge badge-info p-2"
          : "badge badge-secondary p-2";
    }
    renderizarTabla(datos);
  } catch (e) {
    console.error(e);
  }
};

const cargarProveedores = async () => {
  try {
    const proveedores = await inventarioApi.obtenerProveedores();
    const select = document.getElementById("ajusteProveedorSelect");
    if (!select) return;
    select.innerHTML =
      '<option value="" disabled selected>-- Seleccione Proveedor --</option>';
    proveedores
      .filter((p) => p.Activo)
      .forEach((p) => {
        select.innerHTML += `<option value="${p.ProveedorID}">${p.RazonSocial}</option>`;
      });
  } catch (e) {
    console.error("Error al cargar proveedores", e);
  }
};

const inicializarModulo = () => {
  const usuarioString = localStorage.getItem("usuarioFoxGamers");
  if (!usuarioString) return (window.location.href = "../../login/login.html");

  inventarioState.init(usuarioString);
  listarInventario();
  cargarProveedores();

  document
    .getElementById("buscarInventario")
    ?.addEventListener("input", (e) => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => listarInventario(e.target.value), 400);
    });

  document.getElementById("tablaInventario")?.addEventListener("click", (e) => {
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

  const ajusteTipo = document.getElementById("ajusteTipo");
  const ajusteMotivoSelect = document.getElementById("ajusteMotivoSelect");
  const divAjusteProveedor = document.getElementById("divAjusteProveedor");
  const ajusteProveedorSelect = document.getElementById(
    "ajusteProveedorSelect",
  );

  ajusteTipo?.addEventListener("change", (e) => {
    const tipo = e.target.value;
    ajusteMotivoSelect.innerHTML =
      '<option value="" disabled selected>-- Seleccione Motivo --</option>';
    if (tipo) {
      ajusteMotivoSelect.disabled = false;
      motivosFijos[tipo].forEach(
        (m) =>
          (ajusteMotivoSelect.innerHTML += `<option value="${m.val}">${m.text}</option>`),
      );
    }
    divAjusteProveedor.classList.add("d-none");
    ajusteProveedorSelect.required = false;
  });

  ajusteMotivoSelect?.addEventListener("change", (e) => {
    if (
      e.target.value === "Compra a Proveedor" ||
      e.target.value === "Devolución a Proveedor"
    ) {
      divAjusteProveedor.classList.remove("d-none");
      ajusteProveedorSelect.required = true;
    } else {
      divAjusteProveedor.classList.add("d-none");
      ajusteProveedorSelect.required = false;
    }
  });

  document
    .getElementById("formAjusteStock")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const cantidadVal = parseInt(
        document.getElementById("ajusteCantidad").value,
      );
      const tipoAjuste = document.getElementById("ajusteTipo").value;
      const motivoBase = document.getElementById("ajusteMotivoSelect").value;
      const idProducto = e.target.dataset.id;

      if (!cantidadVal || cantidadVal <= 0)
        return Swal.fire(
          "Invalido",
          "La cantidad debe ser al menos 1.",
          "warning",
        );
      if (!tipoAjuste || !motivoBase)
        return Swal.fire("Incompleto", "Seleccione Tipo y Motivo.", "warning");

      const pActual = inventarioState.getProductoById(parseInt(idProducto));
      if (
        tipoAjuste === "SALIDA" &&
        pActual &&
        cantidadVal > pActual.StockActual
      ) {
        return Swal.fire(
          "Stock Insuficiente",
          `Solo tienes ${pActual.StockActual} disponibles.`,
          "error",
        );
      }

      const proveedorID =
        !divAjusteProveedor.classList.contains("d-none") &&
        ajusteProveedorSelect.value
          ? parseInt(ajusteProveedorSelect.value)
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
        idUsuario: inventarioState.getUsuarioID(),
      };

      try {
        const res = await inventarioApi.ajustarStock(data);
        if (res.success) {
          $("#modalAjusteStock").modal("hide");
          listarInventario(document.getElementById("buscarInventario").value);
          Swal.fire({
            icon: "success",
            title: "Movimiento Registrado",
            text: res.mensaje,
            timer: 1500,
            showConfirmButton: false,
          });
        } else Swal.fire("Operación Fallida", res.mensaje, "error");
      } catch (err) {
        Swal.fire("Error", "Fallo de conexión.", "error");
      }
    });

  // ==========================================
  // 3. FUNCIONES GLOBALES
  // ==========================================
  window.abrirAjusteUI = (id) => {
    const p = inventarioState.getProductoById(id);
    const form = document.getElementById("formAjusteStock");
    if (!p || !form) return;

    form.dataset.id = id;
    document.getElementById("lblProductoAjuste").textContent =
      p.ModeloBase || "Producto";
    document.getElementById("lblStockActualAjuste").textContent = p.StockActual;
    form.reset();

    document.getElementById("ajusteMotivoSelect").disabled = true;
    document.getElementById("divAjusteProveedor").classList.add("d-none");
    $("#modalAjusteStock").modal("show");
  };

  window.verKardexUI = async (id) => {
    const p = inventarioState.getProductoById(id);
    const tabla = document.getElementById("tablaKardex");
    if (!p || !tabla) return;

    document.getElementById("lblKardexProducto").textContent =
      p.ModeloBase || "Historial";
    tabla.innerHTML =
      '<tr><td colspan="5" class="py-4 font-weight-bold" style="color: var(--fox-text-gray);"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando historial...</td></tr>';
    $("#modalKardex").modal("show");

    try {
      const movimientos = await inventarioApi.obtenerKardex(id);
      tabla.innerHTML = "";
      if (movimientos.length === 0) {
        tabla.innerHTML =
          '<tr><td colspan="5" class="py-4 italic text-muted">Sin movimientos registrados.</td></tr>';
      } else {
        movimientos.forEach((m) => {
          const esEntrada = m.tipo === "ENTRADA";
          tabla.innerHTML += `
                    <tr>
                        <td class="text-left align-middle" style="padding: 10px 5px;">
                            <!-- Fecha (Siempre visible) -->
                            <div class="small font-weight-bold text-muted">${m.fecha}</div>
                            
                            <!-- Detalles aglomerados SOLO para móvil -->
                            <div class="d-block d-md-none mt-1 text-wrap" style="font-size: 0.75rem; color: var(--fox-text-gray); line-height: 1.2;">
                                <strong>User:</strong> <span class="text-dark">${m.usuario}</span><br>
                                <span class="font-italic">${m.motivo}</span>
                            </div>
                        </td>
                        
                        <!-- Columnas nativas (Ocultas en celular, visibles en PC) -->
                        <td class="dato-critico align-middle d-none d-md-table-cell">${m.usuario}</td>
                        <td class="align-middle">
                            <span class="badge ${esEntrada ? "badge-success" : "badge-danger"}">${m.tipo}</span>
                        </td>
                        <td class="dato-critico align-middle ${esEntrada ? "text-success" : "text-danger"}" style="font-size: 1.1rem;">
                            ${esEntrada ? "+" : "-"}${m.cant}
                        </td>
                        <td class="text-left font-weight-bold text-muted align-middle d-none d-md-table-cell" style="font-size: 0.85rem;">
                            ${m.motivo}
                        </td>
                    </tr>`;
        });
      }
    } catch (e) {
      tabla.innerHTML =
        '<tr><td colspan="5" class="py-4 text-danger font-weight-bold">Error al cargar datos.</td></tr>';
    }
  };
};

inicializarModulo();