(() => {
  let listaPerfilesGlobal = [];
  let perfilEditandoId = null;
  let perfilSeleccionadoParaPermisos = null;

  // // 1. Listado de módulos para los checkboxes
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

  // // 2. Verificación de rango Administrador
  const usuarioString = localStorage.getItem("usuarioFoxGamers");
  const usuarioLogueado = JSON.parse(usuarioString || "{}");
  if ((usuarioLogueado.Rol || "").toUpperCase() !== "ADMINISTRADOR") {
    Swal.fire(
      "Acceso Denegado",
      "Módulo restringido unicamente para personal authorized.",
      "error",
    );

    const contenedor = document.getElementById("app-content");
    if (contenedor) {
      contenedor.innerHTML = `<div class="alert alert-danger m-4 text-center font-weight-bold">Acceso no autorizado a este módulo.</div>`;
    }
    return;
  }

  listarPerfiles();

  // // 3. Listar Perfiles desde la BD
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
        '<tr><td colspan="6" class="text-danger text-center">Error de conexión</td></tr>';
    }
  }

  // // Función auxiliar para renderizar filas de la tabla
  function renderizarTabla(lista) {
    const tabla = document.getElementById("tablaPerfiles");
    if (!tabla) return;
    tabla.innerHTML = "";

    if (lista.length === 0) {
      tabla.innerHTML =
        '<tr><td colspan="6" class="text-muted py-3">No se encontraron perfiles coincidentes.</td></tr>';
      return;
    }

    lista.forEach((p) => {
      const isActivo = p.Activo === true || p.Activo === 1;
      const esAdmin =
        p.PerfilID === 1 || p.Nombre.toUpperCase() === "ADMINISTRADOR";

      const badgeEstado = isActivo
        ? '<span class="badge badge-success px-3 py-1" style="border-radius: 12px;">Activo</span>'
        : '<span class="badge badge-secondary px-3 py-1" style="border-radius: 12px;">Inactivo</span>';

      const btnBloquear = esAdmin
        ? `<button class="btn btn-sm btn-secondary mx-1 shadow-sm" disabled><i class="fas fa-ban"></i></button>`
        : `<button onclick="bloquearPerfil(${p.PerfilID}, ${isActivo ? 0 : 1})" 
                     class="btn btn-sm btn-outline-secondary mx-1 shadow-sm" 
                     title="${isActivo ? "Desactivar Perfil" : "Activar Perfil"}">
                <i class="fas ${isActivo ? "fa-ban" : "fa-check"}"></i>
             </button>`;

      tabla.innerHTML += `
                  <tr>
                      <td class="font-weight-bold text-muted">${p.PerfilID}</td>
                      <td class="font-weight-bold text-dark">${p.Nombre}</td>
                      <td class="text-muted small">${p.Descripcion || "-"}</td>
                      <td>${badgeEstado}</td>
                      <td class="text-muted small">${new Date(p.FechaCreacion).toLocaleString("es-PE")}</td>
                      <td>
                          <button onclick="verPermisos(${p.PerfilID})" class="btn btn-sm btn-info mx-1 shadow-sm" title="Permisos"><i class="fas fa-key"></i></button>
                          <button onclick="editarPerfil(${p.PerfilID})" class="btn btn-sm btn-warning mx-1 text-white shadow-sm" ${esAdmin ? "disabled" : ""}><i class="fas fa-pencil-alt"></i></button>
                          ${btnBloquear}
                          <button onclick="eliminarPerfil(${p.PerfilID})" class="btn btn-sm btn-danger mx-1 shadow-sm" ${esAdmin ? "disabled" : ""}><i class="fas fa-trash"></i></button>
                      </td>
                  </tr>`;
    });
  }

  // // Filtro dinámico del buscador de perfiles (Seguridad local sin saturar la red)
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

  // // 4. Ver modal de permisos por Perfil
  window.verPermisos = async (id) => {
    const perfil = listaPerfilesGlobal.find((p) => p.PerfilID === id);
    if (!perfil) return;

    perfilSeleccionadoParaPermisos = id;
    document.getElementById("lblPermisoTitulo").textContent =
      `Perfil: ${perfil.Nombre}`;

    const badge = document.getElementById("lblPermisoRol");
    badge.textContent = perfil.Nombre.toUpperCase();
    badge.className = `badge px-3 py-2 mt-1 shadow-sm ${perfil.Nombre.toUpperCase() === "ADMINISTRADOR" ? "badge-danger" : "badge-info"}`;

    const contenedor = document.getElementById("contenedorPermisos");
    contenedor.innerHTML =
      '<div class="col-12 text-center py-3"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

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
                        <div class="custom-control custom-checkbox border rounded p-2 px-4 shadow-sm bg-white">
                            <input type="checkbox" class="custom-control-input chk-permiso" id="chk-${mod.id}" value="${mod.id}" ${checkStatus} ${checkDisabled}>
                            <label class="custom-control-label d-flex align-items-center" for="chk-${mod.id}">
                                <i class="fas ${mod.icono} mr-2 text-secondary" style="width:20px"></i>
                                <span class="small font-weight-bold">${mod.nombre}</span>
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

  // // 5. Guardar Permisos de un Perfil
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

  // // 6. Cargar datos en Modal de Edición
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

  // // 7. Procesar Envío de Edición
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
        Nombre: document.getElementById("editPerfNombre").value, // Captura el valor del select estructurado
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
          Swal.fire("¡Éxito!", "Perfil actualizado correctamente.", "success");
        }
      } catch (e) {
        console.error(e);
        Swal.fire("Error", "No se pudo actualizar el perfil.", "error");
      }
    });

  // // 8. Cambiar Estado (Activar/Desactivar)
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
    const color = nuevoEstado === 0 ? "#6c757d" : "#28a745";

    const conf = await Swal.fire({
      title: `¿Desea ${accion} este perfil?`,
      text: "Esto afectará el acceso de todos los usuarios vinculados.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: color,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: "Cancelar",
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
            text: data.mensaje,
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

  // // 9. Lanzar Modal Crear
  window.abrirModalCrear = () => {
    document.getElementById("formCrearPerfil").reset();
    $("#modalCrearPerfil").modal("show");
  };

  // // 10. Procesar Envío de Registro Nuevo
  const formCrear = document.getElementById("formCrearPerfil");
  if (formCrear) {
    formCrear.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        Nombre: document.getElementById("nuevoPerfNombre").value, // Extrae la selección del select controlado
        Descripcion: document.getElementById("nuevoPerfDesc").value.trim(),
      };

      // // VALIDACIÓN EXPLÍCITA CONTRA TEXTO BASURA O VALORES NULOS
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
          `El rol "${data.Nombre}" ya se encuentra registrado en el sistema.`,
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

  // // 11. Eliminar Registro
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
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, eliminar definitivamente",
      cancelButtonText: "Cancelar",
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
            text: data.mensaje,
            timer: 2000,
            showConfirmButton: false,
          });
          listarPerfiles();
        } else {
          Swal.fire({
            icon: "warning",
            title: "Acción Bloqueada",
            text: data.mensaje,
            confirmButtonColor: "#f89406",
          });
        }
      } catch (error) {
        Swal.fire("Error", "No se pudo conectar con el servidor.", "error");
      }
    }
  };
})();