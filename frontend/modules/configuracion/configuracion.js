(() => {
  setTimeout(() => {
    // --- 1. COMPONENTES DEL LOGO ---
    const btnSeleccionarArchivo = document.getElementById(
      "btnSeleccionarArchivo",
    );
    const btnSubirLogo = document.getElementById("btnSubirLogo");
    const inputFileLogo = document.getElementById("inputFileLogo");
    const imgPreviewLogo = document.getElementById("imgPreviewLogo");
    const iconPlaceholderLogo = document.getElementById("iconPlaceholderLogo");
    const galeriaLogos = document.getElementById("galeriaLogos");

    let archivoLogoPendiente = null;

    console.log("Módulo Configuración Web: Inicializando eventos avanzados...");

    $('a[data-toggle="tab"], button[data-toggle="tab"]').on(
      "shown.bs.tab",
      function (e) {
        $(".nav-link").css({
          "background-color": "transparent",
          color: "#fff",
          "border-bottom": "1px solid #334155",
        });
        $(e.target).css({
          "background-color": "var(--fox-surface)",
          color: "var(--fox-cyan)",
          "border-bottom": "none",
        });
      },
    );

    // --- FUNCIÓN ESCUDO PARA RUTAS DE IMÁGENES A PRUEBA DE BALAS ---
    const obtenerRutaSegura = (url) => {
      if (!url)
        return "https://placehold.co/150x150/0f172a/00f2ff?text=Sin+Imagen";
      if (
        url.startsWith("http") ||
        url.startsWith("data:") ||
        url.startsWith("..")
      )
        return url;
      return `http://localhost:3000${url}`;
    };

    // --- 2. CARGA DE GALERÍA Y BANNERS ---
    const cargarConfiguracion = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/config-web/publica");
        const datos = await res.json();

        if (datos.logos && datos.logos.length > 0) {
          renderizarGaleriaLogos(datos.logos);
        } else {
          if (galeriaLogos)
            galeriaLogos.innerHTML =
              '<div class="col-12 text-center text-muted small py-3">No hay logos guardados.</div>';
        }

        for (let i = 1; i <= 3; i++) {
          const urlBanner = datos[`Banner${i}URL`];
          const imgPreview = document.getElementById(`imgPreviewBanner${i}`);
          if (urlBanner && imgPreview) {
            imgPreview.src = obtenerRutaSegura(urlBanner);
          }
        }
      } catch (error) {
        console.error("Error al recuperar configuraciones:", error);
      }
    };

    function renderizarGaleriaLogos(logos) {
      if (!galeriaLogos) return;
      galeriaLogos.innerHTML = "";

      logos.forEach((logo) => {
        const esActivo = logo.Activo === 1 || logo.Activo === true;
        const borde = esActivo
          ? "border: 2px solid var(--fox-cyan);"
          : "border: 2px solid transparent; opacity: 0.6;";
        const urlSegura = obtenerRutaSegura(logo.ImagenURL);

        const btnAccion = esActivo
          ? `<button class="btn btn-success btn-sm w-100 font-weight-bold" disabled><i class="fas fa-check mr-1"></i> Principal</button>`
          : `<button class="btn btn-secondary btn-sm w-50" onclick="establecerLogoPrincipal(${logo.LogoID})" title="Usar"><i class="fas fa-check"></i></button>
                   <button class="btn btn-danger btn-sm w-50" onclick="eliminarLogo(${logo.LogoID})" title="Eliminar"><i class="fas fa-trash"></i></button>`;

        galeriaLogos.innerHTML += `
                <div class="col-auto mb-3 text-center">
                    <div class="p-2 mb-2 rounded shadow-sm" style="${borde} background-color: #fff; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; transition: 0.3s;">
                        <img src="${urlSegura}" onerror="this.src='https://placehold.co/100x100/1e293b/00f2ff?text=Error'" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                    </div>
                    <div class="btn-group w-100 shadow-sm" style="border-radius: 6px; overflow: hidden;">
                        ${btnAccion}
                    </div>
                </div>
            `;
      });
    }

    cargarConfiguracion();

    // --- 3. LÓGICA DE SUBIDA DE LOGO NUEVO ---
    if (btnSeleccionarArchivo && inputFileLogo && btnSubirLogo) {
      btnSeleccionarArchivo.addEventListener("click", () =>
        inputFileLogo.click(),
      );

      inputFileLogo.addEventListener("change", (e) => {
        archivoLogoPendiente = e.target.files[0];
        if (!archivoLogoPendiente) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          imgPreviewLogo.src = event.target.result;
          imgPreviewLogo.style.display = "block";
          if (iconPlaceholderLogo) iconPlaceholderLogo.style.display = "none";
        };
        reader.readAsDataURL(archivoLogoPendiente);
      });

      btnSubirLogo.addEventListener("click", async () => {
        if (!archivoLogoPendiente) {
          Swal.fire(
            "Atención",
            "Primero debes seleccionar una imagen.",
            "warning",
          );
          return;
        }

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

    // --- 4. LÓGICA DE BANNERS DINÁMICOS ---
    for (let i = 1; i <= 3; i++) {
      const btnSubir = document.getElementById(`btnSubirBanner${i}`);
      const inputFile = document.getElementById(`inputFileBanner${i}`);
      const imgPreview = document.getElementById(`imgPreviewBanner${i}`);

      if (btnSubir && inputFile && imgPreview) {
        btnSubir.addEventListener("click", (e) => {
          e.preventDefault();
          inputFile.click();
        });

        inputFile.addEventListener("change", async (e) => {
          const archivo = e.target.files[0];
          if (!archivo) return;

          const reader = new FileReader();
          reader.onload = (event) => {
            imgPreview.src = event.target.result;
          };
          reader.readAsDataURL(archivo);

          const formData = new FormData();
          formData.append("banner", archivo);

          try {
            btnSubir.disabled = true;
            btnSubir.innerHTML = `<i class="fas fa-sync-alt fa-spin"></i>`;

            const res = await fetch(
              `http://localhost:3000/api/config-web/banner/${i}`,
              { method: "POST", body: formData },
            );
            const result = await res.json();

            if (result.success) {
              Swal.fire({
                icon: "success",
                title: "Actualizado",
                text: `Banner ${i} subido correctamente.`,
                timer: 1500,
                showConfirmButton: false,
              });
            } else {
              Swal.fire("Error", result.mensaje, "error");
            }
          } catch (error) {
            Swal.fire("Error", "No se pudo conectar con el servidor.", "error");
          } finally {
            btnSubir.disabled = false;
            btnSubir.innerHTML = `<i class="fas fa-sync-alt mr-1"></i> CAMBIAR`;
          }
        });
      }
    }

    // --- 5. FUNCIONES GLOBALES PARA LA GALERÍA (CONECTADAS AL BACKEND) ---

    window.establecerLogoPrincipal = async (id) => {
      try {
        const res = await fetch(
          `http://localhost:3000/api/config-web/logo/activo/${id}`,
          {
            method: "PUT",
          },
        );
        const result = await res.json();

        if (result.success) {
          Swal.fire({
            icon: "success",
            title: "Logo Actualizado",
            text: "Este logo ahora es el principal del sistema.",
            timer: 1500,
            showConfirmButton: false,
          });
          cargarConfiguracion();
          if (typeof window.cargarLogoGlobal === "function") {
            window.cargarLogoGlobal(); 
          }
        } else {
          Swal.fire("Error", result.mensaje, "error");
        }
      } catch (error) {
        console.error(error);
        Swal.fire("Error", "Problema al intentar activar el logo.", "error");
      }
    };

    // Eliminar un logo de la galería
    window.eliminarLogo = async (id) => {
      const conf = await Swal.fire({
        title: "¿Eliminar este logo?",
        text: "Se borrará físicamente del servidor.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      });

      if (conf.isConfirmed) {
        try {
          const res = await fetch(
            `http://localhost:3000/api/config-web/logo/${id}`,
            {
              method: "DELETE",
            },
          );
          const result = await res.json();

          if (result.success) {
            Swal.fire({
              icon: "success",
              title: "Eliminado",
              text: "El logo fue borrado con éxito.",
              timer: 1500,
              showConfirmButton: false,
            });
            cargarConfiguracion();
          } else {
            Swal.fire("Operación Bloqueada", result.mensaje, "error");
          }
        } catch (error) {
          console.error(error);
          Swal.fire("Error", "Problema al intentar eliminar el logo.", "error");
        }
      }
    };
  }, 50);
})();
