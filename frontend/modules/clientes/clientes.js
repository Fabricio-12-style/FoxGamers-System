(() => {
  let clienteEditandoId = null;
  let listaClientesGlobal = [];
  let debounceTimeoutClientes = null;

  const regexDNI = /^\d{8}$/;
  const regexRUC = /^\d{11}$/;
  const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const BASE_URL = "http://localhost:3000";

  // INYECCIÓN DE SEGURIDAD
  const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
  const authHeaders = { Authorization: `Bearer ${getToken()}` };
  const authHeadersJson = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  // =======================================================
  // 1. VERIFICACIÓN DE SESIÓN Y CARGA INICIAL
  // =======================================================
  const usuarioString = localStorage.getItem("usuarioFoxGamers");
  if (!usuarioString) return (window.location.href = "../../login/login.html");

  listarClientes();

  // =======================================================
  // 2. OBTENER CLIENTES (HÍBRIDO TOP-5 / SEARCH)
  // =======================================================
  async function listarClientes(terminoBusqueda = "") {
    const lblModo = document.getElementById("lblModoCargaClientes");
    try {
      const url =
        terminoBusqueda.trim() !== ""
          ? `${BASE_URL}/api/clientes?q=${encodeURIComponent(terminoBusqueda)}`
          : `${BASE_URL}/api/clientes`;

      const res = await fetch(url, { headers: authHeaders });
      listaClientesGlobal = await res.json();

      if (lblModo) {
        lblModo.textContent =
          terminoBusqueda.trim() !== ""
            ? `Resultados encontrados: ${listaClientesGlobal.length}`
            : "Mostrando últimos 5 registros";
        lblModo.className =
          terminoBusqueda.trim() !== ""
            ? "badge badge-info p-2"
            : "badge badge-secondary p-2";
      }

      renderizarTabla(listaClientesGlobal);
    } catch (error) {
      console.error("Error al listar:", error);
    }
  }

  // =======================================================
  // 3. RENDERIZADO DINÁMICO DE LA TABLA
  // =======================================================
  function renderizarTabla(datos) {
    const tabla = document.getElementById("tablaClientes");
    if (!tabla) return;
    tabla.innerHTML = "";

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
        ? `<button onclick="toggleEstado(${c.ClienteID}, 0)" class="btn btn-sm btn-secondary mx-1" style="width: 34px; height: 34px;" title="Suspender"><i class="fas fa-user-slash"></i></button>`
        : `<button onclick="toggleEstado(${c.ClienteID}, 1)" class="btn btn-sm btn-fox-cyan mx-1" style="width: 34px; height: 34px;" title="Reactivar"><i class="fas fa-user-check"></i></button>`;

      const rowStyle = c.Activo
        ? ""
        : "opacity: 0.5; filter: grayscale(1); background-color: #f1f5f9;";

      tabla.innerHTML += `
        <tr style="${rowStyle}">
            <td class="font-weight-bold" style="color: var(--fox-text-gray);">${c.ClienteID}</td>
            <td class="dato-critico text-info">
                ${c.Documento}<br><small class="text-muted font-weight-bold" style="font-size: 0.7rem;">${c.TipoDocumento}</small>
            </td>
            <td class="text-left dato-critico">${c.NombreRazonSocial}</td>
            <td class="font-weight-bold" style="color: var(--fox-text-gray);">${c.Telefono || "-"}</td>
            <td style="color: var(--fox-text-gray);">${c.Correo || "-"}</td>
            <td style="color: var(--fox-text-gray); font-size: 0.85rem;">${c.Direccion || "-"}</td>
            <td>${statusBadge}</td>
            <td class="small font-weight-bold" style="color: var(--fox-text-gray);">${c.FechaCreacion || "---"}</td>
            <td style="min-width: 150px;">
                <div class="btn-group">
                    <button onclick="prepararEdicionCli(${c.ClienteID})" class="btn btn-sm btn-fox mx-1" style="width: 34px; height: 34px;" title="Editar" ${!c.Activo ? "disabled" : ""}><i class="fas fa-pencil-alt"></i></button>
                    ${btnToggle}
                    <button onclick="eliminarClienteFisico(${c.ClienteID})" class="btn btn-sm btn-fox-danger mx-1" style="width: 34px; height: 34px;" title="Eliminar Permanentemente" ${!c.Activo ? "disabled" : ""}><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    });
  }

  // =======================================================
  // 4. MOTOR DE ESCUDO DEBOUNCE (PROTECTOR DEL HOSTING)
  // =======================================================
  const inputBuscar = document.getElementById("buscarCliente");
  if (inputBuscar) {
    inputBuscar.addEventListener("input", (e) => {
      const valor = e.target.value;
      clearTimeout(debounceTimeoutClientes);
      debounceTimeoutClientes = setTimeout(() => {
        listarClientes(valor);
      }, 400);
    });
  }

  // =======================================================
  // 5. CAMBIAR ESTADO DE DISPONIBILIDAD (PATCH)
  // =======================================================
  window.toggleEstado = async (id, nuevoEstado) => {
    const accion = nuevoEstado === 1 ? "Activar" : "Desactivar";
    const conf = await Swal.fire({
      title: `¿${accion} Cliente?`,
      text: `El cliente cambiará su disponibilidad en el sistema.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: nuevoEstado === 1 ? "#10b981" : "#64748b",
      confirmButtonText: `Sí, ${accion}`,
    });

    if (conf.isConfirmed) {
      try {
        const res = await fetch(`${BASE_URL}/api/clientes/estado/${id}`, {
          method: "PATCH",
          headers: authHeadersJson,
          body: JSON.stringify({ nuevoEstado }),
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Estado actualizado",
            timer: 1000,
            showConfirmButton: false,
          });
          listarClientes(document.getElementById("buscarCliente").value);
        }
      } catch (e) {
        Swal.fire("Error", "No se pudo cambiar el estado.", "error");
      }
    }
  };

  // =======================================================
  // 6. ELIMINAR CLIENTE DE LA BASE DE DATOS
  // =======================================================
  window.eliminarClienteFisico = async (id) => {
    const cli = listaClientesGlobal.find((c) => c.ClienteID === id);
    const conf = await Swal.fire({
      title: "¿Eliminar permanentemente?",
      text: `Borrarás a ${cli.NombreRazonSocial}. Si tiene ventas asociadas, el sistema te lo impedirá.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, borrar de la BD",
    });

    if (conf.isConfirmed) {
      try {
        const res = await fetch(`${BASE_URL}/api/clientes/${id}`, {
          method: "DELETE",
          headers: authHeaders,
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire("¡Eliminado!", data.mensaje, "success");
          listarClientes(document.getElementById("buscarCliente").value);
        } else {
          Swal.fire("Atención", data.mensaje, "warning");
        }
      } catch (e) {
        Swal.fire("Error", "Fallo de conexión.", "error");
      }
    }
  };

  // =======================================================
  // 7. CONSULTA EXTERNA PADRÓN SUNAT / RENIEC EN VIVO
  // =======================================================
  const btnConsultarDoc = document.getElementById("btnConsultarDoc");
  if (btnConsultarDoc) {
    btnConsultarDoc.addEventListener("click", async () => {
      const tipo = document.getElementById("cliTipoDoc").value;
      const documento = document.getElementById("cliDocumento").value.trim();

      if (!documento) return;

      if (tipo === "DNI" && !regexDNI.test(documento)) {
        return Swal.fire(
          "Documento Inválido",
          "El DNI debe contener exactamente 8 números.",
          "warning",
        );
      }
      if (tipo === "RUC" && !regexRUC.test(documento)) {
        return Swal.fire(
          "Documento Inválido",
          "El RUC debe contener exactamente 11 números.",
          "warning",
        );
      }

      btnConsultarDoc.disabled = true;
      btnConsultarDoc.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      try {
        const res = await fetch(
          `${BASE_URL}/api/clientes/consulta/${tipo.toLowerCase()}/${documento}`,
          { headers: authHeaders },
        );
        const apiResponse = await res.json();
        if (apiResponse.success) {
          document.getElementById("cliNombre").value =
            apiResponse.data.nombreCompleto;
          document.getElementById("cliDireccion").value =
            apiResponse.data.direccion || "";
        } else {
          Swal.fire("No Encontrado", apiResponse.mensaje, "info");
        }
      } catch (e) {
        Swal.fire(
          "Error",
          "No se pudo conectar con el servicio de consultas.",
          "error",
        );
      } finally {
        btnConsultarDoc.disabled = false;
        btnConsultarDoc.innerHTML =
          '<i class="fas fa-search mr-1"></i> Consultar';
      }
    });
  }

  // =======================================================
  // 8. GUARDAR O ACTUALIZAR REGISTRO TRANSACCIONAL
  // =======================================================
  const formCliente = document.getElementById("formCliente");
  if (formCliente) {
    formCliente.addEventListener("submit", async (e) => {
      e.preventDefault();

      const tipoDoc = document.getElementById("cliTipoDoc").value;
      const doc = document.getElementById("cliDocumento").value.trim();
      const correo = document.getElementById("cliCorreo").value.trim();

      if (tipoDoc === "DNI" && !regexDNI.test(doc)) {
        return Swal.fire(
          "Documento Inválido",
          "El DNI debe contener exactamente 8 números.",
          "error",
        );
      }
      if (tipoDoc === "RUC" && !regexRUC.test(doc)) {
        return Swal.fire(
          "Documento Inválido",
          "El RUC debe contener exactly 11 números.",
          "error",
        );
      }
      if (correo && !regexCorreo.test(correo)) {
        return Swal.fire(
          "Correo Inválido",
          "Ingrese un formato de correo electrónico válido.",
          "error",
        );
      }

      const clienteData = {
        TipoDocumento: tipoDoc,
        Documento: doc,
        NombreRazonSocial: document.getElementById("cliNombre").value.trim(),
        Direccion: document.getElementById("cliDireccion").value.trim(),
        Telefono: document.getElementById("cliTelefono").value.trim(),
        Correo: correo,
      };

      const url = clienteEditandoId
        ? `${BASE_URL}/api/clientes/${clienteEditandoId}`
        : `${BASE_URL}/api/clientes`;
      const method = clienteEditandoId ? "PUT" : "POST";

      try {
        const res = await fetch(url, {
          method: method,
          headers: authHeadersJson,
          body: JSON.stringify(clienteData),
        });
        const data = await res.json();

        if (data.success) {
          $("#modalCliente").modal("hide");
          listarClientes(document.getElementById("buscarCliente").value);
          Swal.fire("¡Éxito!", data.mensaje, "success");
        } else {
          Swal.fire("Error", data.mensaje, "error");
        }
      } catch (e) {
        Swal.fire("Error", "Fallo de comunicación con el servidor.", "error");
      }
    });
  }

  // =======================================================
  // 9. REINICIAR FORMULARIO PARA CREACIÓN
  // =======================================================
  const btnAbrirCrear = document.getElementById("btnCrearClienteModal");
  if (btnAbrirCrear) {
    btnAbrirCrear.addEventListener("click", () => {
      clienteEditandoId = null;
      document.getElementById("formCliente").reset();
      document.getElementById("tituloModalCliente").innerHTML =
        '<i class="fas fa-user-plus mr-2" style="color: var(--fox-cyan);"></i> Nuevo Cliente';
      $("#modalCliente").modal("show");
    });
  }

  // =======================================================
  // 10. CARGAR FICHA TÉCNICA EN MODO EDICIÓN
  // =======================================================
  window.prepararEdicionCli = (id) => {
    const c = listaClientesGlobal.find((item) => item.ClienteID === id);
    if (c) {
      clienteEditandoId = id;
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
})();