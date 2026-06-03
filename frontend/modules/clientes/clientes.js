(() => {
  let clienteEditandoId = null;
  let listaClientesGlobal = [];

  // 1. Expresiones Regulares de Validación (Espejo del Backend)
  const regexDNI = /^\d{8}$/;
  const regexRUC = /^\d{11}$/;
  const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 2. Verificación de sesión y carga inicial
  const usuarioString = localStorage.getItem("usuarioFoxGamers");
  if (!usuarioString) return (window.location.href = "../../login/login.html");

  listarClientes();

  // 3. Renderizado de tabla
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
                    <button onclick="prepararEdicionCli(${c.ClienteID})" class="btn btn-sm btn-fox mx-1" style="width: 34px; height: 34px;" title="Editar" ${!c.Activo ? "disabled" : ""}>
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    ${btnToggle}
                    <button onclick="eliminarClienteFisico(${c.ClienteID})" class="btn btn-sm btn-fox-danger mx-1" style="width: 34px; height: 34px;" title="Eliminar Permanentemente" ${!c.Activo ? "disabled" : ""}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
      `;
    });
  }

  // 4. Listar clientes
  async function listarClientes() {
    try {
      const res = await fetch("http://localhost:3000/api/clientes");
      listaClientesGlobal = await res.json();
      renderizarTabla(listaClientesGlobal);
    } catch (error) {
      console.error("Error al listar:", error);
    }
  }

  // 5. Búsqueda en tiempo real
  const inputBuscar = document.getElementById("buscarCliente");
  if (inputBuscar) {
    inputBuscar.addEventListener("input", (e) => {
      const txt = e.target.value.toLowerCase();
      const filtrados = listaClientesGlobal.filter(
        (c) =>
          (c.NombreRazonSocial &&
            c.NombreRazonSocial.toLowerCase().includes(txt)) ||
          (c.Documento && c.Documento.includes(txt)),
      );
      renderizarTabla(filtrados);
    });
  }

  // 6. Activar/Desactivar cliente
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
        const res = await fetch(
          `http://localhost:3000/api/clientes/estado/${id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nuevoEstado }),
          },
        );
        const data = await res.json();
        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Estado actualizado",
            timer: 1000,
            showConfirmButton: false,
          });
          listarClientes();
        }
      } catch (e) {
        Swal.fire("Error", "No se pudo cambiar el estado.", "error");
      }
    }
  };

  // 7. Eliminar cliente
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
        const res = await fetch(`http://localhost:3000/api/clientes/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire("¡Eliminado!", data.mensaje, "success");
          listarClientes();
        } else {
          Swal.fire("Atención", data.mensaje, "warning");
        }
      } catch (e) {
        Swal.fire("Error", "Fallo de conexión.", "error");
      }
    }
  };

  // 8. Consulta a API con Filtro
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

      btnConsultarDoc.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      try {
        const res = await fetch(
          `http://localhost:3000/api/clientes/consulta/${tipo.toLowerCase()}/${documento}`,
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
      }
      btnConsultarDoc.innerHTML =
        '<i class="fas fa-search mr-1"></i> Consultar';
    });
  }

  // 9. Guardar o Actualizar con Validaciones
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
          "El RUC debe contener exactamente 11 números.",
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
        ? `http://localhost:3000/api/clientes/${clienteEditandoId}`
        : "http://localhost:3000/api/clientes";
      const method = clienteEditandoId ? "PUT" : "POST";

      try {
        const res = await fetch(url, {
          method: method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clienteData),
        });
        const data = await res.json();

        if (data.success) {
          $("#modalCliente").modal("hide");
          listarClientes();
          Swal.fire("Éxito", data.mensaje, "success");
        } else {
          Swal.fire("Error", data.mensaje, "error");
        }
      } catch (e) {
        Swal.fire("Error", "Fallo de comunicación con el servidor.", "error");
      }
    });
  }

  // 10. Limpiar formulario
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

  // 11. Preparar edición
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