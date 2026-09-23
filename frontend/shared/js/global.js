const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

window.cargarLogoGlobal = async () => {
  try {
    const res = await fetch(`${API_URL}/api/config-web/publica`);
    const config = await res.json();

    const logoActivo = config.logos
      ? config.logos.find((l) => l.Activo == 1 || l.Activo == true)
      : null;

    if (logoActivo && logoActivo.ImagenURL) {
      let urlLogoFinal = logoActivo.ImagenURL.startsWith("http")
        ? logoActivo.ImagenURL
        : `${API_URL}${logoActivo.ImagenURL}`;

      const urlConCacheBuster = `${urlLogoFinal}?t=${new Date().getTime()}`;

      const logosEnPantalla = document.querySelectorAll(".logo-global-fox");
      logosEnPantalla.forEach((img) => {
        img.src = urlConCacheBuster;
        img.onerror = () => {
          img.src = "/img/foxGamers.jpeg";
        };
      });
    }
  } catch (error) {
    console.error("Error al cargar logo:", error);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.cargarLogoGlobal();
});
