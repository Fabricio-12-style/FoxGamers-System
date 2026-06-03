(() => {
  let listaPerfilesGlobal = [];
  let perfilEditandoId = null;
  let perfilSeleccionadoParaPermisos = null;

  // 1. Listado de módulos para los checkboxes
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
  ];

  // 2. Verificación de rango Administrador
  const usuarioString = localStorage.getItem("usuarioFoxGamers");
  const usuarioLogueado = JSON.parse(usuarioString || "{}");
  if ((usuarioLogueado.Rol || "").toUpperCase() !== "ADMINISTRADOR") {
    Swal.fire(
      "Acceso Denegado",
      "Módulo restringido únicamente para personal autorizado.",
      "error",
    );
    const contenedor = document.getElementById("app-content");
    if (contenedor) {
      contenedor.innerHTML = `<div class="alert alert-danger m-4 text-center font-weight-bold">Acceso no autorizado a este módulo.</div>`;
    }
    return;
  }

  listarPerfiles();

  // 3. Listar Perfiles desde la BD
  async function listarPerfiles() {
    const tabla = document.getElementById("tablaPerfiles");
    if (!tabla) return;
    try {
      const res = await fetch("http://localhost:3000/api/perfiles");
      listaPerfilesGlobal = await res.json();
      renderizarTabla(listaPerfilesGlobal);
    } catch (error) {
      console.error(error);
      tabla.innerHTML =
        '<tr><td colspan="6" class="text-danger font-weight-bold text-center py-4">Error de conexión con el servidor</td></tr>';
    }
  }

  // Función auxiliar para renderizar filas de la tabla
  function renderizarTabla(lista) {
    const tabla = document.getElementById("tablaPerfiles");
    if (!tabla) return;
    tabla.innerHTML = "";

    if (lista.length === 0) {
      tabla.innerHTML =
        '<tr><td colspan="6" class="text-muted font-weight-bold py-4">No se encontraron perfiles coincidentes.</td></tr>';
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
        : `<button onclick="bloquearPerfil(${p.PerfilID}, ${isActivo ? 0 : 1})" class="btn btn-sm ${btnBloquearClass} mx-1 shadow-sm" style="width: 32px; height: 32px;" title="${isActivo ? "Desactivar Perfil" : "Activar Perfil"}">
                <i class="fas ${iconBloquear}"></i>
           </button>`;

      tabla.innerHTML += `
        <tr style="${rowStyle}">
            <td class="font-weight-bold" style="color: var(--fox-text-gray);">${p.PerfilID}</td>
            <td class="text-left dato-critico pl-4">${p.Nombre}</td>
            <td class="text-left font-weight-bold" style="color: var(--fox-text-gray); font-size: 0.85rem;">${p.Descripcion || "-"}</td>
            <td>${badgeEstado}</td>
            <td class="font-weight-bold" style="color: var(--fox-text-gray); font-size: 0.85rem;">${new Date(p.FechaCreacion).toLocaleString("es-PE")}</td>
            <td>
                <div class="btn-group">
                    <button onclick="verPermisos(${p.PerfilID})" class="btn btn-sm btn-fox-cyan mx-1 shadow-sm" style="width: 32px; height: 32px;" title="Permisos">
                        <i class="fas fa-key"></i>
                    </button>
                    <button onclick="editarPerfil(${p.PerfilID})" class="btn btn-sm btn-fox mx-1 shadow-sm" style="width: 32px; height: 32px;" title="Editar" ${esAdmin ? "disabled" : ""}>
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    ${btnBloquear}
                    <button onclick="eliminarPerfil(${p.PerfilID})" class="btn btn-sm btn-fox-danger mx-1 shadow-sm" style="width: 32px; height: 32px;" title="Eliminar" ${esAdmin ? "disabled" : ""}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    });
  }

  // Filtro dinámico del buscador
  const buscador = document.getElementById("busquedaPerfil");
  if (buscador) {
    buscador.addEventListener("input", (e) => {
      const termino = e.target.value.toLowerCase().trim();
      const filtrados = listaPerfilesGlobal.filter(
        (p) =>
          p.Nombre.toLowerCase().includes(termino) ||
          (p.Descripcion || "").toLowerCase().includes(termino),
      );
      renderizarTabla(filtrados);
    });
  }

  // 4. Ver modal de permisos por Perfil
  window.verPermisos = async (id) => {
    const perfil = listaPerfilesGlobal.find((p) => p.PerfilID === id);
    if (!perfil) return;

    perfilSeleccionadoParaPermisos = id;
    document.getElementById("lblPermisoTitulo").textContent =
      `Perfil: ${perfil.Nombre}`;

    const badge = document.getElementById("lblPermisoRol");
    badge.textContent = perfil.Nombre.toUpperCase();
    badge.className = `badge ${perfil.Nombre.toUpperCase() === "ADMINISTRADOR" ? "badge-danger" : "badge-info"} px-3 py-2 mt-1`;

    const contenedor = document.getElementById("contenedorPermisos");
    contenedor.innerHTML =
      '<div class="col-12 text-center py-4" style="color: var(--fox-text-gray);"><i class="fas fa-spinner fa-spin mr-2"></i> Cargando accesos...</div>';

    try {
      const res = await fetch(`http://localhost:3000/api/permisos/${id}`);
      const permisosActuales = await res.json();

      contenedor.innerHTML = "";
      modulosSistema.forEach((mod) => {
        const tieneAcceso = permisosActuales.includes(mod.id);
        const esAdmin =
          perfil.PerfilID === 1 ||
          perfil.Nombre.toUpperCase() === "ADMINISTRADOR";
        const checkStatus = tieneAcceso || esAdmin ? "checked" : "";
        const checkDisabled = esAdmin ? "disabled" : "";

        contenedor.innerHTML += `
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
    } catch (error) {
      Swal.fire(
        "Error",
        "No se pudieron obtener los permisos del servidor.",
        "error",
      );
    }
  };

  // 5. Guardar Permisos de un Perfil
  const formPermisos = document.getElementById("formGestionPermisos");
  if (formPermisos) {
    formPermisos.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (perfilSeleccionadoParaPermisos === 1) {
        Swal.fire(
          "Acción Protegida",
          "El perfil Administrador cuenta con accesos globales irrevocables.",
          "info",
        );
        $("#modalPermisos").modal("hide");
        return;
      }

      const marcados = Array.from(
        document.querySelectorAll(".chk-permiso:checked"),
      ).map((el) => el.value);

      if (marcados.length === 0) {
        Swal.fire(
          "Atención",
          "Debe asignar al menos un módulo de acceso para este perfil.",
          "warning",
        );
        return;
      }

      try {
        const res = await fetch("http://localhost:3000/api/permisos/guardar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            perfilId: perfilSeleccionadoParaPermisos,
            modulos: marcados,
          }),
        });

        const data = await res.json();
        if (data.success) {
          Swal.fire(
            "¡Guardado!",
            "Los accesos han sido actualizados.",
            "success",
          );
          $("#modalPermisos").modal("hide");
        }
      } catch (error) {
        Swal.fire("Error", "Error de comunicación con el servidor.", "error");
      }
    });
  }

  // 6. Cargar datos en Modal de Edición
  window.editarPerfil = (id) => {
    if (id === 1) {
      Swal.fire(
        "Acción Inválida",
        "El perfil Administrador Raíz no puede ser modificado.",
        "warning",
      );
      return;
    }

    const perfil = listaPerfilesGlobal.find((p) => p.PerfilID === id);
    if (!perfil) return;

    perfilEditandoId = id;
    document.getElementById("editPerfNombre").value = perfil.Nombre;
    document.getElementById("editPerfDesc").value = perfil.Descripcion || "";
    $("#modalEditarPerfil").modal("show");
  };

  // 7. Procesar Envío de Edición
  document
    .getElementById("formEditarPerfil")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      if (perfilEditandoId === 1) {
        Swal.fire("Error", "Operación denegada sobre el perfil raíz.", "error");
        $("#modalEditarPerfil").modal("hide");
        return;
      }

      const data = {
        Nombre: document.getElementById("editPerfNombre").value,
        Descripcion: document.getElementById("editPerfDesc").value.trim(),
      };

      if (!data.Nombre) {
        Swal.fire(
          "Atención",
          "Debe seleccionar un rol válido de la lista.",
          "warning",
        );
        return;
      }

      if (!data.Descripcion || data.Descripcion.length < 10) {
        Swal.fire(
          "Atención",
          "La descripción es requerida y debe contener al menos 10 caracteres explícitos.",
          "warning",
        );
        return;
      }

      try {
        const res = await fetch(
          `http://localhost:3000/api/perfiles/${perfilEditandoId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );

        if ((await res.json()).success) {
          $("#modalEditarPerfil").modal("hide");
          listarPerfiles();
          Swal.fire({
            icon: "success",
            title: "¡Éxito!",
            text: "Perfil actualizado correctamente.",
            timer: 1500,
            showConfirmButton: false,
          });
        }
      } catch (e) {
        console.error(e);
        Swal.fire("Error", "No se pudo actualizar el perfil.", "error");
      }
    });

  // 8. Cambiar Estado (Activar/Desactivar)
  window.bloquearPerfil = async (id, nuevoEstado) => {
    if (id === 1) {
      Swal.fire(
        "Acción Inválida",
        "No puedes desactivar al Administrador del sistema.",
        "warning",
      );
      return;
    }

    const accion = nuevoEstado === 0 ? "desactivar" : "activar";
    const color = nuevoEstado === 0 ? "#64748b" : "#10b981";

    const conf = await Swal.fire({
      title: `¿Desea ${accion} este perfil?`,
      text: "Esto afectará el acceso de todos los usuarios vinculados.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: color,
      confirmButtonText: `Sí, ${accion}`,
    });

    if (conf.isConfirmed) {
      try {
        const res = await fetch(
          `http://localhost:3000/api/perfiles/bloquear/${id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: nuevoEstado }),
          },
        );
        const data = await res.json();

        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Estado actualizado",
            timer: 1500,
            showConfirmButton: false,
          });
          listarPerfiles();
        }
      } catch (error) {
        Swal.fire("Error", "No se pudo cambiar el estado del perfil.", "error");
      }
    }
  };

  // 9. Lanzar Modal Crear
  window.abrirModalCrear = () => {
    document.getElementById("formCrearPerfil").reset();
    $("#modalCrearPerfil").modal("show");
  };

  // 10. Procesar Envío de Registro Nuevo
  const formCrear = document.getElementById("formCrearPerfil");
  if (formCrear) {
    formCrear.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        Nombre: document.getElementById("nuevoPerfNombre").value,
        Descripcion: document.getElementById("nuevoPerfDesc").value.trim(),
      };

      if (!data.Nombre) {
        Swal.fire(
          "Atención",
          "Debe seleccionar una designación de rol comercial válida.",
          "warning",
        );
        return;
      }

      if (!data.Descripcion || data.Descripcion.length < 10) {
        Swal.fire(
          "Atención",
          "La descripción analítica es obligatoria y debe tener al menos 10 caracteres.",
          "warning",
        );
        return;
      }

      const existe = listaPerfilesGlobal.some(
        (p) => p.Nombre.toLowerCase() === data.Nombre.toLowerCase(),
      );
      if (existe) {
        Swal.fire(
          "Atención",
          `El rol "${data.Nombre}" ya se encuentra registrado.`,
          "warning",
        );
        return;
      }

      try {
        const res = await fetch("http://localhost:3000/api/perfiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await res.json();
        if (result.success) {
          $("#modalCrearPerfil").modal("hide");
          listarPerfiles();
          Swal.fire({
            icon: "success",
            title: "¡Perfil Creado!",
            text: "Ahora puedes asignarle permisos en el botón de la llave.",
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire("Atención", result.mensaje, "warning");
        }
      } catch (error) {
        Swal.fire("Error", "No se pudo conectar con el servidor.", "error");
      }
    });
  }

  // 11. Eliminar Registro
  window.eliminarPerfil = async (id) => {
    if (id === 1) {
      Swal.fire(
        "Acción Protegida",
        "Operación denegada. El perfil raíz es vital para el sistema.",
        "error",
      );
      return;
    }

    const perfil = listaPerfilesGlobal.find((p) => p.PerfilID === id);
    const nombrePerfil = perfil ? perfil.Nombre : "este perfil";

    const conf = await Swal.fire({
      title: `¿Eliminar perfil "${nombrePerfil}"?`,
      text: "Esta acción es permanente y borrará el registro de la base de datos.",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, eliminar",
    });

    if (conf.isConfirmed) {
      try {
        const res = await fetch(`http://localhost:3000/api/perfiles/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();

        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "¡Eliminado!",
            timer: 1500,
            showConfirmButton: false,
          });
          listarPerfiles();
        } else {
          Swal.fire({
            icon: "warning",
            title: "Acción Bloqueada",
            text: data.mensaje,
            confirmButtonColor: "#ff6a00",
          });
        }
      } catch (error) {
        Swal.fire("Error", "No se pudo conectar con el servidor.", "error");
      }
    }
  };
})();