(() => {
  setTimeout(() => {
    // --- 1. DECLARACIÓN DE COMPONENTES DEL LOGO ---
    const btnSeleccionarLogo = document.getElementById("btnSeleccionarLogo");
    const inputFileLogo = document.getElementById("inputFileLogo");
    const imgPreviewLogo = document.getElementById("imgPreviewLogo");

    console.log("Módulo Configuración Web: Inicializando eventos avanzados...");

    // --- 2. CARGA INICIAL PERSISTENTE (LOGO Y BANNERS) ---
    const cargarConfiguracionActual = async () => {
      try {
        const respuesta = await fetch(
          "http://localhost:3000/api/config-web/publica",
        );
        const datos = await respuesta.json();

        if (datos) {
          if (datos.LogoURL && datos.LogoURL.startsWith("http")) {
            imgPreviewLogo.src = datos.LogoURL;
          }
          for (let i = 1; i <= 3; i++) {
            const urlBanner = datos[`Banner${i}URL`];
            const imgPreview = document.getElementById(`imgPreviewBanner${i}`);
            if (urlBanner && urlBanner.startsWith("http") && imgPreview) {
              imgPreview.src = urlBanner;
            }
          }
          console.log("Configuración visual sincronizada con SQL Server.");
        }
      } catch (error) {
        console.error("Error al recuperar configuraciones de la API:", error);
      }
    };

    cargarConfiguracionActual();

    // --- 3. LÓGICA DE SUBIDA PARA EL LOGOTIPO PRINCIPAL ---
    if (btnSeleccionarLogo && inputFileLogo) {
      btnSeleccionarLogo.addEventListener("click", (e) => {
        e.preventDefault();
        inputFileLogo.click();
      });

      inputFileLogo.addEventListener("change", async (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;

        if (!archivo.type.startsWith("image/")) {
          alert("Por favor, selecciona una imagen válida.");
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          imgPreviewLogo.src = event.target.result;
        };
        reader.readAsDataURL(archivo);

        const formData = new FormData();
        formData.append("logo", archivo);

        try {
          btnSeleccionarLogo.disabled = true;
          btnSeleccionarLogo.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Subiendo...`;

          const res = await fetch("http://localhost:3000/api/config-web/logo", {
            method: "POST",
            body: formData,
          });
          const result = await res.json();

          if (result.success) alert("¡Logotipo actualizado con éxito!");
          else alert("Error: " + result.mensaje);
        } catch (err) {
          console.error(err);
          alert("Error al conectar con el servidor.");
        } finally {
          btnSeleccionarLogo.disabled = false;
          btnSeleccionarLogo.innerHTML = `<i class="fas fa-upload mr-2"></i> SUBIR NUEVO LOGO`;
        }
      });
    }

    // --- 4. BUCLE DINÁMICO PARA LOS 3 BANNERS PROMOCIONALES ---
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

          if (!archivo.type.startsWith("image/")) {
            alert("Por favor, selecciona un formato de imagen válido.");
            return;
          }
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
              {
                method: "POST",
                body: formData,
              },
            );
            const result = await res.json();

            if (result.success) {
              alert(`¡Banner Promocional ${i} cargado de forma persistente!`);
            } else {
              alert("Error en el guardado: " + result.mensaje);
            }
          } catch (error) {
            console.error("Error crítico de red en banner:", error);
            alert("No se pudo establecer conexión para subir el banner.");
          } finally {
            btnSubir.disabled = false;
            btnSubir.innerHTML = `<i class="fas fa-sync-alt mr-1"></i> CAMBIAR`;
          }
        });
      }
    }
  }, 50);
})();