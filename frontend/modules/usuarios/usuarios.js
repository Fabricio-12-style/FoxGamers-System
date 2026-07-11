(() => {
  let listaUsuariosGlobal = [];
  let usuarioEditandoId = null;

  // CONFIGURACIÓN DE SEGURIDAD Y TOKEN
  const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
  const authHeaders = { Authorization: `Bearer ${getToken()}` };
  const authHeadersJson = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const usuarioString = localStorage.getItem("usuarioFoxGamers");
  if (!usuarioString) return (window.location.href = "../../login/login.html");

  const usuarioLogueado = JSON.parse(usuarioString);
  const miPropioID = usuarioLogueado.UsuarioID || usuarioLogueado.id;

  listarUsuarios();

  // 2. Cargar Perfiles Dinámicos
  async function cargarPerfilesSelect() {
    const select = document.getElementById("usuRol");
    if (!select) return;

    try {
      const res = await fetch("http://localhost:3000/api/perfiles", {
        headers: authHeaders,
      });
      const perfiles = await res.json();

      select.innerHTML =
        '<option value="" disabled selected>-- Seleccione Perfil --</option>';

      perfiles.forEach((p) => {
        if (p.Activo) {
          select.innerHTML += `<option value="${p.Nombre.toUpperCase()}">${p.Nombre}</option>`;
        }
      });
    } catch (e) {
      console.error("Error cargando perfiles:", e);
      select.innerHTML =
        '<option value="" disabled>Error al conectar con perfiles</option>';
    }
  }

  const btnAbrirCrear = document.getElementById("btnAbrirModalUsuario");
  if (btnAbrirCrear) {
    btnAbrirCrear.addEventListener("click", async () => {
      limpiarFormularioUsuario();
      await cargarPerfilesSelect();
      $("#modalUsuario").modal("show");
    });
  }

  // 4. Listar Usuarios desde la API
  async function listarUsuarios() {
    const tabla = document.getElementById("tablaUsuarios");
    if (!tabla) return;
    tabla.innerHTML =
      '<tr><td colspan="7" class="py-4" style="color: var(--fox-text-gray);"><i class="fas fa-spinner fa-spin mr-2"></i> Cargando usuarios...</td></tr>';

    try {
      const res = await fetch("http://localhost:3000/api/usuarios", {
        headers: authHeaders,
      });
      listaUsuariosGlobal = await res.json();
      renderizarTablaUsuarios(listaUsuariosGlobal);
    } catch (e) {
      tabla.innerHTML =
        '<tr><td colspan="7" class="text-danger font-weight-bold py-4">Error de conexión con el servidor.</td></tr>';
    }
  }

  function renderizarTablaUsuarios(lista) {
    const tabla = document.getElementById("tablaUsuarios");
    if (!tabla) return;
    tabla.innerHTML = "";

    if (lista.length === 0) {
      tabla.innerHTML =
        '<tr><td colspan="7" class="py-4 font-weight-bold" style="color: var(--fox-text-gray);">No se encontraron usuarios.</td></tr>';
      return;
    }

    lista.forEach((u) => {
      const isActivo = u.Activo === true || u.Activo === 1;
      const soyYo = u.UsuarioID === miPropioID;
      const esAdminRaiz = u.UsuarioID === 1;

      const rowStyle = isActivo
        ? ""
        : "opacity: 0.5; filter: grayscale(1); background-color: #f1f5f9;";
      const bloquearEdicion = !isActivo && !soyYo;
      const bloquearBorrado = soyYo || esAdminRaiz;
      const bloquearEstado = soyYo || esAdminRaiz;

      const btnToggleClass = isActivo ? "btn-secondary" : "btn-fox-cyan";
      const iconToggle = isActivo ? "fa-user-slash" : "fa-user-check";

      tabla.innerHTML += `
        <tr style="${rowStyle}">
            <td class="font-weight-bold" style="color: var(--fox-text-gray);">${u.UsuarioID}</td>
            <td class="text-left dato-critico pl-4">
                ${u.Nombre} ${esAdminRaiz ? '<i class="fas fa-crown text-warning ml-2" title="Cuenta Raíz"></i>' : ""}
            </td>
            <td class="dato-critico text-info">${u.Usuario}</td>
            <td class="font-weight-bold" style="color: var(--fox-text-gray);">${u.Correo || "---"}</td>
            <td class="dato-critico" style="color: var(--fox-text-gray) !important;">${u.Perfil}</td>
            <td>
                <span class="badge ${isActivo ? "badge-success" : "badge-secondary"}">
                    ${isActivo ? "Activo" : "Inactivo"}
                </span>
            </td>
            <td>
                <div class="btn-group">
                    <button onclick="editarUsuario(${u.UsuarioID})" class="btn btn-sm btn-fox mx-1 shadow-sm" style="border-radius: 4px; width: 34px; height: 34px;" title="Editar" ${bloquearEdicion ? "disabled" : ""}>
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button onclick="cambiarEstadoUsuario(${u.UsuarioID}, ${isActivo ? 0 : 1})" class="btn btn-sm ${btnToggleClass} mx-1 shadow-sm" style="border-radius: 4px; width: 34px; height: 34px;" title="${isActivo ? "Bloquear" : "Activar"}" ${bloquearEstado ? "disabled" : ""}>
                        <i class="fas ${iconToggle}"></i>
                    </button>
                    <button onclick="eliminarUsuario(${u.UsuarioID})" class="btn btn-sm btn-fox-danger mx-1 shadow-sm" style="border-radius: 4px; width: 34px; height: 34px;" title="Eliminar" ${bloquearBorrado ? "disabled" : ""}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    });
  }

  // 5. GUARDAR / ACTUALIZAR
  const formUsuario = document.getElementById("formUsuario");
  if (formUsuario) {
    formUsuario.addEventListener("submit", async (e) => {
      e.preventDefault();

      const userData = {
        Nombre: document.getElementById("usuNombre").value.trim(),
        Usuario: document.getElementById("usuLogin").value.trim(),
        Password: document.getElementById("usuPwd").value,
        Correo: document.getElementById("usuCorreo").value.trim(),
        Rol: document.getElementById("usuRol").value,
      };

      const regexNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
      const regexUsuario = /^[a-zA-Z]+$/;
      const regexPwdFuerte =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&._-]{8,}$/;
      const regexBasura = /([a-zA-Z0-9])\1\1/;
      const tecladoPerezoso = /(asd|qwe|zxc|12345)/i;

      if (
        !userData.Nombre ||
        !userData.Usuario ||
        !userData.Correo ||
        !userData.Rol
      ) {
        Swal.fire(
          "Campos Incompletos",
          "Por favor, llene todos los datos obligatorios.",
          "warning",
        );
        return;
      }

      if (!regexNombre.test(userData.Nombre)) {
        Swal.fire(
          "Nombre Inválido",
          "El nombre completo solo debe contener letras y espacios reales.",
          "warning",
        );
        return;
      }

      if (!regexUsuario.test(userData.Usuario)) {
        Swal.fire(
          "Usuario Inválido",
          "El nombre de inicio de sesión es estricto: solo puede contener letras (sin números, espacios ni símbolos).",
          "error",
        );
        return;
      }

      if (
        regexBasura.test(userData.Nombre) ||
        regexBasura.test(userData.Usuario) ||
        tecladoPerezoso.test(userData.Nombre)
      ) {
        Swal.fire(
          "Texto Sospechoso",
          "Se han detectado patrones de texto sin sentido. Ingrese datos reales.",
          "error",
        );
        return;
      }

      if (!usuarioEditandoId) {
        if (!regexPwdFuerte.test(userData.Password)) {
          Swal.fire(
            "Contraseña Insegura",
            "Debe tener mínimo 8 caracteres, incluir al menos UNA mayúscula, UNA minúscula y UN número.",
            "error",
          );
          return;
        }
      } else {
        if (
          userData.Password !== "" &&
          !regexPwdFuerte.test(userData.Password)
        ) {
          Swal.fire(
            "Contraseña Insegura",
            "La nueva contraseña debe tener mínimo 8 caracteres, UNA mayúscula, UNA minúscula y UN número.",
            "error",
          );
          return;
        }
      }

      const url = usuarioEditandoId
        ? `http://localhost:3000/api/usuarios/${usuarioEditandoId}`
        : "http://localhost:3000/api/usuarios";
      const method = usuarioEditandoId ? "PUT" : "POST";

      try {
        const res = await fetch(url, {
          method: method,
          headers: authHeadersJson,
          body: JSON.stringify(userData),
        });
        const data = await res.json();

        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "¡Completado!",
            text: data.mensaje,
            timer: 1500,
            showConfirmButton: false,
          });
          $("#modalUsuario").modal("hide");
          listarUsuarios();
        } else {
          Swal.fire("Atención", data.mensaje, "warning");
        }
      } catch (error) {
        Swal.fire("Error", "No se pudo procesar la solicitud.", "error");
      }
    });
  }

  // 6. Preparar Formulario de Edición
  window.editarUsuario = async (id) => {
    const user = listaUsuariosGlobal.find((u) => u.UsuarioID === id);
    if (!user) return;

    usuarioEditandoId = id;
    await cargarPerfilesSelect();

    document.getElementById("usuNombre").value = user.Nombre;
    document.getElementById("usuLogin").value = user.Usuario;
    document.getElementById("usuCorreo").value = user.Correo || "";

    const inputPwd = document.getElementById("usuPwd");
    inputPwd.value = "";
    document.getElementById("pwdHelp").textContent =
      "Déjalo en blanco si no deseas cambiar la contraseña.";

    document.getElementById("usuRol").value = (user.Perfil || "").toUpperCase();

    const btn = document.getElementById("btnGuardarUsuario");
    btn.innerHTML = '<i class="fas fa-save mr-2"></i> Actualizar Cambios';
    btn.className = "btn btn-fox px-4 shadow";

    $("#modalUsuario").modal("show");
  };

  // 7. Cambiar Estado (Bloquear/Desbloquear)
  window.cambiarEstadoUsuario = async (id, nuevoEstado) => {
    if (id === 1) {
      Swal.fire(
        "Acción Restringida",
        "La cuenta del Administrador principal no puede ser bloqueada.",
        "error",
      );
      return;
    }

    const accion = nuevoEstado === 0 ? "bloquear" : "activar";
    const conf = await Swal.fire({
      title: `¿Desea ${accion} este usuario?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: nuevoEstado === 0 ? "#64748b" : "#10b981",
      confirmButtonText: `Sí, ${accion}`,
    });

    if (conf.isConfirmed) {
      try {
        const res = await fetch(
          `http://localhost:3000/api/usuarios/bloquear/${id}`,
          {
            method: "PUT",
            headers: authHeadersJson,
            body: JSON.stringify({ estado: nuevoEstado }),
          },
        );
        if ((await res.json()).success) listarUsuarios();
      } catch (e) {
        Swal.fire("Error", "No se pudo cambiar el estado.", "error");
      }
    }
  };

  // 8. Eliminar Usuario
  window.eliminarUsuario = async (id) => {
    if (id === 1) {
      Swal.fire(
        "Acción Restringida",
        "Violación de seguridad: No se puede eliminar el usuario raíz del sistema.",
        "error",
      );
      return;
    }

    const conf = await Swal.fire({
      title: "¿Eliminar definitivamente?",
      text: "Esta acción borrará al usuario de la base de datos.",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, eliminar",
    });

    if (conf.isConfirmed) {
      try {
        const res = await fetch(`http://localhost:3000/api/usuarios/${id}`, {
          method: "DELETE",
          headers: authHeaders,
        });
        const data = await res.json();

        if (data.success) {
          Swal.fire("Eliminado", data.mensaje, "success");
          listarUsuarios();
        } else {
          Swal.fire("Atención", data.mensaje, "warning");
        }
      } catch (e) {
        Swal.fire("Error", "Error de comunicación con el servidor.", "error");
      }
    }
  };

  function limpiarFormularioUsuario() {
    formUsuario.reset();
    usuarioEditandoId = null;
    document.getElementById("pwdHelp").textContent =
      "Mínimo 8 caracteres obligatorios.";

    const btn = document.getElementById("btnGuardarUsuario");
    btn.innerHTML = '<i class="fas fa-save mr-2"></i> Guardar Usuario';
    btn.className = "btn btn-fox px-4 shadow";
  }

  const inputBusq = document.getElementById("busquedaUsuario");
  if (inputBusq) {
    inputBusq.addEventListener("input", (e) => {
      const txt = e.target.value.toLowerCase().trim();
      const filtrados = listaUsuariosGlobal.filter(
        (u) =>
          u.Nombre.toLowerCase().includes(txt) ||
          u.Usuario.toLowerCase().includes(txt) ||
          u.Perfil.toLowerCase().includes(txt) ||
          (u.Correo || "").toLowerCase().includes(txt),
      );
      renderizarTablaUsuarios(filtrados);
    });
  }

  const inputUsuarioLogin = document.getElementById("usuLogin");
  if (inputUsuarioLogin) {
    inputUsuarioLogin.addEventListener("input", function () {
      this.value = this.value.replace(/[^a-zA-Z]/g, "");
    });
  }
})();