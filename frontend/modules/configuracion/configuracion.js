(() => {
  setTimeout(() => {
    let listaLogosGlobal = [];
    let listaSlidersGlobal = [];

    const extensionesPermitidas = /(\.jpg|\.jpeg|\.png)$/i;

    // --- 1. COMPONENTES DEL LOGO ---
    const btnSeleccionarArchivo = document.getElementById(
      "btnSeleccionarArchivo",
    );
    const btnSubirLogo = document.getElementById("btnSubirLogo");
    const inputFileLogo = document.getElementById("inputFileLogo");
    const imgPreviewLogo = document.getElementById("imgPreviewLogo");
    const iconPlaceholderLogo = document.getElementById("iconPlaceholderLogo");
    const galeriaLogos = document.getElementById("galeriaLogos");

    // --- 2. COMPONENTES DE SLIDERS ---
    const btnSeleccionarSlider = document.getElementById(
      "btnSeleccionarSlider",
    );
    const btnSubirSlider = document.getElementById("btnSubirSlider");
    const inputFileSlider = document.getElementById("inputFileSlider");
    const imgPreviewSliderNuevo = document.getElementById(
      "imgPreviewSliderNuevo",
    );
    const iconPlaceholderSlider = document.getElementById(
      "iconPlaceholderSlider",
    );
    const galeriaSliders = document.getElementById("galeriaSliders");

    let archivoLogoPendiente = null;
    let archivoSliderPendiente = null;
    let slotSliderSeleccionado = "1";

    console.log(
      "Módulo Configuración Web: Inicializando eventos dinámicos unificados...",
    );

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

    const obtenerRutaSegura = (url, idDefault = "1") => {
      if (!url)
        return `https://placehold.co/1200x400/f8fafc/1e293b?text=Banner+Vacio+${idDefault}`;
      if (
        url.startsWith("http") ||
        url.startsWith("data:") ||
        url.startsWith("..")
      )
        return url;
      return `http://localhost:3000${url}`;
    };

    // --- 3. CARGA DE CONFIGURACIÓN MAESTRA ---
    const cargarConfiguracion = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/config-web/publica");
        const datos = await res.json();

        if (datos.logos && datos.logos.length > 0) {
          listaLogosGlobal = datos.logos;
          renderizarGaleriaLogos(listaLogosGlobal);
        } else {
          listaLogosGlobal = [];
          if (galeriaLogos) {
            galeriaLogos.innerHTML =
              '<div class="col-12 text-center py-3 font-weight-bold text-muted">No hay logos guardados.</div>';
          }
        }

        if (datos.sliders) {
          listaSlidersGlobal = datos.sliders;
          renderizarGaleriaSliders(listaSlidersGlobal);
        } else {
          listaSlidersGlobal = [];
          if (galeriaSliders) {
            galeriaSliders.innerHTML =
              '<div class="col-12 text-center py-3 font-weight-bold text-muted">No hay sliders guardados.</div>';
          }
        }
      } catch (error) {
        console.error("Error al recuperar configuraciones:", error);
      }
    };

    // --- 4. RENDERIZADO DE LOGOS ---

    function renderizarGaleriaLogos(logos) {
      if (!galeriaLogos) return;
      galeriaLogos.innerHTML = "";

      logos.forEach((logo) => {
        const esActivo = logo.Activo === 1 || logo.Activo === true;
        const borde = esActivo
          ? "border: 3px solid var(--fox-cyan);"
          : "border: 1px solid #cbd5e1; opacity: 0.7;";
        const urlSegura = obtenerRutaSegura(logo.ImagenURL);

        const btnAccion = esActivo
          ? `<button class="btn btn-fox-success btn-sm w-100 font-weight-bold" disabled><i class="fas fa-check mr-1"></i> Principal</button>`
          : `<button class="btn btn-secondary btn-sm w-50 font-weight-bold" onclick="establecerLogoPrincipal(${logo.LogoID})" title="Usar"><i class="fas fa-check"></i></button>
             <button class="btn btn-fox-danger btn-sm w-50 font-weight-bold" onclick="eliminarLogo(${logo.LogoID})" title="Eliminar"><i class="fas fa-trash"></i></button>`;

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
    }

    // --- 5. RENDERIZADO DE SLIDERS ---

    function renderizarGaleriaSliders(sliders) {
      if (!galeriaSliders) return;
      galeriaSliders.innerHTML = "";

      sliders.forEach((slider) => {
        const tieneImagen =
          slider.ImagenURL !== null && slider.ImagenURL !== "";
        const esActivo = slider.Activo === 1 || slider.Activo === true;
        const urlSegura = obtenerRutaSegura(slider.ImagenURL, slider.id);

        let borde =
          esActivo && tieneImagen
            ? "border: 3px solid var(--fox-cyan);"
            : "border: 1px solid #cbd5e1; opacity: 0.6;";

        const btnToggleStyle =
          esActivo && tieneImagen ? "btn-fox-success" : "btn-secondary";
        const iconToggle = esActivo && tieneImagen ? "fa-eye" : "fa-eye-slash";
        const disabledToggle = !tieneImagen ? "disabled" : "";

        galeriaSliders.innerHTML += `
            <div class="col-12 mb-4">
                <div class="p-2 mb-2 rounded shadow-sm bg-white" style="${borde} height: 120px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    <img src="${urlSegura}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="font-weight-bold text-muted small">SLOT DE BANNER ${slider.id}</span>
                    <div class="btn-group shadow-sm" style="border-radius: 6px; overflow: hidden; width: 250px;">
                        <button class="btn btn-fox btn-sm font-weight-bold" onclick="prepararSubidaSlider('${slider.id}')">
                            <i class="fas fa-edit"></i> Cargar
                        </button>
                        <button class="btn ${btnToggleStyle} btn-sm font-weight-bold" ${disabledToggle} onclick="cambiarEstadoSlider(${slider.id}, ${esActivo ? 0 : 1})">
                            <i class="fas ${iconToggle}"></i> ${esActivo && tieneImagen ? "Activo" : "Inactivo"}
                        </button>
                        <button class="btn btn-fox-danger btn-sm font-weight-bold" ${!tieneImagen ? "disabled" : ""} onclick="eliminarSlider(${slider.id})">
                            <i class="fas fa-trash"></i> Vaciar
                        </button>
                    </div>
                </div>
                <hr class="my-3">
            </div>`;
      });
    }

    cargarConfiguracion();

    // --- 6. EVENTOS DE CONTROL: SUBIR LOGO ---

    if (btnSeleccionarArchivo && inputFileLogo && btnSubirLogo) {
      btnSeleccionarArchivo.addEventListener("click", () =>
        inputFileLogo.click(),
      );

      inputFileLogo.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // VALIDACIÓN: Rebotar TXT u otros formatos en Logos
        if (!extensionesPermitidas.exec(file.name)) {
          Swal.fire(
            "Formato Inválido",
            "Error: El sistema solo admite archivos de imagen reales (JPG o PNG).",
            "error",
          );
          e.target.value = "";
          return;
        }

        archivoLogoPendiente = file;
        const reader = new FileReader();
        reader.onload = (event) => {
          imgPreviewLogo.src = event.target.result;
        };
        reader.readAsDataURL(file);

        imgPreviewLogo.style.display = "block";
        if (iconPlaceholderLogo) iconPlaceholderLogo.style.display = "none";
      });

      btnSubirLogo.addEventListener("click", async () => {
        if (!archivoLogoPendiente)
          return Swal.fire(
            "Atención",
            "Primero debes seleccionar un archivo de imagen.",
            "warning",
          );

        const formData = new FormData();
        formData.append("logo", archivoLogoPendiente);

        try {
          btnSubirLogo.disabled = true;
          btnSubirLogo.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Guardando...`;

          const res = await fetch("http://localhost:3000/api/config-web/logo", {
            method: "POST",
            body: formData,
          });
          const result = await res.json();

          if (result.success) {
            Swal.fire({
              icon: "success",
              title: "¡Éxito!",
              text: "Logo agregado a la galería.",
              timer: 1500,
              showConfirmButton: false,
            });
            archivoLogoPendiente = null;
            imgPreviewLogo.style.display = "none";
            if (iconPlaceholderLogo)
              iconPlaceholderLogo.style.display = "block";
            cargarConfiguracion();
          } else {
            Swal.fire("Error", result.mensaje, "error");
          }
        } catch (err) {
          Swal.fire("Error", "Fallo de conexión", "error");
        } finally {
          btnSubirLogo.disabled = false;
          btnSubirLogo.innerHTML = `<i class="fas fa-save mr-2"></i> Guardar Logo`;
        }
      });
    }

    // --- 7. EVENTOS DE CONTROL: SUBIR SLIDERS ---

    if (btnSeleccionarSlider && inputFileSlider) {
      btnSeleccionarSlider.addEventListener("click", () =>
        inputFileSlider.click(),
      );
    }

    window.prepararSubidaSlider = (id) => {
      slotSliderSeleccionado = id;
      if (inputFileSlider) inputFileSlider.click();
    };

    if (inputFileSlider) {
      inputFileSlider.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!extensionesPermitidas.exec(file.name)) {
          Swal.fire(
            "Formato Inválido",
            "Error: El carrusel publicitario solo acepta archivos de imagen (JPG o PNG).",
            "error",
          );
          e.target.value = "";
          return;
        }

        archivoSliderPendiente = file;
        const reader = new FileReader();
        reader.onload = (event) => {
          imgPreviewSliderNuevo.src = event.target.result;
        };
        reader.readAsDataURL(file);

        imgPreviewSliderNuevo.style.display = "block";
        if (iconPlaceholderSlider) iconPlaceholderSlider.style.display = "none";

        Swal.fire(
          "Listo para cargar",
          `La imagen se impactará en el **Slot de Banner ${slotSliderSeleccionado}**.`,
          "info",
        );
      });
    }

    if (btnSubirSlider) {
      btnSubirSlider.addEventListener("click", async () => {
        if (!archivoSliderPendiente)
          return Swal.fire(
            "Atención",
            "Selecciona una imagen usando los botones 'Cargar' de los slots.",
            "warning",
          );

        const formData = new FormData();
        formData.append("slider", archivoSliderPendiente);
        formData.append("idBanner", slotSliderSeleccionado);

        try {
          btnSubirSlider.disabled = true;
          btnSubirSlider.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Guardando...`;

          const res = await fetch(
            "http://localhost:3000/api/config-web/slider",
            { method: "POST", body: formData },
          );
          const result = await res.json();

          if (result.success) {
            Swal.fire({
              icon: "success",
              title: "¡Éxito!",
              text: "Vitrina publicitaria actualizada.",
              timer: 1500,
              showConfirmButton: false,
            });
            archivoSliderPendiente = null;
            imgPreviewSliderNuevo.style.display = "none";
            if (iconPlaceholderSlider)
              iconPlaceholderSlider.style.display = "block";
            cargarConfiguracion();
          } else {
            Swal.fire("Error", result.mensaje, "error");
          }
        } catch (err) {
          Swal.fire("Error", "Fallo de red.", "error");
        } finally {
          btnSubirSlider.disabled = false;
          btnSubirSlider.innerHTML = `<i class="fas fa-cloud-upload-alt mr-2"></i> Cargar a la Vitrina`;
        }
      });
    }

    // --- 8. ACCIONES GLOBALES DE LOGOS ---
    window.establecerLogoPrincipal = async (id) => {
      try {
        const res = await fetch(
          `http://localhost:3000/api/config-web/logo/activo/${id}`,
          { method: "PUT" },
        );
        const result = await res.json();
        if (result.success) {
          Swal.fire({
            icon: "success",
            title: "Logo Actualizado",
            text: "Este logo ahora es el principal.",
            timer: 1200,
            showConfirmButton: false,
          });
          cargarConfiguracion();
          if (typeof window.cargarLogoGlobal === "function")
            window.cargarLogoGlobal();
        } else {
          Swal.fire("Error", result.mensaje, "error");
        }
      } catch (e) {
        Swal.fire("Error", "Problema al activar logo.", "error");
      }
    };

    window.eliminarLogo = async (id) => {
      const logo = listaLogosGlobal.find((l) => l.LogoID === id);
      if (logo && logo.Activo)
        return Swal.fire(
          "Denegado",
          "No puedes eliminar el logo principal en uso.",
          "error",
        );

      const conf = await Swal.fire({
        title: "¿Eliminar logo?",
        text: "Se borrará físicamente del servidor.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, borrar",
      });
      if (conf.isConfirmed) {
        try {
          const res = await fetch(
            `http://localhost:3000/api/config-web/logo/${id}`,
            { method: "DELETE" },
          );
          if ((await res.json()).success) cargarConfiguracion();
        } catch (e) {
          Swal.fire("Error", "Fallo al eliminar logo.", "error");
        }
      }
    };

    // --- 9. ACCIONES GLOBALES DE SLIDERS ---
    window.cambiarEstadoSlider = async (id, nuevoEstado) => {
      const activos = listaSlidersGlobal.filter(
        (s) => s.ImagenURL && s.Activo,
      ).length;
      const target = listaSlidersGlobal.find((s) => s.id === id);

      if (nuevoEstado === 0 && activos <= 1 && target.Activo) {
        Swal.fire(
          "Operación Bloqueada",
          "No puedes apagar este slider. La Landing Page requiere mantener al menos un banner activo.",
          "error",
        );
        return;
      }

      try {
        const res = await fetch(
          `http://localhost:3000/api/config-web/slider/estado/${id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: nuevoEstado }),
          },
        );
        if ((await res.json()).success) cargarConfiguracion();
      } catch (e) {
        Swal.fire("Error", "No se pudo cambiar el estado.", "error");
      }
    };

    window.eliminarSlider = async (id) => {
      const target = listaSlidersGlobal.find((s) => s.id === id);
      const activos = listaSlidersGlobal.filter(
        (s) => s.ImagenURL && s.Activo,
      ).length;

      if (target.Activo && activos <= 1) {
        Swal.fire(
          "Operación Bloqueada",
          "No puedes vaciar la única campaña publicitaria visible y activa de la tienda.",
          "error",
        );
        return;
      }

      const conf = await Swal.fire({
        title: "¿Vaciar este banner?",
        text: "Se limpiará el slot y se borrará el archivo físico.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
      });
      if (conf.isConfirmed) {
        try {
          const res = await fetch(
            `http://localhost:3000/api/config-web/slider/${id}`,
            { method: "DELETE" },
          );
          if ((await res.json()).success) cargarConfiguracion();
        } catch (e) {
          Swal.fire("Error", "Fallo al vaciar el slot.", "error");
        }
      }
    };
  }, 50);
})();
