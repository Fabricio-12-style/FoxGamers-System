(() => {
  let productoEditandoId = null;
  let listaProductosGlobal = [];
  let mapaCategorias = {};
  let imagenBase64 = null;
  let archivoImagen = null;
  let debounceTimeoutProductos = null;

  // INYECCIÓN DE SEGURIDAD Y ROLES
  const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
  const authHeaders = { Authorization: `Bearer ${getToken()}` };

  const usuarioLocal = JSON.parse(
    localStorage.getItem("usuarioFoxGamers") || "{}",
  );
  const esAdmin = (usuarioLocal.Rol || "").toUpperCase() === "ADMINISTRADOR";

  const placeholderImg =
    "https://placehold.co/400x400/f8fafc/1e293b?text=Subir+Imagen";
  const placeholderIcon = "https://placehold.co/50x50/f8fafc/1e293b?text=Img";
  const BASE_URL = "http://localhost:3000";

  // =======================================================
  // 1. INICIALIZACIÓN DE MÓDULO
  // =======================================================
  (async function init() {
    if (!localStorage.getItem("usuarioFoxGamers")) {
      return (window.location.href = "../../login/login.html");
    }

    // Ocultar botón de Nuevo Producto si NO es Admin
    const btnNuevo = document.getElementById("btnNuevoProducto");
    if (btnNuevo && !esAdmin) {
      btnNuevo.style.display = "none";
    }

    await cargarFamilias();
    listarProductos();
  })();

  // =======================================================
  // 2. CARGAR FAMILIAS EN EL INPUT SELECT
  // =======================================================
  async function cargarFamilias() {
    try {
      const res = await fetch(`${BASE_URL}/api/categorias`, {
        headers: authHeaders,
      });
      const data = await res.json();
      const select = document.getElementById("prodCategoria");

      if (!select) return;
      select.innerHTML =
        '<option value="" disabled selected>Seleccione Familia...</option>';

      data.forEach((c) => {
        if (c.Activo) {
          mapaCategorias[c.CategoriaID] = c.Nombre;
          select.innerHTML += `<option value="${c.CategoriaID}">${c.Nombre}</option>`;
        }
      });
    } catch (e) {
      console.error("Error al cargar familias:", e);
    }
  }

  // =======================================================
  // 3. MOTOR DE SMART NAMING CORPORATIVO
  // =======================================================
  const inputsParaNombre = ["prodCategoria", "prodModelo", "prodAtributo"];
  inputsParaNombre.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", construirNombre);
  });

  function construirNombre() {
    const catId = document.getElementById("prodCategoria").value;
    const mod = document.getElementById("prodModelo").value.trim();
    const atr = document.getElementById("prodAtributo").value.trim();

    const familia = mapaCategorias[catId] || "";
    const nombreFinal = `${familia} ${mod} ${atr ? "- " + atr : ""}`.trim();

    const preview = document.getElementById("prodPreviewNombre");
    if (preview) preview.textContent = nombreFinal || "Esperando datos...";

    return nombreFinal;
  }

  // =======================================================
  // 4. PREVIEW Y PASARELA DE IMÁGENES BINARIAS
  // =======================================================
  const inputImagen = document.getElementById("prodImagen");
  if (inputImagen) {
    inputImagen.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          Swal.fire(
            "Imagen muy pesada",
            "Elige una foto menor a 5MB",
            "warning",
          );
          this.value = "";
          archivoImagen = null;
          return;
        }

        archivoImagen = file;
        const reader = new FileReader();
        reader.onload = (event) => {
          document.getElementById("imgPreview").src = event.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        archivoImagen = null;
      }
    });
  }

  // =======================================================
  // 5. OBTENER PRODUCTOS DEL HOSTING
  // =======================================================
  async function listarProductos(terminoBusqueda = "") {
    const lblModo = document.getElementById("lblModoCargaProductos");
    try {
      const url =
        terminoBusqueda.trim() !== ""
          ? `${BASE_URL}/api/productos?q=${encodeURIComponent(terminoBusqueda)}`
          : `${BASE_URL}/api/productos`;

      const res = await fetch(url, { headers: authHeaders });
      listaProductosGlobal = await res.json();

      if (lblModo) {
        lblModo.textContent =
          terminoBusqueda.trim() !== ""
            ? `Resultados encontrados: ${listaProductosGlobal.length}`
            : "Mostrando últimos 5 registros";
        lblModo.className =
          terminoBusqueda.trim() !== ""
            ? "badge badge-info p-2"
            : "badge badge-secondary p-2";
      }

      renderizarTabla(listaProductosGlobal);
    } catch (e) {
      console.error("Error al listar productos:", e);
    }
  }

  // =======================================================
  // 6. RENDERIZADO DINÁMICO DE FILAS DE PRODUCTO
  // =======================================================
  function renderizarTabla(datos) {
    const tabla = document.getElementById("tablaProductos");
    if (!tabla) return;
    tabla.innerHTML = "";

    if (datos.length === 0) {
      tabla.innerHTML =
        '<tr><td colspan="6" class="text-center py-4 font-weight-bold" style="color: var(--fox-text-gray);">No hay productos en el catálogo.</td></tr>';
      return;
    }

    datos.forEach((p) => {
      const iconVisibilidad = p.Activo
        ? '<i class="fas fa-eye-slash"></i>'
        : '<i class="fas fa-eye"></i>';
      const btnClass = p.Activo ? "btn-secondary" : "btn-fox-cyan";
      const titleToggle = p.Activo ? "Desactivar" : "Activar";
      const rowStyle = p.Activo
        ? ""
        : "opacity: 0.5; filter: grayscale(1); background-color: #f1f5f9;";
      const urlImagen = p.ImagenURL
        ? `${BASE_URL}${p.ImagenURL}`
        : placeholderIcon;

      // Restricción Visual de Botones: Si no es Admin, el botón simplemente se pinta en gris y deshabilitado.
      const btnEditarHTML = esAdmin
        ? `<button onclick="prepararEdicionProd(${p.ProductoID})" class="btn btn-sm btn-fox mx-1" style="border-radius: 4px; width: 34px; height: 34px;" title="Editar" ${!p.Activo ? "disabled" : ""}><i class="fas fa-pencil-alt"></i></button>`
        : `<button class="btn btn-sm btn-light mx-1" style="border-radius: 4px; width: 34px; height: 34px; color:#cbd5e1" disabled><i class="fas fa-pencil-alt"></i></button>`;

      const btnVisibilidadHTML = esAdmin
        ? `<button onclick="toggleEstadoProducto(${p.ProductoID}, ${p.Activo ? 0 : 1})" class="btn btn-sm ${btnClass} mx-1" style="border-radius: 4px; width: 34px; height: 34px;" title="${titleToggle}">${iconVisibilidad}</button>`
        : `<button class="btn btn-sm btn-light mx-1" style="border-radius: 4px; width: 34px; height: 34px; color:#cbd5e1" disabled>${iconVisibilidad}</button>`;

      const btnEliminarHTML = esAdmin
        ? `<button onclick="eliminarProductoFisico(${p.ProductoID})" class="btn btn-sm btn-fox-danger mx-1" style="border-radius: 4px; width: 34px; height: 34px;" title="Eliminar" ${!p.Activo ? "disabled" : ""}><i class="fas fa-trash"></i></button>`
        : `<button class="btn btn-sm btn-light mx-1" style="border-radius: 4px; width: 34px; height: 34px; color:#cbd5e1" disabled><i class="fas fa-trash"></i></button>`;

      tabla.innerHTML += `
        <tr style="${rowStyle}">
            <td class="font-weight-bold" style="color: var(--fox-text-gray);">${p.ProductoID}</td>
            <td><img src="${urlImagen}" onerror="this.src='${placeholderIcon}'" style="height: 40px; width: 40px; object-fit: contain; border-radius: 4px; border: 1px solid #cbd5e1; background-color: #fff;"></td>
            <td class="text-left dato-critico">${p.Nombre}</td>
            <td><span class="badge badge-dark">${p.Codigo}</span></td>
            <td class="dato-critico">S/ ${p.PrecioVenta.toFixed(2)}</td>
            <td>
                <div class="btn-group">
                    ${btnEditarHTML}
                    ${btnVisibilidadHTML}
                    ${btnEliminarHTML}
                </div>
            </td>
        </tr>`;
    });
  }

  // =======================================================
  // 7. INSERCIÓN / EDICIÓN TRANSACCIONAL
  // =======================================================
  const formProd = document.getElementById("formProducto");
  if (formProd) {
    formProd.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!esAdmin)
        return Swal.fire(
          "Acceso Denegado",
          "Solo los administradores pueden alterar los catálogos",
          "error",
        );

      const costoVal = parseFloat(document.getElementById("prodCosto").value);
      const precioVal = parseFloat(document.getElementById("prodPrecio").value);
      const minimoVal = parseInt(document.getElementById("prodMinimo").value);

      if (costoVal < 0 || precioVal < 0 || minimoVal < 0) {
        return Swal.fire(
          "Valores Inválidos",
          "Ningún valor financiero o de stock puede ser menor a cero.",
          "error",
        );
      }
      if (precioVal < costoVal) {
        return Swal.fire(
          "Alerta de Pérdida",
          "El precio de venta no puede ser menor al costo de compra.",
          "warning",
        );
      }

      let estadoActual = 1;
      if (productoEditandoId) {
        const original = listaProductosGlobal.find(
          (p) => p.ProductoID === productoEditandoId,
        );
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

      if (archivoImagen) formData.append("imagen", archivoImagen);
      else if (imagenBase64) formData.append("ImagenURL", imagenBase64);

      const url = productoEditandoId
        ? `${BASE_URL}/api/productos/${productoEditandoId}`
        : `${BASE_URL}/api/productos`;
      const metodo = productoEditandoId ? "PUT" : "POST";

      try {
        const res = await fetch(url, {
          method: metodo,
          headers: authHeaders,
          body: formData,
        });
        const resData = await res.json();

        if (resData.success) {
          $("#modalProducto").modal("hide");
          listarProductos(document.getElementById("buscarProducto").value);
          archivoImagen = null;
          Swal.fire({
            icon: "success",
            title: "¡Operación Exitosa!",
            text: resData.mensaje,
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire("Atención", resData.mensaje, "warning");
        }
      } catch (err) {
        Swal.fire("Error", "Fallo de conexión con el servidor", "error");
      }
    });
  }

  // =======================================================
  // 8. APERTURA DE FORMULARIO EN MODO EDICIÓN
  // =======================================================
  window.prepararEdicionProd = (id) => {
    if (!esAdmin) return;
    const p = listaProductosGlobal.find((item) => item.ProductoID === id);
    if (p) {
      productoEditandoId = id;
      document.getElementById("prodCategoria").value = p.CategoriaID;
      document.getElementById("prodCodigo").value = p.Codigo;
      document.getElementById("prodModelo").value = p.ModeloBase;
      document.getElementById("prodAtributo").value = p.Atributo || "";
      document.getElementById("prodCosto").value = p.PrecioCompra;
      document.getElementById("prodPrecio").value = p.PrecioVenta;
      document.getElementById("prodMinimo").value = p.StockMinimo;

      archivoImagen = null;
      imagenBase64 = p.ImagenURL;

      const urlPreview = p.ImagenURL
        ? `${BASE_URL}${p.ImagenURL}`
        : placeholderImg;
      document.getElementById("imgPreview").src = urlPreview;
      document.getElementById("tituloModalProd").textContent =
        "Editar Ficha de Producto";
      construirNombre();

      $("#modalProducto").modal("show");
    }
  };

  // =======================================================
  // 9. OPERACIONES DE INTERFAZ
  // =======================================================
  window.toggleEstadoProducto = async (id, nuevoEstado) => {
    if (!esAdmin) return;
    try {
      const res = await fetch(`${BASE_URL}/api/productos/estado/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ nuevoEstado }),
      });
      const result = await res.json();
      if (result.success) {
        listarProductos(document.getElementById("buscarProducto").value);
        Swal.fire({
          icon: "success",
          title: "¡Estado Actualizado!",
          text: result.mensaje,
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  window.eliminarProductoFisico = async (id) => {
    if (!esAdmin) return;
    const p = listaProductosGlobal.find((item) => item.ProductoID === id);
    const conf = await Swal.fire({
      title: "¿Eliminar Producto?",
      text: `Borrarás permanentemente: ${p.Nombre}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, borrar",
    });

    if (conf.isConfirmed) {
      try {
        const res = await fetch(`${BASE_URL}/api/productos/${id}`, {
          method: "DELETE",
          headers: authHeaders,
        });
        const resData = await res.json();
        if (resData.success) {
          Swal.fire("¡Eliminado!", resData.mensaje, "success");
          listarProductos(document.getElementById("buscarProducto").value);
        } else {
          Swal.fire("Operación Bloqueada", resData.mensaje, "error");
        }
      } catch (e) {
        Swal.fire("Error", "No se pudo eliminar", "error");
      }
    }
  };

  // =======================================================
  // 10. DEBOUNCE SEARCH
  // =======================================================
  const inputBusqueda = document.getElementById("buscarProducto");
  if (inputBusqueda) {
    inputBusqueda.addEventListener("input", (e) => {
      const valor = e.target.value;
      clearTimeout(debounceTimeoutProductos);
      debounceTimeoutProductos = setTimeout(() => {
        listarProductos(valor);
      }, 400);
    });
  }

  // =======================================================
  // 11. GATILLO DE REGISTRO NUEVO
  // =======================================================
  const btnNuevoProd = document.getElementById("btnNuevoProducto");
  if (btnNuevoProd) {
    btnNuevoProd.addEventListener("click", () => {
      if (!esAdmin) return;
      productoEditandoId = null;
      imagenBase64 = null;
      archivoImagen = null;
      document.getElementById("formProducto").reset();
      document.getElementById("tituloModalProd").textContent =
        "Registrar Nuevo Producto";
      document.getElementById("imgPreview").src = placeholderImg;
      document.getElementById("prodPreviewNombre").textContent =
        "Esperando datos...";
      $("#modalProducto").modal("show");
    });
  }
})();