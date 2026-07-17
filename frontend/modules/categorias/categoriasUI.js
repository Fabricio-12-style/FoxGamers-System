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
      '<tr><td colspan="6" class="text-center py-4 font-weight-bold" style="color: var(--fox-text-gray);">No hay familias registradas.</td></tr>';
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
        <tr style="${rowStyle}" class="fila-principal-categoria">
            <td class="d-table-cell d-md-none align-middle text-center" style="width: 48px; padding: 12px 5px;">
                <button class="btn btn-sm btn-light btn-expandir-categoria m-0 shadow-sm" style="border-radius: 50%;">
                    <i class="fas fa-plus text-primary" style="font-size: 1rem;"></i>
                </button>
            </td>
            <td class="font-weight-bold d-none d-md-table-cell" style="color: var(--fox-text-gray);">${c.CategoriaID}</td>
            <td class="text-left dato-critico pl-3 pl-md-4 align-middle">${c.Nombre}</td>
            <td class="text-left font-weight-bold d-none d-md-table-cell" style="color: var(--fox-text-gray);">${c.Descripcion || "-"}</td>
            <td class="d-none d-md-table-cell">${statusBadge}</td>
            <td class="d-none d-md-table-cell">
                <div class="btn-group">
                    <button onclick="prepararEdicionCatUI(${c.CategoriaID})" class="btn btn-sm btn-fox mx-1" style="width: 34px; height: 34px;" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                    ${btnToggle}
                    <button onclick="eliminarCategoriaFisicaUI(${c.CategoriaID})" class="btn btn-sm btn-fox-danger mx-1" style="width: 34px; height: 34px;" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
        <tr class="fila-detalle-categoria d-none d-md-none shadow-inner">
            <td colspan="6" class="p-3 text-left" style="background: #f8fafc; border-bottom: 3px solid var(--fox-cyan);">
                <div class="mb-2" style="min-width: 0;">
                    <small class="text-uppercase font-weight-bold" style="color: var(--fox-text-gray); font-size: 0.65rem;">Descripción</small>
                    <div class="font-weight-bold text-muted" style="display: block; max-width: 100%; overflow-wrap: anywhere; word-break: break-word; white-space: normal; line-height: 1.35;">${c.Descripcion || "-"}</div>
                </div>
                <div class="mb-3">
                    <small class="text-uppercase font-weight-bold" style="color: var(--fox-text-gray); font-size: 0.65rem;">Estado</small>
                    <div>${statusBadge}</div>
                </div>
                <div class="d-flex justify-content-between w-100 flex-wrap" style="gap: 0.35rem;">
                    <button onclick="prepararEdicionCatUI(${c.CategoriaID})" class="btn btn-fox flex-fill mr-1 font-weight-bold text-truncate" style="border-radius: 6px; padding: 10px 0; font-size: 0.82rem;">
                        <i class="fas fa-pencil-alt mr-1"></i> Editar
                    </button>
                    <button onclick="toggleEstadoCatUI(${c.CategoriaID}, ${c.Activo ? 0 : 1})" class="btn ${c.Activo ? "btn-secondary" : "btn-fox-cyan"} flex-fill mx-1 font-weight-bold text-truncate" style="border-radius: 6px; padding: 10px 0; font-size: 0.82rem;">
                        <i class="fas ${c.Activo ? "fa-eye-slash" : "fa-eye"} mr-1"></i> ${c.Activo ? "Suspender" : "Reactivar"}
                    </button>
                    <button onclick="eliminarCategoriaFisicaUI(${c.CategoriaID})" class="btn btn-fox-danger flex-fill ml-1 font-weight-bold text-truncate" style="border-radius: 6px; padding: 10px 0; font-size: 0.82rem;">
                        <i class="fas fa-trash mr-1"></i> Borrar
                    </button>
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

  document.getElementById("tablaCategorias")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-expandir-categoria");
    if (btn) {
      const filaPrincipal = btn.closest(".fila-principal-categoria");
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
