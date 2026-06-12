(() => {
  let categoriaEditandoId = null;
  let listaCategoriasGlobal = [];
  let debounceTimeoutCategorias = null;

  const regexBasura = /([a-zA-Z0-9])\1\1/;
  const regexNombre = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-&]+$/;
  const BASE_URL = "http://localhost:3000";

  // =======================================================
  // 1. VERIFICACIÓN DE SESIÓN
  // =======================================================
  const usuarioString = localStorage.getItem("usuarioFoxGamers");
  if (!usuarioString) return (window.location.href = "../../login/login.html");

  listarCategorias();

  // =======================================================
  // 2. OBTENER CATEGORÍAS (HÍBRIDO TOP-5 / SEARCH)
  // =======================================================
  async function listarCategorias(terminoBusqueda = "") {
    const lblModo = document.getElementById("lblModoCargaCategorias");
    try {
      const url =
        terminoBusqueda.trim() !== ""
          ? `${BASE_URL}/api/categorias?q=${encodeURIComponent(terminoBusqueda)}`
          : `${BASE_URL}/api/categorias`;

      const res = await fetch(url);
      listaCategoriasGlobal = await res.json();

      if (lblModo) {
        lblModo.textContent =
          terminoBusqueda.trim() !== ""
            ? `Resultados encontrados: ${listaCategoriasGlobal.length}`
            : "Mostrando últimos 5 registros";
        lblModo.className =
          terminoBusqueda.trim() !== ""
            ? "badge badge-info p-2"
            : "badge badge-secondary p-2";
      }

      renderizarTabla(listaCategoriasGlobal);
    } catch (e) {
      console.error(e);
    }
  }

  // =======================================================
  // 3. RENDERIZADO DINÁMICO DE LA TABLA
  // =======================================================
  function renderizarTabla(datos) {
    const tabla = document.getElementById("tablaCategorias");
    if (!tabla) return;
    tabla.innerHTML = "";

    if (datos.length === 0) {
      tabla.innerHTML =
        '<tr><td colspan="5" class="text-center py-4 font-weight-bold" style="color: var(--fox-text-gray);">No hay familias registradas.</td></tr>';
      return;
    }

    datos.forEach((c) => {
      const statusBadge = c.Activo
        ? '<span class="badge badge-success">Activa</span>'
        : '<span class="badge badge-secondary">Suspendida</span>';

      const btnToggle = c.Activo
        ? `<button onclick="toggleEstadoCat(${c.CategoriaID}, 0)" class="btn btn-sm btn-secondary mx-1" style="width: 34px; height: 34px;" title="Suspender"><i class="fas fa-eye-slash"></i></button>`
        : `<button onclick="toggleEstadoCat(${c.CategoriaID}, 1)" class="btn btn-sm btn-fox-cyan mx-1" style="width: 34px; height: 34px;" title="Reactivar"><i class="fas fa-eye"></i></button>`;

      const rowStyle = c.Activo
        ? ""
        : "opacity: 0.5; filter: grayscale(1); background-color: #f1f5f9;";

      tabla.innerHTML += `
        <tr style="${rowStyle}">
            <td class="font-weight-bold" style="color: var(--fox-text-gray);">${c.CategoriaID}</td>
            <td class="text-left dato-critico" style="padding-left: 15px;">${c.Nombre}</td>
            <td class="text-left font-weight-bold" style="color: var(--fox-text-gray);">${c.Descripcion || "-"}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="btn-group">
                    <button onclick="prepararEdicionCat(${c.CategoriaID})" class="btn btn-sm btn-fox mx-1" style="width: 34px; height: 34px;" title="Editar">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    ${btnToggle}
                    <button onclick="eliminarCategoriaFisica(${c.CategoriaID})" class="btn btn-sm btn-fox-danger mx-1" style="width: 34px; height: 34px;" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    });
  }

  // =======================================================
  // 4. MOTOR DE ESCUDO DEBOUNCE (PROTECTOR DEL HOSTING)
  // =======================================================
  const inputBuscar = document.getElementById("buscarCategoria");
  if (inputBuscar) {
    inputBuscar.addEventListener("input", (e) => {
      const valor = e.target.value;
      clearTimeout(debounceTimeoutCategorias);
      debounceTimeoutCategorias = setTimeout(() => {
        listarCategorias(valor);
      }, 400);
    });
  }

  // =======================================================
  // 5. GUARDAR O ACTUALIZAR FAMILIA CON VALIDACIONES
  // =======================================================
  const formCat = document.getElementById("formCategoria");
  if (formCat) {
    formCat.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombreLimpio = document.getElementById("catNombre").value.trim();
      const descripcionLimpia = document
        .getElementById("catDescripcion")
        .value.trim();

      if (!nombreLimpio) {
        return Swal.fire(
          "Atención",
          "El nombre de la familia es obligatorio.",
          "warning",
        );
      }

      if (!regexNombre.test(nombreLimpio) || regexBasura.test(nombreLimpio)) {
        return Swal.fire(
          "Texto Inválido",
          "El nombre contiene caracteres no permitidos o texto sin sentido.",
          "error",
        );
      }

      const existe = listaCategoriasGlobal.some(
        (c) =>
          c.Nombre.toLowerCase() === nombreLimpio.toLowerCase() &&
          c.CategoriaID !== categoriaEditandoId,
      );
      if (existe && !categoriaEditandoId) {
        return Swal.fire(
          "Atención",
          "Ya existe una categoría con ese nombre en los registros actuales.",
          "warning",
        );
      }

      const data = { Nombre: nombreLimpio, Descripcion: descripcionLimpia };
      const url = categoriaEditandoId
        ? `${BASE_URL}/api/categorias/${categoriaEditandoId}`
        : `${BASE_URL}/api/categorias`;
      const method = categoriaEditandoId ? "PUT" : "POST";

      try {
        const res = await fetch(url, {
          method: method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();

        if (result.success) {
          $("#modalCategoria").modal("hide");
          listarCategorias(document.getElementById("buscarCategoria").value);
          Swal.fire("¡Éxito!", result.mensaje, "success");
        } else {
          Swal.fire("Error", result.mensaje, "error");
        }
      } catch (e) {
        Swal.fire("Error", "Fallo al comunicar con el servidor.", "error");
      }
    });
  }

  // =======================================================
  // 6. CAMBIAR ESTADO DE VISIBILIDAD (PATCH)
  // =======================================================
  window.toggleEstadoCat = async (id, nuevoEstado) => {
    try {
      const res = await fetch(`${BASE_URL}/api/categorias/estado/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nuevoEstado }),
      });
      const result = await res.json();
      if (result.success) {
        listarCategorias(document.getElementById("buscarCategoria").value);
        Swal.fire({
          icon: "success",
          title: "Estado actualizado",
          timer: 1000,
          showConfirmButton: false,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // =======================================================
  // 7. PREPARAR FORMULARIO PARA EDICIÓN
  // =======================================================
  window.prepararEdicionCat = (id) => {
    const c = listaCategoriasGlobal.find((item) => item.CategoriaID === id);
    if (c) {
      categoriaEditandoId = id;
      document.getElementById("catNombre").value = c.Nombre;
      document.getElementById("catDescripcion").value = c.Descripcion || "";
      document.getElementById("tituloModalCategoria").textContent =
        "Editar Categoría";
      $("#modalCategoria").modal("show");
    }
  };

  // =======================================================
  // 8. LIMPIAR FORMULARIO PARA CREACIÓN
  // =======================================================
  const btnAbrirModal = document.getElementById("btnCrearCategoriaModal");
  if (btnAbrirModal) {
    btnAbrirModal.addEventListener("click", () => {
      categoriaEditandoId = null;
      document.getElementById("formCategoria").reset();
      document.getElementById("tituloModalCategoria").textContent =
        "Nueva Categoría";
      $("#modalCategoria").modal("show");
    });
  }

  // =======================================================
  // 9. ELIMINAR CATEGORÍA FÍSICAMENTE (RESTRICCIÓN DE LLAVE)
  // =======================================================
  window.eliminarCategoriaFisica = async (id) => {
    const cat = listaCategoriasGlobal.find((c) => c.CategoriaID === id);
    const conf = await Swal.fire({
      title: "¿Eliminar Familia?",
      text: `¿Estás seguro de borrar "${cat.Nombre}"? Esta acción es permanente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, borrar de la BD",
    });

    if (conf.isConfirmed) {
      try {
        const res = await fetch(`${BASE_URL}/api/categorias/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire("¡Eliminado!", data.mensaje, "success");
          listarCategorias(document.getElementById("buscarCategoria").value);
        } else {
          Swal.fire("Acción Bloqueada", data.mensaje, "warning");
        }
      } catch (e) {
        Swal.fire("Error", "No se pudo conectar con el servidor.", "error");
      }
    }
  };
})();