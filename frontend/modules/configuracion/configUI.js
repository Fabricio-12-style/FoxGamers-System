import { configApi } from "./configApi.js";
import { configState } from "./configState.js";

const BASE_URL = "http://localhost:3000";
const extensionesPermitidas = /(\.jpg|\.jpeg|\.png)$/i;

const obtenerRutaSegura = (url, idDefault = "1") => {
  if (!url)
    return `https://placehold.co/1200x400/f8fafc/1e293b?text=Banner+Vacio+${idDefault}`;
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith(".."))
    return url;
  return `${BASE_URL}${url}`;
};

// ==========================================
// 1. FUNCIONES DE RENDERIZADO (UI)
// ==========================================
const renderizarGaleriaLogos = () => {
  const galeriaLogos = document.getElementById("galeriaLogos");
  if (!galeriaLogos) return;

  const logos = configState.listaLogosGlobal;
  galeriaLogos.innerHTML = "";

  if (logos.length === 0) {
    galeriaLogos.innerHTML =
      '<div class="col-12 text-center py-3 font-weight-bold text-muted">No hay logos guardados.</div>';
    return;
  }

  logos.forEach((logo) => {
    const esActivo = logo.Activo === 1 || logo.Activo === true;
    const borde = esActivo
      ? "border: 3px solid var(--fox-cyan);"
      : "border: 1px solid #cbd5e1; opacity: 0.7;";
    const urlSegura = obtenerRutaSegura(logo.ImagenURL);

    const btnAccion = esActivo
      ? `<button class="btn btn-fox-success btn-sm w-100 font-weight-bold" disabled><i class="fas fa-check mr-1"></i> Principal</button>`
      : `<button class="btn btn-secondary btn-sm w-50 font-weight-bold" onclick="establecerLogoPrincipalUI(${logo.LogoID})" title="Usar"><i class="fas fa-check"></i></button>
               <button class="btn btn-fox-danger btn-sm w-50 font-weight-bold" onclick="eliminarLogoUI(${logo.LogoID})" title="Eliminar"><i class="fas fa-trash"></i></button>`;

    galeriaLogos.innerHTML += `
            <div class="col-auto mb-3 text-center">
                <div class="p-2 mb-2 rounded shadow-sm bg-white" style="${borde} width: 100px; height: 100px; display: flex; align-items: center; justify-content: center;">
                    <img src="${urlSegura}" onerror="this.src='https://placehold.co/100x100/f8fafc/1e293b?text=Error'" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
                <div class="btn-group w-100 shadow-sm" style="border-radius: 6px; overflow: hidden;">
                    ${btnAccion}
                </div>
            </div>`;
  });
};

const renderizarTablaSliders = () => {
  const galeriaSliders = document.getElementById("galeriaSliders");
  if (!galeriaSliders) return;

  const sliders = configState.listaSlidersGlobal;
  let htmlTabla = `
        <div class="bg-white border shadow-sm" style="border-radius: 12px; overflow: hidden;">
            <div class="d-none d-md-block table-responsive">
                <table class="table table-hover align-middle text-center mb-0">
                    <thead style="background-color: #f8fafc; color: var(--fox-text-gray); border-bottom: 2px solid #e2e8f0;">
                        <tr>
                            <th width="5%" class="py-3">ID</th>
                            <th width="20%">Imagen</th>
                            <th width="20%">Título</th>
                            <th width="20%">Descripción</th>
                            <th width="15%">Estado</th>
                            <th width="20%">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>`;

  if (sliders.length === 0) {
    htmlTabla += `<tr><td colspan="6" class="py-5 text-muted font-weight-bold"><i class="fas fa-images fa-2x mb-2 d-block"></i> No hay sliders guardados.</td></tr>`;
  } else {
    sliders.forEach((slider) => {
      const idDb = slider.SliderID || slider.id;
      const esActivo = slider.Activo === 1 || slider.Activo === true;
      const urlSegura = obtenerRutaSegura(slider.ImagenURL, idDb);
      const badgeEstado = esActivo
        ? `<span class="badge" style="background-color: #10b981; color: white; padding: 6px 12px; font-size: 0.75rem;">Activo</span>`
        : `<span class="badge" style="background-color: #64748b; color: white; padding: 6px 12px; font-size: 0.75rem;">Inactivo</span>`;

      htmlTabla += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td class="font-weight-bold text-muted">${idDb}</td>
                <td class="py-2">
                    <div class="border rounded shadow-sm" style="background: #ffffff; height: 50px; width: 120px; margin: 0 auto; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        <img src="${urlSegura}" onerror="this.src='https://placehold.co/120x50/f8fafc/1e293b?text=Vacio'" style="max-width: 100%; max-height: 100%; object-fit: cover;">
                    </div>
                </td>
                <td class="font-weight-bold" style="color: #334155; font-size: 0.9rem;">${slider.Titulo || "Promoción"}</td>
                <td class="text-muted" style="font-size: 0.85rem;">${slider.Descripcion || "-"}</td>
                <td>${badgeEstado}</td>
                <td>
                    <div class="btn-group shadow-sm" style="border-radius: 6px; overflow: hidden;">
                        <button class="btn btn-sm text-white" style="background-color: #eab308; width: 32px; height: 32px;" title="Editar" onclick="abrirModalSliderUI(${idDb})"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn btn-sm text-white" style="background-color: #ef4444; width: 32px; height: 32px;" title="Eliminar" onclick="eliminarSliderUI(${idDb})"><i class="fas fa-trash"></i></button>
                        <button class="btn btn-sm text-white" style="background-color: ${esActivo ? "#10b981" : "#64748b"}; width: 32px; height: 32px;" title="${esActivo ? "Desactivar" : "Activar"}" onclick="cambiarEstadoSliderUI(${idDb}, ${esActivo ? 0 : 1})"><i class="fas ${esActivo ? "fa-check" : "fa-ban"}"></i></button>
                    </div>
                </td>
            </tr>`;
    });
  }
  htmlTabla += `</tbody></table></div>`;

  if (sliders.length > 0) {
    htmlTabla += `
        <div class="d-md-none p-2">
            ${sliders
              .map((slider) => {
                const idDb = slider.SliderID || slider.id;
                const esActivo = slider.Activo === 1 || slider.Activo === true;
                const urlSegura = obtenerRutaSegura(slider.ImagenURL, idDb);
                const badgeEstado = esActivo
                  ? '<span class="badge" style="background-color: #10b981; color: white; padding: 5px 10px; font-size: 0.72rem;">Activo</span>'
                  : '<span class="badge" style="background-color: #64748b; color: white; padding: 5px 10px; font-size: 0.72rem;">Inactivo</span>';
                return `
                <div class="card border-0 shadow-sm mb-2" style="border-radius: 10px;">
                    <div class="p-2">
                        <div class="border rounded shadow-sm mb-2" style="background: #ffffff; height: 80px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                            <img src="${urlSegura}" onerror="this.src='https://placehold.co/120x80/f8fafc/1e293b?text=Vacio'" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div class="mb-2">
                            <div class="font-weight-bold" style="color: #334155; font-size: 0.95rem; line-height: 1.3; overflow-wrap: anywhere; word-break: break-word;">${slider.Titulo || "Promoción"}</div>
                            <div class="text-muted mt-1" style="font-size: 0.8rem; line-height: 1.25; overflow-wrap: anywhere; word-break: break-word;">${slider.Descripcion || "-"}</div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center flex-wrap" style="gap: 0.35rem;">
                            ${badgeEstado}
                            <div class="btn-group shadow-sm" style="border-radius: 6px; overflow: hidden;">
                                <button class="btn btn-sm text-white" style="background-color: #eab308; width: 32px; height: 32px;" title="Editar" onclick="abrirModalSliderUI(${idDb})"><i class="fas fa-pencil-alt"></i></button>
                                <button class="btn btn-sm text-white" style="background-color: #ef4444; width: 32px; height: 32px;" title="Eliminar" onclick="eliminarSliderUI(${idDb})"><i class="fas fa-trash"></i></button>
                                <button class="btn btn-sm text-white" style="background-color: ${esActivo ? "#10b981" : "#64748b"}; width: 32px; height: 32px;" title="${esActivo ? "Desactivar" : "Activar"}" onclick="cambiarEstadoSliderUI(${idDb}, ${esActivo ? 0 : 1})"><i class="fas ${esActivo ? "fa-check" : "fa-ban"}"></i></button>
                            </div>
                        </div>
                    </div>
                </div>`;
              })
              .join("")}
        </div>`;
  }

  htmlTabla += `</div>`;
  galeriaSliders.innerHTML = htmlTabla;
};

// ==========================================
// 2. LÓGICA DE INICIALIZACIÓN
// ==========================================
const cargarDatosPrincipales = async () => {
  try {
    const datos = await configApi.obtenerPublica();
    configState.setLogos(datos.logos);
    configState.setSliders(datos.sliders);
    renderizarGaleriaLogos();
    renderizarTablaSliders();
  } catch (error) {
    console.error("Error al cargar configuraciones:", error);
  }
};

const inicializarModulo = () => {
  cargarDatosPrincipales();

  $(
    '#configWebTabs a[data-toggle="tab"], #configWebTabs button[data-toggle="tab"]',
  ).on("shown.bs.tab", function (e) {
    $("#configWebTabs .nav-link").css({
      "background-color": "transparent",
      color: "var(--fox-text-gray)",
      "border-bottom": "1px solid #cbd5e1",
    });
    $(e.target).css({
      "background-color": "var(--fox-surface)",
      color: "var(--fox-cyan)",
      "border-bottom": "none",
    });
  });

  const btnSubirLogo = document.getElementById("btnSubirLogo");
  const inputFileLogo = document.getElementById("inputFileLogo");
  let archivoLogoPendiente = null;

  if (document.getElementById("btnSeleccionarArchivo")) {
    document
      .getElementById("btnSeleccionarArchivo")
      .addEventListener("click", () => inputFileLogo.click());
  }

  if (inputFileLogo) {
    inputFileLogo.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!extensionesPermitidas.exec(file.name))
        return Swal.fire("Formato Inválido", "Solo JPG o PNG.", "error");
      archivoLogoPendiente = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById("imgPreviewLogo").src = ev.target.result;
      };
      reader.readAsDataURL(file);
      document.getElementById("imgPreviewLogo").style.display = "block";
      document.getElementById("iconPlaceholderLogo").style.display = "none";
    });
  }

  if (btnSubirLogo) {
    btnSubirLogo.addEventListener("click", async () => {
      if (!archivoLogoPendiente)
        return Swal.fire("Atención", "Selecciona una imagen.", "warning");
      const formData = new FormData();
      formData.append("logo", archivoLogoPendiente);
      try {
        btnSubirLogo.disabled = true;
        btnSubirLogo.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Guardando...`;
        const result = await configApi.subirLogo(formData);
        if (result.success) {
          Swal.fire({
            icon: "success",
            title: "¡Éxito!",
            text: "Logo guardado.",
            timer: 1500,
            showConfirmButton: false,
          });
          archivoLogoPendiente = null;
          document.getElementById("imgPreviewLogo").style.display = "none";
          document.getElementById("iconPlaceholderLogo").style.display =
            "block";
          cargarDatosPrincipales();
        } else Swal.fire("Error", result.mensaje, "error");
      } catch (err) {
        Swal.fire("Error", "Fallo de conexión", "error");
      } finally {
        btnSubirLogo.disabled = false;
        btnSubirLogo.innerHTML = `<i class="fas fa-save mr-2"></i> Guardar Logo`;
      }
    });
  }

  const inputFileSlider = document.getElementById("inputFileSlider");
  const formSlider = document.getElementById("formSlider");
  const btnGuardarSlider = document.getElementById("btnGuardarSlider");
  let archivoSliderPendiente = null;

  if (inputFileSlider) {
    inputFileSlider.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!extensionesPermitidas.exec(file.name))
        return Swal.fire("Formato Inválido", "Solo JPG o PNG.", "error");
      archivoSliderPendiente = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById("imgPreviewSliderNuevo").src = ev.target.result;
      };
      reader.readAsDataURL(file);
      document.getElementById("imgPreviewSliderNuevo").style.display = "block";
      document.getElementById("iconPlaceholderSlider").style.display = "none";
    });
  }

  if (formSlider) {
    formSlider.addEventListener("submit", async (e) => {
      e.preventDefault();
      const idSlider = document.getElementById("sliderId").value;
      const isUpdate = idSlider !== "";

      if (!isUpdate && !archivoSliderPendiente)
        return Swal.fire(
          "Imagen Requerida",
          "Debes subir una imagen.",
          "warning",
        );

      const formData = new FormData();
      formData.append(
        "Titulo",
        document.getElementById("sliderTitulo").value.trim(),
      );
      formData.append(
        "Descripcion",
        document.getElementById("sliderDesc").value.trim(),
      );
      if (archivoSliderPendiente)
        formData.append("slider", archivoSliderPendiente);
      if (isUpdate) formData.append("SliderID", idSlider);

      try {
        btnGuardarSlider.disabled = true;
        btnGuardarSlider.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Guardando...`;
        const result = isUpdate
          ? await configApi.actualizarSlider(idSlider, formData)
          : await configApi.crearSlider(formData);

        if (result.success) {
          Swal.fire({
            icon: "success",
            title: "¡Éxito!",
            timer: 1500,
            showConfirmButton: false,
          });
          $("#modalSlider").modal("hide");
          cargarDatosPrincipales();
        } else Swal.fire("Error", result.mensaje, "error");
      } catch (err) {
        Swal.fire("Error", "Fallo de red.", "error");
      } finally {
        btnGuardarSlider.disabled = false;
        btnGuardarSlider.innerHTML = `<i class="fas fa-save mr-2"></i> Guardar`;
      }
    });
  }

  // ==========================================
  // 3. EXPOSICIÓN DE FUNCIONES GLOBALES 
  // ==========================================
  window.establecerLogoPrincipalUI = async (id) => {
    try {
      const res = await configApi.activarLogo(id);
      if (res.success) {
        Swal.fire({
          icon: "success",
          title: "Actualizado",
          timer: 1200,
          showConfirmButton: false,
        });
        cargarDatosPrincipales();
        if (window.cargarLogoGlobal) window.cargarLogoGlobal();
      } else Swal.fire("Error", res.mensaje, "error");
    } catch (e) {
      Swal.fire("Error", "Problema al activar.", "error");
    }
  };

  window.eliminarLogoUI = async (id) => {
    const conf = await Swal.fire({
      title: "¿Eliminar logo?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
    });
    if (conf.isConfirmed) {
      try {
        const res = await configApi.eliminarLogo(id);
        if (res.success) cargarDatosPrincipales();
        else Swal.fire("Error", res.mensaje, "error");
      } catch (e) {
        Swal.fire("Error", "Fallo al eliminar.", "error");
      }
    }
  };

  window.abrirModalSliderUI = (id = null) => {
    const form = document.getElementById("formSlider");
    if (form) form.reset();
    archivoSliderPendiente = null;
    document.getElementById("imgPreviewSliderNuevo").style.display = "none";
    document.getElementById("iconPlaceholderSlider").style.display = "block";

    if (id) {
      const slider = configState.getSliderById(id);
      if (slider) {
        document.getElementById("sliderId").value = id;
        document.getElementById("sliderTitulo").value = slider.Titulo || "";
        document.getElementById("sliderDesc").value = slider.Descripcion || "";
        document.getElementById("tituloModalSlider").innerHTML =
          `<i class="fas fa-edit mr-2" style="color: var(--fox-orange);"></i> Editar Slider`;
        if (slider.ImagenURL) {
          document.getElementById("imgPreviewSliderNuevo").src =
            obtenerRutaSegura(slider.ImagenURL);
          document.getElementById("imgPreviewSliderNuevo").style.display =
            "block";
          document.getElementById("iconPlaceholderSlider").style.display =
            "none";
        }
      }
    } else {
      document.getElementById("sliderId").value = "";
      document.getElementById("tituloModalSlider").innerHTML =
        `<i class="fas fa-image mr-2" style="color: var(--fox-orange);"></i> Nuevo Slider`;
    }
    $("#modalSlider").modal("show");
  };

  window.cambiarEstadoSliderUI = async (id, estado) => {
    try {
      const res = await configApi.cambiarEstadoSlider(id, estado);
      if (res.success) cargarDatosPrincipales();
      else Swal.fire("Error", res.mensaje, "error");
    } catch (e) {
      Swal.fire("Error", "Fallo de red.", "error");
    }
  };

  window.eliminarSliderUI = async (id) => {
    const conf = await Swal.fire({
      title: "¿Eliminar banner?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
    });
    if (conf.isConfirmed) {
      try {
        const res = await configApi.eliminarSlider(id);
        if (res.success) cargarDatosPrincipales();
        else Swal.fire("Error", res.mensaje, "error");
      } catch (e) {
        Swal.fire("Error", "Fallo al eliminar.", "error");
      }
    }
  };

  window.abrirModalSlider = window.abrirModalSliderUI;
};

inicializarModulo();
