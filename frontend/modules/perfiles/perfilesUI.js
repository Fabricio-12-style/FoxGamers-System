import { perfilesApi } from "./perfilesApi.js";
import { perfilesState } from "./perfilesState.js";

const modulosSistema = [
  { id: "dashboard", nombre: "Dashboard", icono: "fa-tachometer-alt" },
  { id: "pos", nombre: "Punto de Venta", icono: "fa-cash-register" },
  { id: "inventario", nombre: "Inventario", icono: "fa-box-open" },
  { id: "productos", nombre: "Productos", icono: "fa-boxes" },
  { id: "categorias", nombre: "Categorías", icono: "fa-tags" },
  { id: "clientes", nombre: "Clientes", icono: "fa-users" },
  { id: "proveedores", nombre: "Proveedores", icono: "fa-truck" },
  { id: "usuarios", nombre: "Usuarios", icono: "fa-users-cog" },
  { id: "perfiles", nombre: "Perfiles", icono: "fa-user-lock" },
  { id: "configuracion", nombre: "Configuración Web", icono: "fa-sliders-h" },
  { id: "reportes", nombre: "Reportes y Analítica", icono: "fa-chart-pie" },
];

// ==========================================
// 1. RENDERIZADO DE TABLA 
// ==========================================
const renderizarTabla = (lista) => {
  const tabla = document.getElementById("tablaPerfiles");
  if (!tabla) return;
  tabla.innerHTML = "";

  if (lista.length === 0) {
    tabla.innerHTML =
      '<tr><td colspan="6" class="text-muted font-weight-bold py-4">No se encontraron perfiles.</td></tr>';
    return;
  }

  lista.forEach((p) => {
    const isActivo = p.Activo === true || p.Activo === 1;
    const esAdmin =
      p.PerfilID === 1 || p.Nombre.toUpperCase() === "ADMINISTRADOR";
    const badgeEstado = isActivo
      ? '<span class="badge badge-success">Activo</span>'
      : '<span class="badge badge-secondary">Inactivo</span>';
    const rowStyle = isActivo
      ? ""
      : "opacity: 0.5; filter: grayscale(1); background-color: #f1f5f9;";
    const btnBloquearClass = isActivo ? "btn-secondary" : "btn-fox-cyan";
    const iconBloquear = isActivo ? "fa-ban" : "fa-check";

    const btnBloquear = esAdmin
      ? `<button class="btn btn-sm btn-secondary mx-1 shadow-sm" style="width: 32px; height: 32px;" disabled><i class="fas fa-ban"></i></button>`
      : `<button onclick="bloquearPerfilUI(${p.PerfilID}, ${isActivo ? 0 : 1})" class="btn btn-sm ${btnBloquearClass} mx-1 shadow-sm" style="width: 32px; height: 32px;" title="${isActivo ? "Desactivar" : "Activar"}"><i class="fas ${iconBloquear}"></i></button>`;

    tabla.innerHTML += `
        <tr style="${rowStyle}">
            <td class="font-weight-bold" style="color: var(--fox-text-gray);">${p.PerfilID}</td>
            <td class="text-left dato-critico pl-4">${p.Nombre}</td>
            <td class="text-left font-weight-bold" style="color: var(--fox-text-gray); font-size: 0.85rem;">${p.Descripcion || "-"}</td>
            <td>${badgeEstado}</td>
            <td class="font-weight-bold" style="color: var(--fox-text-gray); font-size: 0.85rem;">${new Date(p.FechaCreacion).toLocaleString("es-PE")}</td>
            <td>
                <div class="btn-group">
                    <button onclick="verPermisosUI(${p.PerfilID})" class="btn btn-sm btn-fox-cyan mx-1 shadow-sm" style="width: 32px; height: 32px;" title="Permisos"><i class="fas fa-key"></i></button>
                    <button onclick="editarPerfilUI(${p.PerfilID})" class="btn btn-sm btn-fox mx-1 shadow-sm" style="width: 32px; height: 32px;" title="Editar" ${esAdmin ? "disabled" : ""}><i class="fas fa-pencil-alt"></i></button>
                    ${btnBloquear}
                    <button onclick="eliminarPerfilUI(${p.PerfilID})" class="btn btn-sm btn-fox-danger mx-1 shadow-sm" style="width: 32px; height: 32px;" title="Eliminar" ${esAdmin ? "disabled" : ""}><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
  });
};

// ==========================================
// 2. LÓGICA DE INICIALIZACIÓN
// ==========================================
const listarPerfiles = async () => {
  try {
    const datos = await perfilesApi.obtenerPerfiles();
    if (Array.isArray(datos)) {
      perfilesState.setPerfiles(datos);
      renderizarTabla(datos);
    }
  } catch (e) {
    console.error(e);
  }
};

const inicializarModulo = () => {
  const usuarioLogueado = JSON.parse(
    localStorage.getItem("usuarioFoxGamers") || "{}",
  );
  if ((usuarioLogueado.Rol || "").toUpperCase() !== "ADMINISTRADOR") {
    Swal.fire("Acceso Denegado", "Módulo restringido.", "error");
    document.getElementById("app-content").innerHTML =
      `<div class="alert alert-danger m-4 text-center font-weight-bold">Acceso no autorizado.</div>`;
    return;
  }

  listarPerfiles();

  // Buscador
  const buscador = document.getElementById("busquedaPerfil");
  if (buscador) {
    buscador.addEventListener("input", (e) => {
      const termino = e.target.value.toLowerCase().trim();
      const filtrados = perfilesState
        .getPerfiles()
        .filter(
          (p) =>
            p.Nombre.toLowerCase().includes(termino) ||
            (p.Descripcion || "").toLowerCase().includes(termino),
        );
      renderizarTabla(filtrados);
    });
  }

  // Formularios (Crear, Editar, Permisos)
  document
    .getElementById("formCrearPerfil")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        Nombre: document.getElementById("nuevoPerfNombre").value,
        Descripcion: document.getElementById("nuevoPerfDesc").value.trim(),
      };
      if (!data.Nombre || !data.Descripcion || data.Descripcion.length < 10)
        return Swal.fire(
          "Atención",
          "Datos incompletos o descripción muy corta.",
          "warning",
        );

      try {
        const result = await perfilesApi.crearPerfil(data);
        if (result.success) {
          $("#modalCrearPerfil").modal("hide");
          listarPerfiles();
          Swal.fire({
            icon: "success",
            title: "¡Perfil Creado!",
            text: "Asigna permisos en el botón de la llave.",
            timer: 2000,
            showConfirmButton: false,
          });
        } else Swal.fire("Atención", result.mensaje, "warning");
      } catch (e) {
        Swal.fire("Error", "Fallo de servidor.", "error");
      }
    });

  document
    .getElementById("formEditarPerfil")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = perfilesState.getEditandoId();
      if (id === 1)
        return Swal.fire(
          "Error",
          "Operación denegada sobre perfil raíz.",
          "error",
        );

      const data = {
        Nombre: document.getElementById("editPerfNombre").value,
        Descripcion: document.getElementById("editPerfDesc").value.trim(),
      };
      try {
        const result = await perfilesApi.actualizarPerfil(id, data);
        if (result.success) {
          $("#modalEditarPerfil").modal("hide");
          listarPerfiles();
          Swal.fire({
            icon: "success",
            title: "¡Éxito!",
            text: "Perfil actualizado.",
            timer: 1500,
            showConfirmButton: false,
          });
        } else Swal.fire("Atención", result.mensaje, "warning");
      } catch (e) {
        Swal.fire("Error", "Fallo al actualizar.", "error");
      }
    });

  document
    .getElementById("formGestionPermisos")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = perfilesState.getPerfilPermisos();
      if (id === 1) {
        Swal.fire(
          "Acción Protegida",
          "Administrador tiene acceso global.",
          "info",
        );
        return $("#modalPermisos").modal("hide");
      }

      const marcados = Array.from(
        document.querySelectorAll(".chk-permiso:checked"),
      ).map((el) => el.value);
      if (marcados.length === 0)
        return Swal.fire(
          "Atención",
          "Debe asignar al menos un módulo.",
          "warning",
        );

      try {
        const res = await perfilesApi.guardarPermisos(id, marcados);
        if (res.success) {
          Swal.fire("¡Guardado!", "Accesos actualizados.", "success");
          $("#modalPermisos").modal("hide");
        }
      } catch (e) {
        Swal.fire("Error", "Error de comunicación.", "error");
      }
    });

  // ==========================================
  // 3. FUNCIONES GLOBALES 
  // ==========================================
  window.abrirModalCrear = () => {
    document.getElementById("formCrearPerfil").reset();
    $("#modalCrearPerfil").modal("show");
  };

  window.editarPerfilUI = (id) => {
    if (id === 1)
      return Swal.fire(
        "Acción Inválida",
        "Administrador Raíz no modificable.",
        "warning",
      );
    const p = perfilesState.getPerfilById(id);
    if (!p) return;
    perfilesState.setEditandoId(id);
    document.getElementById("editPerfNombre").value = p.Nombre;
    document.getElementById("editPerfDesc").value = p.Descripcion || "";
    $("#modalEditarPerfil").modal("show");
  };

  window.bloquearPerfilUI = async (id, nuevoEstado) => {
    if (id === 1)
      return Swal.fire(
        "Acción Inválida",
        "No puedes desactivar al Administrador.",
        "warning",
      );
    const conf = await Swal.fire({
      title: `¿Desea cambiar el estado?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: nuevoEstado === 0 ? "#64748b" : "#10b981",
      confirmButtonText: "Sí, confirmar",
    });
    if (conf.isConfirmed) {
      try {
        const res = await perfilesApi.cambiarEstado(id, nuevoEstado);
        if (res.success) {
          Swal.fire({
            icon: "success",
            title: "Actualizado",
            timer: 1500,
            showConfirmButton: false,
          });
          listarPerfiles();
        }
      } catch (e) {
        Swal.fire("Error", "No se pudo cambiar estado.", "error");
      }
    }
  };

  window.eliminarPerfilUI = async (id) => {
    if (id === 1)
      return Swal.fire("Acción Protegida", "El perfil raíz es vital.", "error");
    const conf = await Swal.fire({
      title: "¿Eliminar perfil?",
      text: "Se borrará permanentemente.",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, eliminar",
    });
    if (conf.isConfirmed) {
      try {
        const data = await perfilesApi.eliminarPerfil(id);
        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "¡Eliminado!",
            timer: 1500,
            showConfirmButton: false,
          });
          listarPerfiles();
        } else Swal.fire("Bloqueado", data.mensaje, "warning");
      } catch (e) {
        Swal.fire("Error", "Fallo al eliminar.", "error");
      }
    }
  };

  window.verPermisosUI = async (id) => {
    const perfil = perfilesState.getPerfilById(id);
    if (!perfil) return;
    perfilesState.setPerfilPermisos(id);
    document.getElementById("lblPermisoTitulo").textContent =
      `Perfil: ${perfil.Nombre}`;
    const badge = document.getElementById("lblPermisoRol");
    badge.textContent = perfil.Nombre.toUpperCase();
    badge.className = `badge ${perfil.Nombre.toUpperCase() === "ADMINISTRADOR" ? "badge-danger" : "badge-info"} px-3 py-2 mt-1`;

    const cont = document.getElementById("contenedorPermisos");
    cont.innerHTML =
      '<div class="col-12 text-center py-4"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    try {
      const permisosActuales = await perfilesApi.obtenerPermisos(id);
      cont.innerHTML = "";
      modulosSistema.forEach((mod) => {
        const tieneAcceso =
          Array.isArray(permisosActuales) && permisosActuales.includes(mod.id);
        const esAdmin =
          perfil.PerfilID === 1 ||
          perfil.Nombre.toUpperCase() === "ADMINISTRADOR";
        const checkStatus = tieneAcceso || esAdmin ? "checked" : "";
        const checkDisabled = esAdmin ? "disabled" : "";

        cont.innerHTML += `
                <div class="col-6 mb-3">
                    <div class="custom-control custom-checkbox border rounded p-2 px-4 bg-white" style="border-color: #cbd5e1 !important;">
                        <input type="checkbox" class="custom-control-input chk-permiso" id="chk-${mod.id}" value="${mod.id}" ${checkStatus} ${checkDisabled}>
                        <label class="custom-control-label d-flex align-items-center cursor-pointer" for="chk-${mod.id}" style="color: var(--fox-text-gray);">
                            <i class="fas ${mod.icono} mx-2" style="width: 20px; color: var(--fox-cyan);"></i>
                            <span class="font-weight-bold" style="font-size: 0.9rem;">${mod.nombre}</span>
                        </label>
                    </div>
                </div>`;
      });
      $("#modalPermisos").modal("show");
    } catch (e) {
      Swal.fire("Error", "Fallo al cargar permisos.", "error");
    }
  };
};

inicializarModulo();