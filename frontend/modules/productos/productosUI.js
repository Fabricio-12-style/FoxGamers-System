import { productosApi } from "./productosApi.js";
import { productosState } from "./productosState.js";

const placeholderImg =
  "https://placehold.co/400x400/f8fafc/1e293b?text=Subir+Imagen";
const placeholderIcon = "https://placehold.co/50x50/f8fafc/1e293b?text=Img";
const BASE_URL = "http://localhost:3000";
let debounceTimeout = null;

// ==========================================
// 1. UI Y RENDERIZADO
// ==========================================
const construirNombreUI = () => {
  const catId = document.getElementById("prodCategoria").value;
  const mod = document.getElementById("prodModelo").value.trim();
  const atr = document.getElementById("prodAtributo").value.trim();
  const familia = productosState.getNombreCategoria(catId);
  const nombreFinal = `${familia} ${mod} ${atr ? "- " + atr : ""}`.trim();

  const preview = document.getElementById("prodPreviewNombre");
  if (preview) preview.textContent = nombreFinal || "Esperando datos...";
  return nombreFinal;
};

const cargarCategoriasSelect = async () => {
  const select = document.getElementById("prodCategoria");
  if (!select) return;

  try {
    const data = await productosApi.obtenerCategorias();

    if (Array.isArray(data)) {
      productosState.setCategorias(data);
      select.innerHTML =
        '<option value="" disabled selected>Seleccione Familia...</option>';
      data.forEach((c) => {
        select.innerHTML += `<option value="${c.CategoriaID}">${c.Nombre}</option>`;
      });
    } else {
      console.error("Respuesta inesperada del servidor:", data);
      select.innerHTML = '<option value="" disabled>Error de servidor</option>';
    }
  } catch (e) {
    console.error("Fallo de red al cargar categorías:", e);
    select.innerHTML = '<option value="" disabled>Error de red</option>';
  }
};

const renderizarTabla = (datos) => {
  const tabla = document.getElementById("tablaProductos");
  if (!tabla) return;
  tabla.innerHTML = "";

  if (datos.length === 0) {
    tabla.innerHTML =
      '<tr><td colspan="7" class="text-center py-4 font-weight-bold text-muted">No hay productos en el catálogo.</td></tr>';
    return;
  }

  const esAdmin = productosState.isAdmin();

  datos.forEach((p) => {
    const categoriaActiva =
      p.CategoriaActiva === true ||
      p.CategoriaActiva === 1 ||
      p.CategoriaActiva === undefined;
    const iconVisibilidad = p.Activo
      ? '<i class="fas fa-eye-slash"></i>'
      : '<i class="fas fa-eye"></i>';
    const btnClass = p.Activo ? "btn-secondary" : "btn-fox-cyan";
    const rowStyle = p.Activo
      ? ""
      : "opacity: 0.5; filter: grayscale(1); background-color: #f1f5f9;";
    const urlImagen = p.ImagenURL
      ? `${BASE_URL}${p.ImagenURL}`
      : placeholderIcon;

    const btnEditar = esAdmin
      ? `<button onclick="prepararEdicionProdUI(${p.ProductoID})" class="btn btn-sm btn-fox mx-1" style="border-radius: 4px; width: 34px; height: 34px;" title="Editar" ${!p.Activo ? "disabled" : ""}><i class="fas fa-pencil-alt"></i></button>`
      : `<button class="btn btn-sm btn-light mx-1" style="border-radius: 4px; width: 34px; height: 34px; color:#cbd5e1" disabled><i class="fas fa-pencil-alt"></i></button>`;
    const btnVisibilidad = esAdmin
      ? `<button onclick="toggleEstadoProductoUI(${p.ProductoID}, ${p.Activo ? 0 : 1})" class="btn btn-sm ${btnClass} mx-1" style="border-radius: 4px; width: 34px; height: 34px;" title="${categoriaActiva ? (p.Activo ? "Suspender" : "Reactivar") : "Requiere activar la categoría"}" ${!categoriaActiva ? "disabled" : ""}>${iconVisibilidad}</button>`
      : `<button class="btn btn-sm btn-light mx-1" style="border-radius: 4px; width: 34px; height: 34px; color:#cbd5e1" disabled>${iconVisibilidad}</button>`;
    const btnEliminar = esAdmin
      ? `<button onclick="eliminarProductoUI(${p.ProductoID})" class="btn btn-sm btn-fox-danger mx-1" style="border-radius: 4px; width: 34px; height: 34px;" title="Eliminar" ${!p.Activo ? "disabled" : ""}><i class="fas fa-trash"></i></button>`
      : `<button class="btn btn-sm btn-light mx-1" style="border-radius: 4px; width: 34px; height: 34px; color:#cbd5e1" disabled><i class="fas fa-trash"></i></button>`;

    const btnEditarMobile = esAdmin
      ? `<button onclick="prepararEdicionProdUI(${p.ProductoID})" class="btn btn-fox flex-fill mr-1 font-weight-bold text-truncate" style="border-radius: 6px; padding: 10px 0; font-size: 0.82rem;" ${!p.Activo ? "disabled" : ""}><i class="fas fa-pencil-alt mr-1"></i> Editar</button>`
      : "";
    const btnVisibilidadMobile = esAdmin
      ? `<button onclick="toggleEstadoProductoUI(${p.ProductoID}, ${p.Activo ? 0 : 1})" class="btn ${btnClass} flex-fill mx-1 font-weight-bold text-truncate" style="border-radius: 6px; padding: 10px 0; font-size: 0.82rem;" ${!categoriaActiva ? "disabled" : ""}>${iconVisibilidad} ${p.Activo ? "Suspender" : "Reactivar"}</button>`
      : "";
    const btnEliminarMobile = esAdmin
      ? `<button onclick="eliminarProductoUI(${p.ProductoID})" class="btn btn-fox-danger flex-fill ml-1 font-weight-bold text-truncate" style="border-radius: 6px; padding: 10px 0; font-size: 0.82rem;" ${!p.Activo ? "disabled" : ""}><i class="fas fa-trash mr-1"></i> Borrar</button>`
      : "";

    tabla.innerHTML += `
        <tr style="${rowStyle}" class="fila-principal-producto">
            <!-- 1. Botón Expansor (Móvil) -->
            <td class="d-table-cell d-md-none align-middle text-center" style="width: 50px; padding: 12px 5px;">
                <button class="btn btn-sm btn-light btn-expandir-producto m-0 shadow-sm" style="border-radius: 50%; width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas fa-plus text-primary" style="font-size: 0.9rem;"></i>
                </button>
            </td>
            
            <!-- 2. ID (PC) -->
            <td class="font-weight-bold text-muted d-none d-md-table-cell align-middle">${p.ProductoID}</td>
            
            <!-- 3. Imagen (PC) -->
            <td class="d-none d-md-table-cell align-middle">
                <img src="${urlImagen}" onerror="this.src='${placeholderIcon}'" style="height: 40px; width: 40px; object-fit: contain; border-radius: 4px; border: 1px solid #cbd5e1; background-color: #fff;">
            </td>
            
            <!-- 4. Nombre (Ambos) -->
            <td class="text-left align-middle" style="padding: 12px 15px;">
                <div class="dato-critico text-wrap" style="font-size: 1rem; line-height: 1.2;">${p.Nombre}</div>
                <!-- Badge de precio para móvil -->
                <div class="d-block d-md-none mt-2">
                    <span class="badge badge-dark px-2 py-1" style="font-size: 0.75rem;">S/ ${p.PrecioVenta.toFixed(2)}</span>
                </div>
            </td>
            
            <!-- 5. Código/SKU (PC) -->
            <td class="d-none d-md-table-cell align-middle"><span class="badge badge-dark">${p.Codigo}</span></td>
            
            <!-- 6. Precio Venta (PC) -->
            <td class="dato-critico d-none d-md-table-cell align-middle">S/ ${p.PrecioVenta.toFixed(2)}</td>
            
            <!-- 7. Acciones (PC) -->
            <td class="d-none d-md-table-cell align-middle">
                <div class="btn-group">${btnEditar}${btnVisibilidad}${btnEliminar}</div>
            </td>
        </tr>

        <!-- FILA OCULTA EXPANSIBLE (TARJETA MÓVIL) -->
        <tr class="fila-detalle-producto d-none d-md-none shadow-inner">
            <td colspan="7" class="p-3 text-left" style="background: #f8fafc; border-bottom: 3px solid var(--fox-orange);">
                
                <!-- Info Visual y Presentación -->
                <div class="d-flex align-items-center mb-3 pb-3 border-bottom">
                    <img src="${urlImagen}" onerror="this.src='${placeholderIcon}'" style="height: 55px; width: 55px; object-fit: contain; border-radius: 6px; background: #fff; padding: 3px; border: 1px solid #dee2e6; margin-right: 15px; flex-shrink: 0;">
                    <div style="min-width: 0;">
                        <small class="text-uppercase font-weight-bold" style="color: var(--fox-text-gray); font-size: 0.65rem;">CÓDIGO SKU</small>
                        <span class="d-block font-weight-bold text-truncate" style="font-size: 0.95rem; color: var(--fox-text-black);">${p.Codigo}</span>
                    </div>
                </div>

                <!-- Cuadrícula de Datos Numéricos -->
                <div class="d-flex justify-content-between text-center mb-3" style="font-size: 0.85rem;">
                    <div class="flex-fill" style="border-right: 1px solid #dee2e6; padding: 0 5px;">
                        <span class="d-block font-weight-bold text-muted small mb-1">Costo</span>
                        <strong style="font-size: 1rem;">S/${parseFloat(p.PrecioCompra || 0).toFixed(2)}</strong>
                    </div>
                    <div class="flex-fill" style="border-right: 1px solid #dee2e6; padding: 0 5px;">
                        <span class="d-block font-weight-bold text-muted small mb-1">Venta</span>
                        <strong class="text-primary" style="font-size: 1rem;">S/${p.PrecioVenta.toFixed(2)}</strong>
                    </div>
                    <div class="flex-fill" style="padding: 0 5px;">
                        <span class="d-block font-weight-bold text-muted small mb-1">Stk. Mín.</span>
                        <strong style="font-size: 1rem;">${p.StockMinimo}</strong>
                    </div>
                </div>

                <!-- Botones de Acción Móvil -->
                <div class="d-flex justify-content-between w-100 flex-wrap" style="gap: 0.35rem;">
                    ${btnEditarMobile}${btnVisibilidadMobile}${btnEliminarMobile}
                </div>
            </td>
        </tr>`;
  });
};

// ==========================================
// 2. INICIALIZACIÓN Y EVENTOS
// ==========================================
const listarProductos = async (termino = "") => {
  try {
    const datos = await productosApi.obtenerProductos(termino);
    productosState.setProductos(datos);

    const lblModo = document.getElementById("lblModoCargaProductos");
    if (lblModo) {
      lblModo.textContent =
        termino.trim() !== ""
          ? `Resultados: ${datos.length}`
          : "Mostrando últimos registros";
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

const inicializarModulo = async () => {
  const usuarioString = localStorage.getItem("usuarioFoxGamers");
  if (!usuarioString) return (window.location.href = "../../login/login.html");

  productosState.init(usuarioString);
  const btnNuevo = document.getElementById("btnNuevoProducto");
  if (btnNuevo && !productosState.isAdmin()) btnNuevo.style.display = "none";

  await cargarCategoriasSelect();
  listarProductos();

  ["prodCategoria", "prodModelo", "prodAtributo"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", construirNombreUI);
  });

  document
    .getElementById("prodImagen")
    ?.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          Swal.fire(
            "Imagen muy pesada",
            "Elige una foto menor a 5MB",
            "warning",
          );
          this.value = "";
          return;
        }
        productosState.setArchivoImagen(file);
        const reader = new FileReader();
        reader.onload = (event) => {
          document.getElementById("imgPreview").src = event.target.result;
        };
        reader.readAsDataURL(file);
      } else productosState.setArchivoImagen(null);
    });

  document.getElementById("buscarProducto")?.addEventListener("input", (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => listarProductos(e.target.value), 400);
  });

  document.getElementById("tablaProductos")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-expandir-producto");
    if (btn) {
      const filaPrincipal = btn.closest(".fila-principal-producto");
      const filaDetalle = filaPrincipal?.nextElementSibling;
      if (filaDetalle) {
        filaDetalle.classList.toggle("d-none");
        const icono = btn.querySelector("i");
        if (icono?.classList.contains("fa-plus")) {
          icono.classList.remove("fa-plus");
          icono.classList.add("fa-minus");
        } else {
          icono?.classList.remove("fa-minus");
          icono?.classList.add("fa-plus");
        }
      }
    }
  });

  btnNuevo?.addEventListener("click", () => {
    if (!productosState.isAdmin()) return;
    productosState.setEditandoId(null);
    productosState.setArchivoImagen(null);
    productosState.setImagenBase64(null);
    document.getElementById("formProducto").reset();
    document.getElementById("tituloModalProd").textContent =
      "Registrar Nuevo Producto";
    document.getElementById("imgPreview").src = placeholderImg;
    document.getElementById("prodPreviewNombre").textContent =
      "Esperando datos...";
    $("#modalProducto").modal("show");
  });

  document
    .getElementById("formProducto")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!productosState.isAdmin())
        return Swal.fire(
          "Acceso Denegado",
          "Solo administradores pueden alterar el catálogo.",
          "error",
        );

      const costoVal = parseFloat(document.getElementById("prodCosto").value);
      const precioVal = parseFloat(document.getElementById("prodPrecio").value);
      const minimoVal = parseInt(document.getElementById("prodMinimo").value);

      if (costoVal < 0 || precioVal < 0 || minimoVal < 0)
        return Swal.fire(
          "Error",
          "Valores no pueden ser menores a cero.",
          "error",
        );
      if (precioVal < costoVal)
        return Swal.fire(
          "Alerta",
          "El precio de venta no puede ser menor al costo.",
          "warning",
        );

      const idEdicion = productosState.getEditandoId();
      let estadoActual = 1;
      if (idEdicion) {
        const original = productosState.getProductoById(idEdicion);
        estadoActual = original ? original.Activo : 1;
      }

      const formData = new FormData();
      formData.append(
        "CategoriaID",
        document.getElementById("prodCategoria").value,
      );
      formData.append(
        "Codigo",
        document.getElementById("prodCodigo").value.trim(),
      );
      formData.append(
        "ModeloBase",
        document.getElementById("prodModelo").value.trim(),
      );
      formData.append(
        "Atributo",
        document.getElementById("prodAtributo").value.trim(),
      );
      formData.append("PrecioCompra", costoVal);
      formData.append("PrecioVenta", precioVal);
      formData.append("StockMinimo", minimoVal);
      formData.append("Activo", estadoActual);

      const file = productosState.getArchivoImagen();
      const base64 = productosState.getImagenBase64();
      if (file) formData.append("imagen", file);
      else if (base64) formData.append("ImagenURL", base64);

      try {
        const res = idEdicion
          ? await productosApi.actualizarProducto(idEdicion, formData)
          : await productosApi.crearProducto(formData);
        if (res.success) {
          $("#modalProducto").modal("hide");
          listarProductos(document.getElementById("buscarProducto").value);
          Swal.fire({
            icon: "success",
            title: "¡Éxito!",
            text: res.mensaje,
            timer: 2000,
            showConfirmButton: false,
          });
        } else Swal.fire("Atención", res.mensaje, "warning");
      } catch (err) {
        Swal.fire("Error", "Fallo de conexión", "error");
      }
    });

  // ==========================================
  // 3. FUNCIONES GLOBALES
  // ==========================================
  window.prepararEdicionProdUI = (id) => {
    if (!productosState.isAdmin()) return;
    const p = productosState.getProductoById(id);
    if (!p) return;

    productosState.setEditandoId(id);
    document.getElementById("prodCategoria").value = p.CategoriaID;
    document.getElementById("prodCodigo").value = p.Codigo;
    document.getElementById("prodModelo").value = p.ModeloBase;
    document.getElementById("prodAtributo").value = p.Atributo || "";
    document.getElementById("prodCosto").value = p.PrecioCompra;
    document.getElementById("prodPrecio").value = p.PrecioVenta;
    document.getElementById("prodMinimo").value = p.StockMinimo;

    productosState.setArchivoImagen(null);
    productosState.setImagenBase64(p.ImagenURL);

    document.getElementById("imgPreview").src = p.ImagenURL
      ? `${BASE_URL}${p.ImagenURL}`
      : placeholderImg;
    document.getElementById("tituloModalProd").textContent =
      "Editar Ficha de Producto";
    construirNombreUI();
    $("#modalProducto").modal("show");
  };

  window.toggleEstadoProductoUI = async (id, nuevoEstado) => {
    if (!productosState.isAdmin()) return;
    try {
      const res = await productosApi.cambiarEstado(id, nuevoEstado);
      if (res.success) {
        listarProductos(document.getElementById("buscarProducto").value);
        Swal.fire({
          icon: "success",
          title: "Actualizado",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  window.eliminarProductoUI = async (id) => {
    if (!productosState.isAdmin()) return;
    const p = productosState.getProductoById(id);
    const conf = await Swal.fire({
      title: "¿Eliminar Producto?",
      text: p.Nombre,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, borrar",
    });
    if (conf.isConfirmed) {
      try {
        const res = await productosApi.eliminarProducto(id);
        if (res.success) {
          Swal.fire("¡Eliminado!", res.mensaje, "success");
          listarProductos(document.getElementById("buscarProducto").value);
        } else Swal.fire("Bloqueado", res.mensaje, "error");
      } catch (e) {
        Swal.fire("Error", "No se pudo eliminar", "error");
      }
    }
  };
};

inicializarModulo();