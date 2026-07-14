import { usuariosApi } from "./usuariosApi.js";
import { usuariosState } from "./usuariosState.js";

const regexNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
const regexUsuario = /^[a-zA-Z]+$/;
const regexPwdFuerte =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&._-]{8,}$/;
const regexBasura = /([a-zA-Z0-9])\1\1/;
const tecladoPerezoso = /(asd|qwe|zxc|12345)/i;

// ==========================================
// 1. UI Y RENDERIZADO
// ==========================================
const cargarPerfilesSelect = async () => {
  const select = document.getElementById("usuRol");
  if (!select) return;
  try {
    const perfiles = await usuariosApi.obtenerPerfiles();
    select.innerHTML =
      '<option value="" disabled selected>-- Seleccione Perfil --</option>';
    perfiles.forEach((p) => {
      if (p.Activo)
        select.innerHTML += `<option value="${p.PerfilID}">${p.Nombre}</option>`;
    });
  } catch (e) {
    select.innerHTML =
      '<option value="" disabled>Error al cargar perfiles</option>';
  }
};

const renderizarTablaUsuarios = (lista) => {
  const tabla = document.getElementById("tablaUsuarios");
  if (!tabla) return;
  tabla.innerHTML = "";

  if (lista.length === 0) {
    tabla.innerHTML =
      '<tr><td colspan="7" class="py-4 font-weight-bold text-muted">No se encontraron usuarios.</td></tr>';
    return;
  }

  lista.forEach((u) => {
    const isActivo = u.Activo === true || u.Activo === 1;
    const soyYo = u.UsuarioID === usuariosState.getMiPropioID();
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
            <td class="font-weight-bold text-muted">${u.UsuarioID}</td>
            <td class="text-left dato-critico pl-4">${u.Nombre} ${esAdminRaiz ? '<i class="fas fa-crown text-warning ml-2" title="Cuenta Raíz"></i>' : ""}</td>
            <td class="dato-critico text-info">${u.Usuario}</td>
            <td class="font-weight-bold text-muted">${u.Correo || "---"}</td>
            <td class="dato-critico text-muted">${u.Perfil}</td>
            <td><span class="badge ${isActivo ? "badge-success" : "badge-secondary"}">${isActivo ? "Activo" : "Inactivo"}</span></td>
            <td>
                <div class="btn-group">
                    <button onclick="editarUsuarioUI(${u.UsuarioID})" class="btn btn-sm btn-fox mx-1 shadow-sm" style="border-radius: 4px; width: 34px; height: 34px;" title="Editar" ${bloquearEdicion ? "disabled" : ""}><i class="fas fa-pencil-alt"></i></button>
                    <button onclick="cambiarEstadoUsuarioUI(${u.UsuarioID}, ${isActivo ? 0 : 1})" class="btn btn-sm ${btnToggleClass} mx-1 shadow-sm" style="border-radius: 4px; width: 34px; height: 34px;" title="${isActivo ? "Bloquear" : "Activar"}" ${bloquearEstado ? "disabled" : ""}><i class="fas ${iconToggle}"></i></button>
                    <button onclick="eliminarUsuarioUI(${u.UsuarioID})" class="btn btn-sm btn-fox-danger mx-1 shadow-sm" style="border-radius: 4px; width: 34px; height: 34px;" title="Eliminar" ${bloquearBorrado ? "disabled" : ""}><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
  });
};

// ==========================================
// 2. INICIALIZACIÓN Y EVENTOS
// ==========================================
const listarUsuarios = async () => {
  try {
    const datos = await usuariosApi.obtenerUsuarios();
    usuariosState.setUsuarios(datos);
    renderizarTablaUsuarios(datos);
  } catch (e) {
    document.getElementById("tablaUsuarios").innerHTML =
      '<tr><td colspan="7" class="text-danger font-weight-bold py-4">Error de conexión.</td></tr>';
  }
};

const inicializarModulo = () => {
  const usuarioString = localStorage.getItem("usuarioFoxGamers");
  if (!usuarioString) return (window.location.href = "../../login/login.html");

  usuariosState.init(usuarioString);
  listarUsuarios();

  const inputBusq = document.getElementById("busquedaUsuario");
  if (inputBusq) {
    inputBusq.addEventListener("input", (e) => {
      const txt = e.target.value.toLowerCase().trim();
      const filtrados = usuariosState
        .getUsuarios()
        .filter(
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

  document
    .getElementById("btnAbrirModalUsuario")
    ?.addEventListener("click", async () => {
      document.getElementById("formUsuario").reset();
      usuariosState.setEditandoId(null);
      document.getElementById("pwdHelp").textContent =
        "Mínimo 8 caracteres obligatorios.";
      document.getElementById("btnGuardarUsuario").innerHTML =
        '<i class="fas fa-save mr-2"></i> Guardar Usuario';
      await cargarPerfilesSelect();
      $("#modalUsuario").modal("show");
    });

  document
    .getElementById("formUsuario")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userData = {
        Nombre: document.getElementById("usuNombre").value.trim(),
        Usuario: document.getElementById("usuLogin").value.trim(),
        Password: document.getElementById("usuPwd").value,
        Correo: document.getElementById("usuCorreo").value.trim(),
        PerfilID: document.getElementById("usuRol").value, 
      };

      if (
        !userData.Nombre ||
        !userData.Usuario ||
        !userData.Correo ||
        !userData.PerfilID
      )
        return Swal.fire(
          "Campos Incompletos",
          "Por favor, llene los datos obligatorios.",
          "warning",
        );
      if (!regexNombre.test(userData.Nombre))
        return Swal.fire(
          "Nombre Inválido",
          "Solo letras y espacios reales.",
          "warning",
        );
      if (!regexUsuario.test(userData.Usuario))
        return Swal.fire(
          "Usuario Inválido",
          "Solo letras (sin números ni espacios).",
          "error",
        );
      if (
        regexBasura.test(userData.Nombre) ||
        regexBasura.test(userData.Usuario) ||
        tecladoPerezoso.test(userData.Nombre)
      )
        return Swal.fire("Texto Sospechoso", "Patrones detectados.", "error");

      const isUpdate = usuariosState.getEditandoId();
      if (!isUpdate && !regexPwdFuerte.test(userData.Password)) {
        return Swal.fire(
          "Contraseña Insegura",
          "Mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.",
          "error",
        );
      } else if (
        isUpdate &&
        userData.Password !== "" &&
        !regexPwdFuerte.test(userData.Password)
      ) {
        return Swal.fire(
          "Contraseña Insegura",
          "Mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.",
          "error",
        );
      }

      try {
        const res = isUpdate
          ? await usuariosApi.actualizarUsuario(isUpdate, userData)
          : await usuariosApi.crearUsuario(userData);
        if (res.success) {
          Swal.fire({
            icon: "success",
            title: "¡Completado!",
            text: res.mensaje,
            timer: 1500,
            showConfirmButton: false,
          });
          $("#modalUsuario").modal("hide");
          listarUsuarios();
        } else Swal.fire("Atención", res.mensaje, "warning");
      } catch (error) {
        Swal.fire("Error", "No se pudo procesar la solicitud.", "error");
      }
    });

  // ==========================================
  // 3. FUNCIONES GLOBALES
  // ==========================================
  window.editarUsuarioUI = async (id) => {
    const user = usuariosState.getUsuarioById(id);
    if (!user) return;
    usuariosState.setEditandoId(id);
    await cargarPerfilesSelect();

    document.getElementById("usuNombre").value = user.Nombre;
    document.getElementById("usuLogin").value = user.Usuario;
    document.getElementById("usuCorreo").value = user.Correo || "";
    document.getElementById("usuPwd").value = "";
    document.getElementById("pwdHelp").textContent =
      "Déjalo en blanco si no deseas cambiar la contraseña.";
    document.getElementById("usuRol").value = user.PerfilID; 

    document.getElementById("btnGuardarUsuario").innerHTML =
      '<i class="fas fa-save mr-2"></i> Actualizar Cambios';
    $("#modalUsuario").modal("show");
  };

  window.cambiarEstadoUsuarioUI = async (id, nuevoEstado) => {
    if (id === 1)
      return Swal.fire(
        "Acción Restringida",
        "Administrador principal no bloqueable.",
        "error",
      );
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
        const res = await usuariosApi.cambiarEstado(id, nuevoEstado);
        if (res.success) listarUsuarios();
      } catch (e) {
        Swal.fire("Error", "Fallo al cambiar estado.", "error");
      }
    }
  };

  window.eliminarUsuarioUI = async (id) => {
    if (id === 1)
      return Swal.fire(
        "Acción Restringida",
        "No se puede eliminar la cuenta raíz.",
        "error",
      );
    const conf = await Swal.fire({
      title: "¿Eliminar definitivamente?",
      text: "Esta acción borrará al usuario.",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, eliminar",
    });
    if (conf.isConfirmed) {
      try {
        const res = await usuariosApi.eliminarUsuario(id);
        if (res.success) {
          Swal.fire("Eliminado", res.mensaje, "success");
          listarUsuarios();
        } else Swal.fire("Atención", res.mensaje, "warning"); 
      } catch (e) {
        Swal.fire("Error", "Error de servidor.", "error");
      }
    }
  };
};

inicializarModulo();