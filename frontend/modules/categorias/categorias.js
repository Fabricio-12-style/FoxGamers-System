(() => {
  let categoriaEditandoId = null;
  let listaCategoriasGlobal = [];

  // 1. Expresiones regulares de validación
  const regexBasura = /([a-zA-Z0-9])\1\1/;
  const regexNombre = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-&]+$/;

  // 2. Verificación de sesión
  const usuarioString = localStorage.getItem("usuarioFoxGamers");
  if (!usuarioString) return (window.location.href = "../../login/login.html");

  listarCategorias();

  // 3. Renderizado de tabla dinámico
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

      // Uso de las nuevas clases de botones Fox
      const btnToggle = c.Activo
        ? `<button onclick="toggleEstadoCat(${c.CategoriaID}, 0)" class="btn btn-sm btn-secondary mx-1" style="width: 34px; height: 34px;" title="Suspender"><i class="fas fa-eye-slash"></i></button>`
        : `<button onclick="toggleEstadoCat(${c.CategoriaID}, 1)" class="btn btn-sm btn-fox-cyan mx-1" style="width: 34px; height: 34px;" title="Reactivar"><i class="fas fa-eye"></i></button>`;

      const rowStyle = c.Activo
        ? ""
        : "opacity: 0.5; filter: grayscale(1); background-color: #f1f5f9;";

      tabla.innerHTML += `
        <tr style="${rowStyle}">
            <td class="font-weight-bold" style="color: var(--fox-text-gray);">${c.CategoriaID}</td>
            <td class="text-left dato-critico" style="padding-left: 15px;">
                ${c.Nombre}
            </td>
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
        </tr>
      `;
    });
  }

  // 4. Obtener categorías del servidor
  async function listarCategorias() {
    try {
      const res = await fetch("http://localhost:3000/api/categorias");
      listaCategoriasGlobal = await res.json();
      renderizarTabla(listaCategoriasGlobal);
    } catch (e) {
      console.error(e);
    }
  }

  // 5. Configurar búsqueda en tiempo real
  const inputBuscar = document.getElementById("buscarCategoria");
  if (inputBuscar) {
    inputBuscar.addEventListener("input", (e) => {
      const txt = e.target.value.toLowerCase();
      const filtrados = listaCategoriasGlobal.filter((c) =>
        c.Nombre.toLowerCase().includes(txt),
      );
      renderizarTabla(filtrados);
    });
  }

  // 6. Guardar o Actualizar categoría (Con validaciones)
  const formCat = document.getElementById("formCategoria");
  if (formCat) {
    formCat.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombreLimpio = document.getElementById("catNombre").value.trim();
      const descripcionLimpia = document
        .getElementById("catDescripcion")
        .value.trim();

      // Validación 1: Vacíos
      if (!nombreLimpio) {
        Swal.fire(
          "Atención",
          "El nombre de la familia es obligatorio.",
          "warning",
        );
        return;
      }

      // Validación 2: Anti-Basura y caracteres extraños
      if (!regexNombre.test(nombreLimpio) || regexBasura.test(nombreLimpio)) {
        Swal.fire(
          "Texto Inválido",
          "El nombre contiene caracteres no permitidos o texto sin sentido.",
          "error",
        );
        return;
      }

      // Validación 3: Anti-Duplicados en Frontend
      const existe = listaCategoriasGlobal.some(
        (c) =>
          c.Nombre.toLowerCase() === nombreLimpio.toLowerCase() &&
          c.CategoriaID !== categoriaEditandoId,
      );
      if (existe) {
        Swal.fire(
          "Atención",
          "Ya existe una categoría con ese nombre.",
          "warning",
        );
        return;
      }

      const data = { Nombre: nombreLimpio, Descripcion: descripcionLimpia };
      const url = categoriaEditandoId
        ? `http://localhost:3000/api/categorias/${categoriaEditandoId}`
        : "http://localhost:3000/api/categorias";
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
          listarCategorias();
          Swal.fire("¡Éxito!", result.mensaje, "success");
        } else {
          Swal.fire("Error", result.mensaje, "error");
        }
      } catch (e) {
        Swal.fire("Error", "Fallo al comunicar con el servidor.", "error");
      }
    });
  }

  // 7. Cambiar estado (Activar/Suspender)
  window.toggleEstadoCat = async (id, nuevoEstado) => {
    try {
      const res = await fetch(
        `http://localhost:3000/api/categorias/estado/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nuevoEstado }),
        },
      );
      const result = await res.json();
      if (result.success) {
        listarCategorias();
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

  // 8. Preparar formulario para edición
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

  // 9. Limpiar formulario para creación
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

  // 10. Eliminar categoría de la BD
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
        const res = await fetch(`http://localhost:3000/api/categorias/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire("¡Eliminado!", data.mensaje, "success");
          listarCategorias();
        } else {
          Swal.fire("Acción Bloqueada", data.mensaje, "warning");
        }
      } catch (e) {
        Swal.fire("Error", "No se pudo conectar con el servidor.", "error");
      }
    }
  };
})();
