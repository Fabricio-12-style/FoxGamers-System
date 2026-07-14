import { empresaApi } from "./empresaApi.js";
import { empresaState } from "./empresaState.js";

const camposFormulario = [
  "empRuc",
  "empRazonSocial",
  "empNombreComercial",
  "empDireccion",
  "empTelefono",
  "empCorreo",
  "empWeb",
];

// ==========================================
// 1. MANEJO DE INTERFAZ 
// ==========================================
const rellenarFormulario = (data) => {
  document.getElementById("empRuc").value = data.RUC || "";
  document.getElementById("empRazonSocial").value = data.RazonSocial || "";
  document.getElementById("empNombreComercial").value =
    data.NombreComercial || "";
  document.getElementById("empDireccion").value = data.Direccion || "";
  document.getElementById("empTelefono").value = data.Telefono || "";
  document.getElementById("empCorreo").value = data.Correo || "";
  document.getElementById("empWeb").value = data.Web || "";
};

const alternarModoInterfaz = (activarEdicion) => {
  empresaState.setModoEdicion(activarEdicion);
  const btnConsultar = document.getElementById("btnConsultarRuc");
  const btnGuardar = document.getElementById("btnGuardarEmpresa");
  const btnEditarToggle = document.getElementById("btnEditarToggle");

  if (activarEdicion) {
    camposFormulario.forEach(
      (id) => (document.getElementById(id).disabled = false),
    );
    btnConsultar.disabled = false;
    btnGuardar.classList.remove("d-none");
    btnEditarToggle.style.backgroundColor = "#64748b";
    btnEditarToggle.innerHTML =
      '<i class="fas fa-times-circle mr-2"></i> Cancelar';
  } else {
    camposFormulario.forEach(
      (id) => (document.getElementById(id).disabled = true),
    );
    btnConsultar.disabled = true;
    btnGuardar.classList.add("d-none");
    btnEditarToggle.style.backgroundColor = "#eab308";
    btnEditarToggle.innerHTML = '<i class="fas fa-edit mr-2"></i> Editar';

    const datosCache = empresaState.getDatos();
    if (datosCache) rellenarFormulario(datosCache);
  }
};

// ==========================================
// 2. LÓGICA DE INICIALIZACIÓN
// ==========================================
const iniciarModuloEmpresa = async () => {
  try {
    const resJson = await empresaApi.obtenerEmpresa();
    if (resJson.success && resJson.data) {
      empresaState.setDatos(resJson.data);
      rellenarFormulario(resJson.data);
    }
  } catch (e) {
    console.error(
      "Fallo al conectar con el servicio de datos corporativos:",
      e,
    );
    Swal.fire(
      "Error de Carga",
      "No se pudieron jalar las configuraciones de la empresa.",
      "error",
    );
  }
};

const inicializarEventos = () => {
  const btnEditarToggle = document.getElementById("btnEditarToggle");
  const btnConsultar = document.getElementById("btnConsultarRuc");
  const inputRuc = document.getElementById("empRuc");
  const form = document.getElementById("formEmpresa");
  const btnGuardar = document.getElementById("btnGuardarEmpresa");

  if (btnEditarToggle) {
    btnEditarToggle.addEventListener("click", () =>
      alternarModoInterfaz(!empresaState.isModoEdicion()),
    );
  }

  const ejecutarConsultaRuc = async () => {
    if (!empresaState.isModoEdicion()) return;
    const ruc = inputRuc.value.trim();

    if (!ruc)
      return Swal.fire(
        "Campo Vacío",
        "Por favor, ingrese un número de RUC.",
        "warning",
      );
    if (ruc.length !== 11 || isNaN(ruc))
      return Swal.fire(
        "Estructura Incorrecta",
        "El RUC debe constar de 11 dígitos.",
        "warning",
      );

    const prefijo = ruc.substring(0, 2);
    if (!["10", "20", "15", "17"].includes(prefijo)) {
      return Swal.fire(
        "RUC No Válido",
        "El prefijo del RUC no corresponde a un padrón válido.",
        "warning",
      );
    }

    btnConsultar.disabled = true;
    btnConsultar.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const camposAuto = ["empRazonSocial", "empNombreComercial", "empDireccion"];
    camposAuto.forEach((id) => {
      document.getElementById(id).disabled = true;
      document.getElementById(id).value = "Consultando...";
    });

    try {
      const result = await empresaApi.consultarRucSunat(ruc);

      if (result.success && result.data) {
        const datosSunat = result.data;
        document.getElementById("empRazonSocial").value =
          datosSunat.nombreCompleto || datosSunat.razonSocial || "";
        document.getElementById("empNombreComercial").value =
          datosSunat.nombreComercial || datosSunat.nombreCompleto || "";
        document.getElementById("empDireccion").value =
          datosSunat.direccionFiscal || datosSunat.direccion || "CHICLAYO";
        Swal.fire({
          icon: "success",
          title: "¡Encontrado!",
          text: "Campos importados.",
          timer: 1200,
          showConfirmButton: false,
        });
      } else {
        camposAuto.forEach((id) => (document.getElementById(id).value = ""));
        Swal.fire(
          "No Registrado",
          "RUC no localizado en Sunat. Ingrese los datos manualmente.",
          "info",
        );
      }
    } catch (err) {
      console.error(err);
      camposAuto.forEach((id) => (document.getElementById(id).value = ""));
      Swal.fire(
        "Fallo de Conexión",
        "Error al conectar con el padrón en vivo.",
        "error",
      );
    } finally {
      btnConsultar.disabled = false;
      btnConsultar.innerHTML =
        '<i class="fas fa-search-dollar mr-1"></i> Consultar';
      camposAuto.forEach(
        (id) => (document.getElementById(id).disabled = false),
      );
    }
  };

  if (btnConsultar) btnConsultar.addEventListener("click", ejecutarConsultaRuc);
  if (inputRuc) {
    inputRuc.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        ejecutarConsultaRuc();
      }
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rucValue = inputRuc.value.trim();

      if (rucValue.length !== 11 || isNaN(rucValue)) {
        return Swal.fire(
          "Validación Fallida",
          "Verifique el número de RUC.",
          "warning",
        );
      }

      btnGuardar.disabled = true;
      btnGuardar.innerHTML =
        '<i class="fas fa-spinner fa-spin mr-2"></i> GUARDANDO...';

      const datosEmpresa = {
        RUC: rucValue,
        RazonSocial: document.getElementById("empRazonSocial").value.trim(),
        NombreComercial: document
          .getElementById("empNombreComercial")
          .value.trim(),
        Direccion: document.getElementById("empDireccion").value.trim(),
        Telefono: document.getElementById("empTelefono").value.trim(),
        Correo: document.getElementById("empCorreo").value.trim(),
        Web: document.getElementById("empWeb").value.trim(),
      };

      try {
        const result = await empresaApi.guardarEmpresa(datosEmpresa);

        if (result.success) {
          Swal.fire({
            icon: "success",
            title: "¡Cambios Guardados!",
            text: result.mensaje,
            timer: 1800,
            showConfirmButton: false,
          });
          empresaState.setDatos(datosEmpresa);
          alternarModoInterfaz(false);
          if (typeof window.cargarDatosEmpresa === "function")
            window.cargarDatosEmpresa();
        } else {
          Swal.fire(
            "Error",
            result.mensaje || "No se pudieron salvar los cambios.",
            "error",
          );
        }
      } catch (error) {
        console.error(error);
        Swal.fire(
          "Error Crítico",
          "Fallo de comunicación con el servidor.",
          "error",
        );
      } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML =
          '<i class="fas fa-save mr-2"></i> Guardar Cambios Globales';
      }
    });
  }
};

iniciarModuloEmpresa();
inicializarEventos();