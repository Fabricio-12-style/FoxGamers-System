(() => {
  let listaUsuariosGlobal = [];
  let usuarioEditandoId = null;

  // // 1. Verificación de Seguridad y Sesión
  const usuarioString = localStorage.getItem("usuarioFoxGamers");
  if (!usuarioString) return (window.location.href = "../../login/login.html");

  const usuarioLogueado = JSON.parse(usuarioString);
  const miPropioID = usuarioLogueado.UsuarioID || usuarioLogueado.id;

  listarUsuarios();

  // // 2. Cargar Perfiles Dinámicos (Lista Cerrada)
  async function cargarPerfilesSelect() {
    const select = document.getElementById("usuRol");
    if (!select) return;

    try {
      const res = await fetch("http://localhost:3000/api/perfiles");
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
        '<option value="">Error al conectar con perfiles</option>';
    }
  }

  // // 3. Configurar botón de "Nuevo Usuario"
  const btnAbrirCrear = document.getElementById("btnAbrirModalUsuario");
  if (btnAbrirCrear) {
    btnAbrirCrear.addEventListener("click", async () => {
      limpiarFormularioUsuario();
      await cargarPerfilesSelect();
      $("#modalUsuario").modal("show");
    });
  }

  // // 4. Listar Usuarios desde la API
  async function listarUsuarios() {
    const tabla = document.getElementById("tablaUsuarios");
    if (!tabla) return;
    tabla.innerHTML =
      '<tr><td colspan="7"><i class="fas fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>';

    try {
      const res = await fetch("http://localhost:3000/api/usuarios");
      listaUsuariosGlobal = await res.json();
      renderizarTablaUsuarios(listaUsuariosGlobal);
    } catch (e) {
      tabla.innerHTML =
        '<tr><td colspan="7" class="text-danger">Error de conexión con el servidor.</td></tr>';
    }
  }

  // // 4.1. Renderizador aislado para compatibilidad con el Buscador
  function renderizarTablaUsuarios(lista) {
    const tabla = document.getElementById("tablaUsuarios");
    if (!tabla) return;
    tabla.innerHTML = "";

    if (lista.length === 0) {
      tabla.innerHTML =
        '<tr><td colspan="7" class="text-muted py-3">No se encontraron usuarios.</td></tr>';
      return;
    }

    lista.forEach((u) => {
      const isActivo = u.Activo === true || u.Activo === 1;
      const soyYo = u.UsuarioID === miPropioID;
      const esAdminRaiz = u.UsuarioID === 1; // // PROTECCIÓN: Identificar la cuenta intocable

      const rowStyle = isActivo
        ? ""
        : "opacity: 0.6; filter: grayscale(1); background-color: #f8f9fa;";

      // El Admin raíz solo puede ser editado por él mismo. Nadie lo puede borrar ni bloquear.
      const bloquearEdicion = !isActivo && !soyYo;
      const bloquearBorrado = soyYo || esAdminRaiz;
      const bloquearEstado = soyYo || esAdminRaiz;

      tabla.innerHTML += `
            <tr style="${rowStyle}">
                <td class="text-muted font-weight-bold">${u.UsuarioID}</td>
                <td class="font-weight-bold text-dark text-left pl-4">
                    ${u.Nombre} ${esAdminRaiz ? '<i class="fas fa-crown text-warning ml-1" title="Cuenta Raíz"></i>' : ""}
                </td>
                <td>${u.Usuario}</td>
                <td class="text-muted small">${u.Correo || "---"}</td>
                <td class="font-weight-bold text-info">${u.Perfil}</td>
                <td>
                    <span class="badge ${isActivo ? "badge-success" : "badge-secondary"} px-3 py-1" style="border-radius: 12px;">
                        ${isActivo ? "Activo" : "Inactivo"}
                    </span>
                </td>
                <td>
                    <div class="btn-group">
                        <button onclick="editarUsuario(${u.UsuarioID})" class="btn btn-sm btn-warning mx-1 text-white shadow-sm" ${bloquearEdicion ? "disabled" : ""}>
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button onclick="cambiarEstadoUsuario(${u.UsuarioID}, ${isActivo ? 0 : 1})" class="btn btn-sm btn-secondary mx-1 shadow-sm" ${bloquearEstado ? "disabled" : ""}>
                            <i class="fas ${isActivo ? "fa-ban" : "fa-check"}"></i>
                        </button>
                        <button onclick="eliminarUsuario(${u.UsuarioID})" class="btn btn-sm btn-danger mx-1 shadow-sm" ${bloquearBorrado ? "disabled" : ""}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    });
  }
  // // 5. GUARDAR / ACTUALIZAR (CON SEGURIDAD REGEX AVANZADA)
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

      // == EXPRESIONES REGULARES DE VALIDACIÓN ==
      const regexNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/; // Solo letras y espacios
      const regexPwdFuerte =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&._-]{8,}$/; // Mayús, Minús, Número, min 8
      const regexBasura = /([a-zA-Z0-9])\1\1/; // Detecta 3 caracteres iguales seguidos (ej: aaa, 111)
      const tecladoPerezoso = /(asd|qwe|zxc|12345)/i; // Detecta barridos de teclado

      // 1. Validar Campos Nulos
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

      // 2. Validar Coherencia de Nombre y Usuario (Anti-Basura)
      if (!regexNombre.test(userData.Nombre)) {
        Swal.fire(
          "Nombre Inválido",
          "El nombre completo solo debe contener letras y espacios reales.",
          "warning",
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

      // 3. Validar Contraseña Robusta
      if (!usuarioEditandoId) {
        // Creación: Contraseña estricta obligatoria
        if (!regexPwdFuerte.test(userData.Password)) {
          Swal.fire(
            "Contraseña Insegura",
            "Debe tener mínimo 8 caracteres, incluir al menos UNA mayúscula, UNA minúscula y UN número.",
            "error",
          );
          return;
        }
      } else {
        // Edición: Si escribe algo, debe ser fuerte. Si lo deja vacío, no se cambia.
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });
        const data = await res.json();

        if (data.success) {
          Swal.fire("¡Completado!", data.mensaje, "success");
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

  // // 6. Preparar Formulario de Edición
  window.editarUsuario = async (id) => {
    const user = listaUsuariosGlobal.find((u) => u.UsuarioID === id);
    if (!user) return;

    usuarioEditandoId = id;
    await cargarPerfilesSelect();

    document.getElementById("usuNombre").value = user.Nombre;
    document.getElementById("usuLogin").value = user.Usuario;
    document.getElementById("usuCorreo").value = user.Correo || "";

    // Dejar contraseña vacía y cambiar la advertencia visual
    const inputPwd = document.getElementById("usuPwd");
    inputPwd.value = "";
    document.getElementById("pwdHelp").textContent =
      "Déjalo en blanco si no deseas cambiar la contraseña.";

    document.getElementById("usuRol").value = (user.Perfil || "").toUpperCase();

    const btn = document.getElementById("btnGuardarUsuario");
    btn.textContent = "Actualizar Cambios";
    btn.className = "btn btn-warning font-weight-bold px-4 text-white";

    $("#modalUsuario").modal("show");
  };

  // // 7. Cambiar Estado (Bloquear/Desbloquear)
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
      confirmButtonColor: nuevoEstado === 0 ? "#6c757d" : "#28a745",
      confirmButtonText: `Sí, ${accion}`,
    });

    if (conf.isConfirmed) {
      try {
        const res = await fetch(
          `http://localhost:3000/api/usuarios/bloquear/${id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: nuevoEstado }),
          },
        );
        if ((await res.json()).success) listarUsuarios();
      } catch (e) {
        Swal.fire("Error", "No se pudo cambiar el estado.", "error");
      }
    }
  };

  // // 8. Eliminar Usuario
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
      confirmButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar",
    });

    if (conf.isConfirmed) {
      try {
        const res = await fetch(`http://localhost:3000/api/usuarios/${id}`, {
          method: "DELETE",
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

  // // 9. Limpiar Formulario para Creación
  function limpiarFormularioUsuario() {
    formUsuario.reset();
    usuarioEditandoId = null;
    document.getElementById("pwdHelp").textContent =
      "Mínimo 8 caracteres obligatorios.";

    const btn = document.getElementById("btnGuardarUsuario");
    btn.textContent = "Guardar Usuario";
    btn.className = "btn btn-fox font-weight-bold px-4";
  }

  // // 10. Buscador de Usuarios (Ahora sí renderiza la tabla)
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
})();
