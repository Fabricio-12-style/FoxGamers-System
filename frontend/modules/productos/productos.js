(() => {
  let productoEditandoId = null;
  let listaProductosGlobal = [];
  let mapaCategorias = {};
  let imagenBase64 = null;

  const placeholderImg =
    "https://placehold.co/400x400/1e293b/00f2ff?text=Subir+Imagen";

  (async function init() {
    if (!localStorage.getItem("usuarioFoxGamers")) {
      return (window.location.href = "../../login/login.html");
    }
    await cargarFamilias();
    listarProductos();
  })();

  // 1. CARGAR FAMILIAS PARA EL SELECT
  async function cargarFamilias() {
    try {
      const res = await fetch("http://localhost:3000/api/categorias");
      const data = await res.json();
      const select = document.getElementById("prodCategoria");

      if (!select) return;
      select.innerHTML = '<option value="">Seleccione Familia...</option>';

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

  // 2. LÓGICA DE SMART NAMING
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

  // 3. PREVISUALIZACIÓN DE IMAGEN Y CONVERSIÓN A BASE64
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
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          imagenBase64 = event.target.result;
          document.getElementById("imgPreview").src = imagenBase64;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 4. RENDERIZAR TABLA DE PRODUCTOS
  function renderizarTabla(datos) {
    const tabla = document.getElementById("tablaProductos");
    if (!tabla) return;
    tabla.innerHTML = "";

    if (datos.length === 0) {
      tabla.innerHTML =
        '<tr><td colspan="6" class="text-center text-muted py-4">No hay productos en el catálogo.</td></tr>';
      return;
    }

    datos.forEach((p) => {
      const iconVisibilidad = p.Activo
        ? '<i class="fas fa-eye-slash"></i>'
        : '<i class="fas fa-eye"></i>';
      const btnClass = p.Activo ? "btn-secondary" : "btn-info";
      const titleToggle = p.Activo ? "Desactivar" : "Activar";
      const rowStyle = p.Activo
        ? ""
        : "opacity: 0.6; filter: grayscale(1); background-color: #f8f9fa;";

      tabla.innerHTML += `
                <tr style="${rowStyle}">
                    <td class="text-muted small">${p.ProductoID}</td>
                    <td>
                        <img src="${p.ImagenURL || placeholderImg}" style="height: 40px; width: 40px; object-fit: contain; border-radius: 4px; border: 1px solid #334155;">
                    </td>
                    <td class="text-left font-weight-bold" style="color: var(--fox-dark); border-radius: 4px; padding: 10px;">
                        ${p.Nombre}
                    </td>
                    <td><span class="badge badge-dark text-white-50 font-weight-bold">${p.Codigo}</span></td>
                    <td class="font-weight-bold" style="color: var(--fox-dark);">S/ ${p.PrecioVenta.toFixed(2)}</td>
                    <td>
                        <button onclick="prepararEdicionProd(${p.ProductoID})" class="btn btn-sm btn-warning text-white" title="Editar" ${!p.Activo ? "disabled" : ""}>
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button onclick="toggleEstadoProducto(${p.ProductoID}, ${p.Activo ? 0 : 1})" class="btn btn-sm ${btnClass} mx-1" title="${titleToggle}">
                            ${iconVisibilidad}
                        </button>
                        <button onclick="eliminarProductoFisico(${p.ProductoID})" class="btn btn-sm btn-danger text-white" title="Eliminar" ${!p.Activo ? "disabled" : ""}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
    });
  }

  async function listarProductos() {
    try {
      const res = await fetch("http://localhost:3000/api/productos");
      listaProductosGlobal = await res.json();
      renderizarTabla(listaProductosGlobal);
    } catch (e) {
      console.error("Error al listar productos:", e);
    }
  }

  // 5. GUARDAR / ACTUALIZAR BLINDADO
  const formProd = document.getElementById("formProducto");
  if (formProd) {
    formProd.addEventListener("submit", async (e) => {
      e.preventDefault();

      const costoVal = parseFloat(document.getElementById("prodCosto").value);
      const precioVal = parseFloat(document.getElementById("prodPrecio").value);
      const minimoVal = parseInt(document.getElementById("prodMinimo").value);

      // VALIDACIÓN FRONTAL ESTRICTA
      if (costoVal < 0 || precioVal < 0 || minimoVal < 0) {
        Swal.fire(
          "Valores Inválidos",
          "Ningún valor financiero o de stock puede ser menor a cero.",
          "error",
        );
        return;
      }
      if (precioVal < costoVal) {
        Swal.fire(
          "Alerta de Pérdida",
          "El precio de venta no puede ser menor al costo de compra.",
          "warning",
        );
        return;
      }

      let estadoActual = 1;
      if (productoEditandoId) {
        const original = listaProductosGlobal.find(
          (p) => p.ProductoID === productoEditandoId,
        );
        estadoActual = original ? original.Activo : 1;
      }

      const data = {
        CategoriaID: document.getElementById("prodCategoria").value,
        Codigo: document.getElementById("prodCodigo").value.trim(),
        ModeloBase: document.getElementById("prodModelo").value.trim(),
        Atributo: document.getElementById("prodAtributo").value.trim(),
        PrecioCompra: costoVal,
        PrecioVenta: precioVal,
        StockMinimo: minimoVal,
        ImagenURL: imagenBase64,
        Activo: estadoActual,
      };

      const url = productoEditandoId
        ? `http://localhost:3000/api/productos/${productoEditandoId}`
        : "http://localhost:3000/api/productos";
      const metodo = productoEditandoId ? "PUT" : "POST";

      try {
        const res = await fetch(url, {
          method: metodo,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const resData = await res.json();

        if (resData.success) {
          $("#modalProducto").modal("hide");
          listarProductos();
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

  window.prepararEdicionProd = (id) => {
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

      imagenBase64 = p.ImagenURL;
      document.getElementById("imgPreview").src = p.ImagenURL || placeholderImg;
      document.getElementById("tituloModalProd").textContent =
        "Editar Ficha de Producto";
      construirNombre();

      $("#modalProducto").modal("show");
    }
  };

  window.toggleEstadoProducto = async (id, nuevoEstado) => {
    try {
      const res = await fetch(
        `http://localhost:3000/api/productos/estado/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nuevoEstado }),
        },
      );
      const result = await res.json();
      if (result.success) {
        listarProductos();
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
    const p = listaProductosGlobal.find((item) => item.ProductoID === id);
    const conf = await Swal.fire({
      title: "¿Eliminar Producto?",
      text: `Borrarás permanentemente: ${p.Nombre}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, borrar definitivamente",
    });

    if (conf.isConfirmed) {
      try {
        const res = await fetch(`http://localhost:3000/api/productos/${id}`, {
          method: "DELETE",
        });
        const resData = await res.json();
        if (resData.success) {
          Swal.fire("¡Eliminado!", resData.mensaje, "success");
          listarProductos();
        } else {
          Swal.fire("Operación Bloqueada", resData.mensaje, "error"); // Atrapa el error de FK del backend
        }
      } catch (e) {
        Swal.fire("Error", "No se pudo eliminar", "error");
      }
    }
  };

  // 6. Buscador en tiempo real
  const inputBusqueda = document.getElementById("buscarProducto");
  if (inputBusqueda) {
    inputBusqueda.addEventListener("input", (e) => {
      const txt = e.target.value.toLowerCase();
      const filtrados = listaProductosGlobal.filter(
        (p) =>
          p.Nombre.toLowerCase().includes(txt) ||
          p.Codigo.toLowerCase().includes(txt),
      );
      renderizarTabla(filtrados);
    });
  }

  // 7. Abrir Modal Nuevo
  const btnNuevo = document.getElementById("btnNuevoProducto");
  if (btnNuevo) {
    btnNuevo.addEventListener("click", () => {
      productoEditandoId = null;
      imagenBase64 = null;
      document.getElementById("formProducto").reset();
      document.getElementById("tituloModalProd").textContent =
        "Registrar Nuevo Producto";
      document.getElementById("imgPreview").src = placeholderImg;
      document.getElementById("prodPreviewNombre").textContent = "-";
      $("#modalProducto").modal("show");
    });
  }
})();