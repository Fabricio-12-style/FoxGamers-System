// Archivo: frontend/modules/clientes/clientesUI.js
import { clientesApi } from "./clientesApi.js";
import { clientesState } from "./clientesState.js";

const regexDNI = /^\d{8}$/;
const regexRUC = /^\d{11}$/;
const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let debounceTimeoutClientes = null;

// ==========================================
// 1. RENDERIZADO DE TABLA (UI)
// ==========================================
const renderizarTabla = () => {
  const tabla = document.getElementById("tablaClientes");
  if (!tabla) return;
  tabla.innerHTML = "";

  const datos = clientesState.listaClientesGlobal;

  if (datos.length === 0) {
    tabla.innerHTML =
      '<tr><td colspan="9" class="text-center py-4 font-weight-bold" style="color: var(--fox-text-gray);">No se encontraron clientes.</td></tr>';
    return;
  }

  datos.forEach((c) => {
    const statusBadge = c.Activo
      ? '<span class="badge badge-success">Activo</span>'
      : '<span class="badge badge-secondary">Suspendido</span>';
    const btnToggle = c.Activo
      ? `<button onclick="toggleEstadoUI(${c.ClienteID}, 0)" class="btn btn-sm btn-secondary mx-1" style="width: 34px; height: 34px;" title="Suspender"><i class="fas fa-user-slash"></i></button>`
      : `<button onclick="toggleEstadoUI(${c.ClienteID}, 1)" class="btn btn-sm btn-fox-cyan mx-1" style="width: 34px; height: 34px;" title="Reactivar"><i class="fas fa-user-check"></i></button>`;
    const rowStyle = c.Activo
      ? ""
      : "opacity: 0.5; filter: grayscale(1); background-color: #f1f5f9;";

    tabla.innerHTML += `
        <tr style="${rowStyle}">
            <td class="font-weight-bold" style="color: var(--fox-text-gray);">${c.ClienteID}</td>
            <td class="dato-critico text-info">${c.Documento}<br><small class="text-muted font-weight-bold" style="font-size: 0.7rem;">${c.TipoDocumento}</small></td>
            <td class="text-left dato-critico">${c.NombreRazonSocial}</td>
            <td class="font-weight-bold" style="color: var(--fox-text-gray);">${c.Telefono || "-"}</td>
            <td style="color: var(--fox-text-gray);">${c.Correo || "-"}</td>
            <td style="color: var(--fox-text-gray); font-size: 0.85rem;">${c.Direccion || "-"}</td>
            <td>${statusBadge}</td>
            <td class="small font-weight-bold" style="color: var(--fox-text-gray);">${c.FechaCreacion || "---"}</td>
            <td style="min-width: 150px;">
                <div class="btn-group">
                    <button onclick="prepararEdicionCliUI(${c.ClienteID})" class="btn btn-sm btn-fox mx-1" style="width: 34px; height: 34px;" title="Editar" ${!c.Activo ? "disabled" : ""}><i class="fas fa-pencil-alt"></i></button>
                    ${btnToggle}
                    <button onclick="eliminarClienteFisicoUI(${c.ClienteID})" class="btn btn-sm btn-fox-danger mx-1" style="width: 34px; height: 34px;" title="Eliminar Permanentemente" ${!c.Activo ? "disabled" : ""}><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
  });
};

const actualizarLabelModo = (terminoBusqueda, cantidad) => {
  const lblModo = document.getElementById("lblModoCargaClientes");
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
const listarClientes = async (terminoBusqueda = "") => {
  try {
    const datos = await clientesApi.obtenerClientes(terminoBusqueda);
    clientesState.setClientes(datos);
    actualizarLabelModo(terminoBusqueda, datos.length);
    renderizarTabla();
  } catch (e) {
    console.error("Error al listar clientes:", e);
  }
};

const inicializarModulo = () => {
  listarClientes();

  // Buscador Local
  const inputBuscar = document.getElementById("buscarCliente");
  if (inputBuscar) {
    inputBuscar.addEventListener("input", (e) => {
      const valor = e.target.value;
      clearTimeout(debounceTimeoutClientes);
      debounceTimeoutClientes = setTimeout(() => listarClientes(valor), 400);
    });
  }

  // Consulta Automática Documento (API)
  const btnConsultarDoc = document.getElementById("btnConsultarDoc");
  if (btnConsultarDoc) {
    btnConsultarDoc.addEventListener("click", async () => {
      const tipo = document.getElementById("cliTipoDoc").value;
      const doc = document.getElementById("cliDocumento").value.trim();

      if (!doc) return;
      if (tipo === "DNI" && !regexDNI.test(doc))
        return Swal.fire(
          "Documento Inválido",
          "El DNI debe tener 8 números.",
          "warning",
        );
      if (tipo === "RUC" && !regexRUC.test(doc))
        return Swal.fire(
          "Documento Inválido",
          "El RUC debe tener 11 números.",
          "warning",
        );

      btnConsultarDoc.disabled = true;
      btnConsultarDoc.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      try {
        const apiResponse = await clientesApi.consultarDocumento(tipo, doc);
        if (apiResponse.success) {
          document.getElementById("cliNombre").value =
            apiResponse.data.nombreCompleto;
          document.getElementById("cliDireccion").value =
            apiResponse.data.direccion || "";
        } else {
          Swal.fire("No Encontrado", apiResponse.mensaje, "info");
        }
      } catch (e) {
        Swal.fire("Error", "No se pudo conectar con el servicio.", "error");
      } finally {
        btnConsultarDoc.disabled = false;
        btnConsultarDoc.innerHTML =
          '<i class="fas fa-search mr-1"></i> Consultar';
      }
    });
  }

  // Submit Formulario
  const formCliente = document.getElementById("formCliente");
  if (formCliente) {
    formCliente.addEventListener("submit", async (e) => {
      e.preventDefault();
      const tipoDoc = document.getElementById("cliTipoDoc").value;
      const doc = document.getElementById("cliDocumento").value.trim();
      const correo = document.getElementById("cliCorreo").value.trim();

      if (tipoDoc === "DNI" && !regexDNI.test(doc))
        return Swal.fire("Inválido", "El DNI debe tener 8 números.", "error");
      if (tipoDoc === "RUC" && !regexRUC.test(doc))
        return Swal.fire("Inválido", "El RUC debe tener 11 números.", "error");
      if (correo && !regexCorreo.test(correo))
        return Swal.fire("Inválido", "Correo electrónico inválido.", "error");

      const data = {
        TipoDocumento: tipoDoc,
        Documento: doc,
        NombreRazonSocial: document.getElementById("cliNombre").value.trim(),
        Direccion: document.getElementById("cliDireccion").value.trim(),
        Telefono: document.getElementById("cliTelefono").value.trim(),
        Correo: correo,
      };

      const idEdicion = clientesState.getEditandoId();
      try {
        const result = idEdicion
          ? await clientesApi.actualizarCliente(idEdicion, data)
          : await clientesApi.crearCliente(data);
        if (result.success) {
          $("#modalCliente").modal("hide");
          listarClientes(document.getElementById("buscarCliente")?.value || "");
          Swal.fire("¡Éxito!", result.mensaje, "success");
        } else {
          Swal.fire("Atención", result.mensaje, "warning");
        }
      } catch (err) {
        Swal.fire("Error", "Fallo de red.", "error");
      }
    });
  }

  // ==========================================
  // 3. EXPOSICIÓN DE FUNCIONES GLOBALES
  // ==========================================
  window.btnCrearClienteModal = document.getElementById("btnCrearClienteModal");
  if (window.btnCrearClienteModal) {
    window.btnCrearClienteModal.addEventListener("click", () => {
      clientesState.limpiarEdicion();
      document.getElementById("formCliente").reset();
      document.getElementById("tituloModalCliente").innerHTML =
        '<i class="fas fa-user-plus mr-2" style="color: var(--fox-cyan);"></i> Nuevo Cliente';
      $("#modalCliente").modal("show");
    });
  }

  window.prepararEdicionCliUI = (id) => {
    const c = clientesState.getClienteById(id);
    if (c) {
      clientesState.setEditandoId(id);
      document.getElementById("cliTipoDoc").value = c.TipoDocumento;
      document.getElementById("cliDocumento").value = c.Documento;
      document.getElementById("cliNombre").value = c.NombreRazonSocial;
      document.getElementById("cliDireccion").value = c.Direccion || "";
      document.getElementById("cliTelefono").value = c.Telefono || "";
      document.getElementById("cliCorreo").value = c.Correo || "";
      document.getElementById("tituloModalCliente").innerHTML =
        '<i class="fas fa-user-edit mr-2" style="color: var(--fox-cyan);"></i> Editar Cliente';
      $("#modalCliente").modal("show");
    }
  };

  window.toggleEstadoUI = async (id, nuevoEstado) => {
    const accion = nuevoEstado === 1 ? "Activar" : "Desactivar";
    const conf = await Swal.fire({
      title: `¿${accion} Cliente?`,
      text: `El cliente cambiará su disponibilidad.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: nuevoEstado === 1 ? "#10b981" : "#64748b",
      confirmButtonText: `Sí, ${accion}`,
    });

    if (conf.isConfirmed) {
      try {
        const res = await clientesApi.cambiarEstado(id, nuevoEstado);
        if (res.success) {
          Swal.fire({
            icon: "success",
            title: "Estado actualizado",
            timer: 1000,
            showConfirmButton: false,
          });
          listarClientes(document.getElementById("buscarCliente")?.value || "");
        }
      } catch (e) {
        Swal.fire("Error", "Fallo al cambiar estado", "error");
      }
    }
  };

  window.eliminarClienteFisicoUI = async (id) => {
    const c = clientesState.getClienteById(id);
    const conf = await Swal.fire({
      title: "¿Eliminar permanentemente?",
      text: `Borrarás a ${c.NombreRazonSocial}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, borrar de BD",
    });

    if (conf.isConfirmed) {
      try {
        const result = await clientesApi.eliminarCliente(id);
        if (result.success) {
          Swal.fire("¡Eliminado!", result.mensaje, "success");
          listarClientes(document.getElementById("buscarCliente")?.value || "");
        } else {
          Swal.fire("Atención", result.mensaje, "warning");
        }
      } catch (e) {
        Swal.fire("Error", "Fallo de conexión.", "error");
      }
    }
  };
};

inicializarModulo();