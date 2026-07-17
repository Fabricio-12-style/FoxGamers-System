import { proveedoresApi } from "./proveedoresApi.js";
import { proveedoresState } from "./proveedoresState.js";

const regexRUC = /^\d{11}$/;
const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ==========================================
// 1. RENDERIZADO DE TABLA
// ==========================================
const renderizarTabla = (datos) => {
  const tabla = document.getElementById("tablaProveedores");
  if (!tabla) return;
  tabla.innerHTML = "";

  if (datos.length === 0) {
    tabla.innerHTML =
      '<tr><td colspan="10" class="text-muted py-4 font-weight-bold">No hay proveedores registrados</td></tr>';
    return;
  }

  datos.forEach((p) => {
    const rowStyle = p.Activo
      ? ""
      : "opacity: 0.5; filter: grayscale(1); background-color: #f1f5f9;";
    const badgeEstado = p.Activo
      ? '<span class="badge badge-success">Activo</span>'
      : '<span class="badge badge-secondary">Inactivo</span>';
    const iconEye = p.Activo ? "fa-eye-slash" : "fa-eye";
    const btnClassToggle = p.Activo ? "btn-secondary" : "btn-fox-cyan";
    const titleEye = p.Activo ? "Desactivar" : "Activar";

    let fechaFormateada = "-";
    if (p.FechaCreacion) {
      const f = new Date(p.FechaCreacion);
      fechaFormateada = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")} ${String(f.getHours()).padStart(2, "0")}:${String(f.getMinutes()).padStart(2, "0")}`;
    }

    tabla.innerHTML += `
        <tr style="${rowStyle}" class="fila-principal-proveedor">
            <td class="d-table-cell d-md-none align-middle text-center" style="width: 40px; max-width: 40px; padding: 10px 4px;">
                <button class="btn btn-sm btn-light btn-expandir-proveedor m-0 shadow-sm" style="border-radius: 50%; width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas fa-plus text-primary" style="font-size: 0.9rem;"></i>
                </button>
            </td>
            <td class="font-weight-bold d-none d-md-table-cell" style="color: var(--fox-text-gray);">${p.ProveedorID}</td>
            <td class="text-left dato-critico pl-2 pl-md-4 align-middle" style="min-width: 0; width: 100%; max-width: 0; padding-right: 0.35rem;">
                <div class="font-weight-bold" style="display: block; width: 100%; max-width: 100%; overflow-wrap: anywhere; word-break: break-word; white-space: normal; line-height: 1.3;">${p.RazonSocial}</div>
                <div class="d-block d-md-none mt-1">
                    <span class="badge ${p.Activo ? "badge-success" : "badge-secondary"} px-2 py-1" style="font-size: 0.72rem;">${p.Activo ? "Activo" : "Inactivo"}</span>
                </div>
            </td>
            <td class="dato-critico text-info d-none d-md-table-cell">${p.RUC}</td>
            <td class="font-weight-bold d-none d-md-table-cell" style="color: var(--fox-text-gray);">${p.Contacto || "-"}</td>
            <td class="font-weight-bold d-none d-md-table-cell" style="color: var(--fox-text-gray);">${p.Telefono || "-"}</td>
            <td class="small font-weight-bold d-none d-md-table-cell" style="color: var(--fox-text-gray);">${p.Correo || "-"}</td>
            <td class="text-left small font-weight-bold text-truncate d-none d-md-table-cell" style="color: var(--fox-text-gray); max-width: 150px;" title="${p.Direccion || ""}">${p.Direccion || "-"}</td>
            <td class="d-none d-md-table-cell">${badgeEstado}</td>
            <td class="small font-weight-bold d-none d-md-table-cell" style="color: var(--fox-text-gray);">${fechaFormateada}</td>
            <td class="d-none d-md-table-cell">
                <div class="btn-group">
                    <button onclick="abrirModalEditarUI(${p.ProveedorID})" class="btn btn-sm btn-fox mx-1" style="border-radius: 4px; width: 32px; height: 32px;" title="Editar" ${!p.Activo ? "disabled" : ""}><i class="fas fa-pen"></i></button>
                    <button onclick="cambiarEstadoUI(${p.ProveedorID}, ${p.Activo})" class="btn btn-sm ${btnClassToggle} mx-1 shadow-sm" style="border-radius: 4px; width: 32px; height: 32px;" title="${titleEye}"><i class="fas ${iconEye}"></i></button>
                    <button onclick="eliminarProveedorUI(${p.ProveedorID})" class="btn btn-sm btn-fox-danger mx-1" style="border-radius: 4px; width: 32px; height: 32px;" title="Eliminar" ${!p.Activo ? "disabled" : ""}><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
        <tr class="fila-detalle-proveedor d-none d-md-none shadow-inner">
            <td colspan="10" class="p-3 text-left" style="background: #f8fafc; border-bottom: 3px solid var(--fox-cyan);">
                <div class="mb-2">
                    <small class="text-uppercase font-weight-bold" style="color: var(--fox-text-gray); font-size: 0.65rem;">RUC</small>
                    <div class="font-weight-bold text-info">${p.RUC}</div>
                </div>
                <div class="mb-2">
                    <small class="text-uppercase font-weight-bold" style="color: var(--fox-text-gray); font-size: 0.65rem;">Representante</small>
                    <div class="font-weight-bold text-muted">${p.Contacto || "-"}</div>
                </div>
                <div class="mb-2">
                    <small class="text-uppercase font-weight-bold" style="color: var(--fox-text-gray); font-size: 0.65rem;">Teléfono</small>
                    <div class="font-weight-bold text-muted">${p.Telefono || "-"}</div>
                </div>
                <div class="mb-2">
                    <small class="text-uppercase font-weight-bold" style="color: var(--fox-text-gray); font-size: 0.65rem;">Correo</small>
                    <div class="font-weight-bold text-muted">${p.Correo || "-"}</div>
                </div>
                <div class="mb-3">
                    <small class="text-uppercase font-weight-bold" style="color: var(--fox-text-gray); font-size: 0.65rem;">Dirección</small>
                    <div class="font-weight-bold text-muted">${p.Direccion || "-"}</div>
                </div>
                <div class="d-flex justify-content-between w-100 flex-wrap" style="gap: 0.35rem;">
                    <button onclick="abrirModalEditarUI(${p.ProveedorID})" class="btn btn-fox flex-fill mr-1 font-weight-bold text-truncate" style="border-radius: 6px; padding: 10px 0; font-size: 0.82rem;" ${!p.Activo ? "disabled" : ""}>
                        <i class="fas fa-pen mr-1"></i> Editar
                    </button>
                    <button onclick="cambiarEstadoUI(${p.ProveedorID}, ${p.Activo})" class="btn ${btnClassToggle} flex-fill mx-1 font-weight-bold text-truncate" style="border-radius: 6px; padding: 10px 0; font-size: 0.82rem;">
                        <i class="fas ${iconEye} mr-1"></i> ${titleEye}
                    </button>
                    <button onclick="eliminarProveedorUI(${p.ProveedorID})" class="btn btn-fox-danger flex-fill ml-1 font-weight-bold text-truncate" style="border-radius: 6px; padding: 10px 0; font-size: 0.82rem;" ${!p.Activo ? "disabled" : ""}>
                        <i class="fas fa-trash mr-1"></i> Eliminar
                    </button>
                </div>
            </td>
        </tr>`;
  });
};

// ==========================================
// 2. LÓGICA DE INICIALIZACIÓN
// ==========================================
const listarProveedores = async () => {
  try {
    const datos = await proveedoresApi.obtenerProveedores();
    proveedoresState.setProveedores(datos);
    renderizarTabla(datos);
  } catch (e) {
    console.error("Error al cargar proveedores:", e);
    const tabla = document.getElementById("tablaProveedores");
    if (tabla)
      tabla.innerHTML =
        '<tr><td colspan="10" class="text-danger py-4 font-weight-bold">Error de conexión con el servidor</td></tr>';
  }
};

const inicializarModulo = () => {
  listarProveedores();

  document
    .getElementById("tablaProveedores")
    ?.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-expandir-proveedor");
      if (btn) {
        const filaPrincipal = btn.closest(".fila-principal-proveedor");
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

  const inputBuscar = document.getElementById("buscarProveedor");
  if (inputBuscar) {
    inputBuscar.addEventListener("input", (e) => {
      const txt = e.target.value.toLowerCase();
      const filtrados = proveedoresState
        .getProveedores()
        .filter(
          (p) =>
            (p.RazonSocial && p.RazonSocial.toLowerCase().includes(txt)) ||
            (p.RUC && p.RUC.includes(txt)) ||
            (p.Contacto && p.Contacto.toLowerCase().includes(txt)),
        );
      renderizarTabla(filtrados);
    });
  }

  const inputRUC = document.getElementById("provRUC");
  if (inputRUC) {
    inputRUC.addEventListener("input", async (e) => {
      const ruc = e.target.value.trim();
      const loadingIcon = document.getElementById("loadingRUC");

      if (ruc.length === 11) {
        const fieldRazon = document.getElementById("provRazonSocial");
        const fieldDir = document.getElementById("provDireccion");

        if (loadingIcon) loadingIcon.classList.remove("d-none");
        fieldRazon.placeholder = "Consultando servidor...";
        fieldRazon.disabled = true;
        fieldDir.disabled = true;

        try {
          const result = await proveedoresApi.consultarRUC(ruc);
          if (result.success && result.data) {
            fieldRazon.value = result.data.razonSocial || "";
            fieldDir.value = result.data.direccion || "";
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: "Datos obtenidos",
              showConfirmButton: false,
              timer: 2000,
            });
          } else {
            throw new Error("Sin resultados");
          }
        } catch (error) {
          fieldRazon.value = "";
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "warning",
            title: "RUC no encontrado. Ingrese manual.",
            showConfirmButton: false,
            timer: 3000,
          });
        } finally {
          if (loadingIcon) loadingIcon.classList.add("d-none");
          fieldRazon.placeholder = "";
          fieldRazon.disabled = false;
          fieldDir.disabled = false;
        }
      }
    });
  }

  const formProveedor = document.getElementById("formProveedor");
  if (formProveedor) {
    formProveedor.addEventListener("submit", async (e) => {
      e.preventDefault();

      const ruc = document.getElementById("provRUC").value.trim();
      const correo = document.getElementById("provCorreo").value.trim();

      if (!regexRUC.test(ruc))
        return Swal.fire(
          "RUC Inválido",
          "El RUC debe tener 11 números.",
          "error",
        );
      if (correo && !regexCorreo.test(correo))
        return Swal.fire("Correo Inválido", "Formato incorrecto.", "error");

      const id = document.getElementById("provId").value;
      const isUpdate = id !== "";

      const data = {
        RUC: ruc,
        RazonSocial: document.getElementById("provRazonSocial").value.trim(),
        Direccion: document.getElementById("provDireccion").value.trim(),
        Contacto: document.getElementById("provContacto").value.trim(),
        Telefono: document.getElementById("provTelefono").value.trim(),
        Correo: correo,
      };

      try {
        const result = isUpdate
          ? await proveedoresApi.actualizarProveedor(id, data)
          : await proveedoresApi.crearProveedor(data);

        if (result.success) {
          $("#modalProveedor").modal("hide");
          listarProveedores();
          Swal.fire({
            icon: "success",
            title: "¡Completado!",
            text: result.mensaje,
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          Swal.fire("Atención", result.mensaje, "warning");
        }
      } catch (err) {
        Swal.fire(
          "Error",
          "Problema de conexión al guardar el proveedor.",
          "error",
        );
      }
    });
  }

  // ==========================================
  // 3. EXPOSICIÓN DE FUNCIONES GLOBALES
  // ==========================================
  window.abrirModalNuevo = () => {
    const form = document.getElementById("formProveedor");
    if (form) form.reset();
    document.getElementById("provId").value = "";
    document.getElementById("tituloModalProveedor").innerHTML =
      '<i class="fas fa-truck mr-2" style="color: var(--fox-cyan);"></i> Nuevo Proveedor';
    $("#modalProveedor").modal("show");
  };

  window.abrirModalEditarUI = (id) => {
    const p = proveedoresState.getProveedorById(id);
    if (!p) return;
    document.getElementById("provId").value = p.ProveedorID;
    document.getElementById("provRUC").value = p.RUC;
    document.getElementById("provRazonSocial").value = p.RazonSocial;
    document.getElementById("provDireccion").value = p.Direccion || "";
    document.getElementById("provContacto").value = p.Contacto || "";
    document.getElementById("provTelefono").value = p.Telefono || "";
    document.getElementById("provCorreo").value = p.Correo || "";
    document.getElementById("tituloModalProveedor").innerHTML =
      '<i class="fas fa-edit mr-2" style="color: var(--fox-cyan);"></i> Editar Proveedor';
    $("#modalProveedor").modal("show");
  };

  window.cambiarEstadoUI = async (id, estadoActual) => {
    const nuevoEstado = estadoActual ? 0 : 1;
    try {
      const result = await proveedoresApi.cambiarEstado(id, nuevoEstado);
      if (result.success) listarProveedores();
    } catch (e) {
      console.error(e);
    }
  };

  window.eliminarProveedorUI = async (id) => {
    const result = await Swal.fire({
      title: "¿Estás seguro?",
      text: "Se eliminará permanentemente este proveedor.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const data = await proveedoresApi.eliminarProveedor(id);
        if (data.success) {
          listarProveedores();
          Swal.fire("¡Eliminado!", data.mensaje, "success");
        } else {
          Swal.fire("Atención", data.mensaje, "warning");
        }
      } catch (e) {
        Swal.fire("Error", "Error al intentar eliminar", "error");
      }
    }
  };
};

inicializarModulo();