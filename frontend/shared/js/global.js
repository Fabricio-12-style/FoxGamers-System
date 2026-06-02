window.cargarLogoGlobal = async () => {
  try {
    const res = await fetch("http://localhost:3000/api/config-web/publica");
    const config = await res.json();

    // Buscamos el logo activo
    const logoActivo = config.logos
      ? config.logos.find((l) => l.Activo == 1 || l.Activo == true)
      : null;

    if (logoActivo && logoActivo.ImagenURL) {
      let urlLogoFinal = logoActivo.ImagenURL.startsWith("http")
        ? logoActivo.ImagenURL
        : `http://localhost:3000${logoActivo.ImagenURL}`;

      // AÑADIMOS EL TIMESTAMP PARA EVITAR CACHÉ
      const urlConCacheBuster = `${urlLogoFinal}?t=${new Date().getTime()}`;

      const logosEnPantalla = document.querySelectorAll(".logo-global-fox");
      logosEnPantalla.forEach((img) => {
        img.src = urlConCacheBuster;
        img.onerror = () => {
          img.src = "../shared/img/foxGamers.jpeg";
        };
      });
    }
  } catch (error) {
    console.error("Error al cargar logo:", error);
  }
};

// Ejecutar al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  window.cargarLogoGlobal();
});
