import { categoriasApi } from "./categoriasApi.js";
import { categoriasState } from "./categoriasState.js";

const regexBasura = /([a-zA-Z0-9])\1\1/;
const regexNombre = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-&]+$/;

let debounceTimeoutCategorias = null;

// ==========================================
// 1. FUNCIONES DE RENDERIZADO 
// ==========================================
const renderizarTabla = () => {
  const tabla = document.getElementById("tablaCategorias");
  if (!tabla) return;
  tabla.innerHTML = "";

  const datos = categoriasState.listaCategoriasGlobal;

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
      ? `<button onclick="toggleEstadoCatUI(${c.CategoriaID}, 0)" class="btn btn-sm btn-secondary mx-1" style="width: 34px; height: 34px;" title="Suspender"><i class="fas fa-eye-slash"></i></button>`
      : `<button onclick="toggleEstadoCatUI(${c.CategoriaID}, 1)" class="btn btn-sm btn-fox-cyan mx-1" style="width: 34px; height: 34px;" title="Reactivar"><i class="fas fa-eye"></i></button>`;

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
                    <button onclick="prepararEdicionCatUI(${c.CategoriaID})" class="btn btn-sm btn-fox mx-1" style="width: 34px; height: 34px;" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                    ${btnToggle}
                    <button onclick="eliminarCategoriaFisicaUI(${c.CategoriaID})" class="btn btn-sm btn-fox-danger mx-1" style="width: 34px; height: 34px;" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
  });
};

const actualizarLabelModo = (terminoBusqueda, cantidad) => {
  const lblModo = document.getElementById("lblModoCargaCategorias");
  if (lblModo) {
    lblModo.textContent =
      terminoBusqueda.trim() !== ""
        ? `Resultados encontrados: ${cantidad}`
        : "Mostrando últimos 5 registros";
    lblModo.className =
      terminoBusqueda.trim() !== ""
        ? "badge badge-info p-2"
        : "badge badge-secondary p-2";
  }
};

// ==========================================
// 2. LÓGICA DE INICIALIZACIÓN
// ==========================================
const listarCategorias = async (terminoBusqueda = "") => {
  try {
    const datos = await categoriasApi.obtenerCategorias(terminoBusqueda);
    categoriasState.setCategorias(datos);
    actualizarLabelModo(terminoBusqueda, datos.length);
    renderizarTabla();
  } catch (e) {
    console.error("Error cargando categorías:", e);
  }
};

const inicializarModulo = () => {
  if (!localStorage.getItem("usuarioFoxGamers")) {
    window.location.href = "../../login/login.html";
    return;
  }

  listarCategorias();

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

  const formCat = document.getElementById("formCategoria");
  if (formCat) {
    formCat.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombreLimpio = document.getElementById("catNombre").value.trim();
      const descripcionLimpia = document
        .getElementById("catDescripcion")
        .value.trim();

      if (!nombreLimpio)
        return Swal.fire(
          "Atención",
          "El nombre de la familia es obligatorio.",
          "warning",
        );

      if (!regexNombre.test(nombreLimpio) || regexBasura.test(nombreLimpio)) {
        return Swal.fire(
          "Texto Inválido",
          "El nombre contiene caracteres no permitidos o texto sin sentido.",
          "error",
        );
      }

      const categoriaEditandoId = categoriasState.getEditandoId();

      const existe = categoriasState.listaCategoriasGlobal.some(
        (c) =>
          c.Nombre.toLowerCase() === nombreLimpio.toLowerCase() &&
          c.CategoriaID !== categoriaEditandoId,
      );

      if (existe && !categoriaEditandoId) {
        return Swal.fire(
          "Atención",
          "Ya existe una categoría con ese nombre.",
          "warning",
        );
      }

      const data = { Nombre: nombreLimpio, Descripcion: descripcionLimpia };

      try {
        const result = categoriaEditandoId
          ? await categoriasApi.actualizarCategoria(categoriaEditandoId, data)
          : await categoriasApi.crearCategoria(data);

        if (result.success) {
          $("#modalCategoria").modal("hide");
          listarCategorias(
            document.getElementById("buscarCategoria")?.value || "",
          );
          Swal.fire("¡Éxito!", result.mensaje, "success");
        } else {
          Swal.fire("Error", result.mensaje, "error");
        }
      } catch (e) {
        Swal.fire("Error", "Fallo al comunicar con el servidor.", "error");
      }
    });
  }

  const btnAbrirModal = document.getElementById("btnCrearCategoriaModal");
  if (btnAbrirModal) {
    btnAbrirModal.addEventListener("click", () => {
      categoriasState.limpiarEdicion();
      document.getElementById("formCategoria").reset();
      document.getElementById("tituloModalCategoria").textContent =
        "Nueva Categoría";
      $("#modalCategoria").modal("show");
    });
  }

  // ==========================================
  // 3. EXPOSICIÓN DE FUNCIONES GLOBALES 
  // ==========================================
  window.toggleEstadoCatUI = async (id, nuevoEstado) => {
    try {
      const result = await categoriasApi.cambiarEstado(id, nuevoEstado);
      if (result.success) {
        listarCategorias(
          document.getElementById("buscarCategoria")?.value || "",
        );
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

  window.prepararEdicionCatUI = (id) => {
    const c = categoriasState.getCategoriaById(id);
    if (c) {
      categoriasState.setEditandoId(id);
      document.getElementById("catNombre").value = c.Nombre;
      document.getElementById("catDescripcion").value = c.Descripcion || "";
      document.getElementById("tituloModalCategoria").textContent =
        "Editar Categoría";
      $("#modalCategoria").modal("show");
    }
  };

  window.eliminarCategoriaFisicaUI = async (id) => {
    const cat = categoriasState.getCategoriaById(id);
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
        const result = await categoriasApi.eliminarCategoria(id);
        if (result.success) {
          Swal.fire("¡Eliminado!", result.mensaje, "success");
          listarCategorias(
            document.getElementById("buscarCategoria")?.value || "",
          );
        } else {
          Swal.fire("Acción Bloqueada", result.mensaje, "warning");
        }
      } catch (e) {
        Swal.fire("Error", "No se pudo conectar con el servidor.", "error");
      }
    }
  };
};

inicializarModulo();