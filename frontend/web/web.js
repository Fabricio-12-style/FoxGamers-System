const API_URL = "http://localhost:3000/api/productos";
const API_CONFIG_URL = "http://localhost:3000/api/config-web/publica";
const WHATSAPP_NUMERO = "51961460326";
const BASE_URL = "http://localhost:3000"; // Tu servidor backend

// Función auxiliar para construir rutas completas
const getUrl = (path) => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${BASE_URL}${path}`;
};

document.addEventListener("DOMContentLoaded", () => {
  sincronizarConfiguracionWeb();
  cargarCatalogoPublico();
});

// 1. Sincronizar Identidad y Sliders
async function sincronizarConfiguracionWeb() {
  try {
    const respuesta = await fetch(API_CONFIG_URL);
    const datos = await respuesta.json();
    if (!datos) return;

    // Logo: Buscamos el logo activo en el array que devuelve tu API
    const webLogoNav = document.getElementById("webLogoNav");
    if (webLogoNav) {
      const logoActivo = datos.logos
        ? datos.logos.find((l) => l.Activo == 1)
        : null;
      if (logoActivo) {
        webLogoNav.src = getUrl(logoActivo.ImagenURL);
      }
    }

    // Banners
    const contenedorBanners = document.getElementById("contenedorBannersWeb");
    const indicadoresBanners = document.getElementById("indicadoresBanners");

    if (contenedorBanners && indicadoresBanners) {
      let htmlBanners = "";
      let htmlIndicadores = "";
      let contadorActivos = 0;
      for (let i = 1; i <= 3; i++) {
        const urlBanner = datos[`Banner${i}URL`];
        if (urlBanner) {
          const activeClass = contadorActivos === 0 ? "active" : "";
          htmlBanners += `
            <div class="carousel-item ${activeClass}">
                <img src="${getUrl(urlBanner)}" class="d-block w-100 img-fluid" alt="Promo ${i}">
            </div>`;

          htmlIndicadores += `
            <li data-target="#sliderPromociones" data-slide-to="${contadorActivos}" class="${activeClass}"></li>`;
          contadorActivos++;
        }
      }
      if (contadorActivos > 0) {
        contenedorBanners.innerHTML = htmlBanners;
        indicadoresBanners.innerHTML = htmlIndicadores;
        $("#sliderPromociones").carousel({ interval: 3000 });
      }
    }
  } catch (error) {
    console.error("Error al sincronizar configuración:", error);
  }
}

// 2. Catálogo de Productos
async function cargarCatalogoPublico() {
  const grid = document.getElementById("contenedorGridWeb");
  if (!grid) return;

  try {
    const respuesta = await fetch(API_URL);
    const productos = await respuesta.json();
    const productosActivos = productos.filter(
      (p) => p.Activo === true || p.Activo === 1,
    );

    grid.innerHTML = productosActivos
      .map((prod) => {
        const tieneStock = prod.StockActual > 0;
        // APLICAMOS EL GETURL PARA QUE LAS IMÁGENES SALGAN DEL PUERTO 3000
        const imagenProducto =
          getUrl(prod.ImagenURL) ||
          `https://dummyimage.com/400x400/0f172a/00d2ff&text=${encodeURIComponent(prod.Nombre)}`;
        const enlaceWhatsApp = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(`¡Hola! Me interesa: ${prod.Nombre}`)}`;

        return `
                <div class="col-xl-3 col-lg-4 col-sm-6 mb-4">
                    <div class="card h-100 border-0 shadow-sm position-relative text-white web-card">
                        <span class="badge ${tieneStock ? "badge-success" : "badge-danger"} position-absolute m-3" style="top:0; right:0; z-index:2;">${tieneStock ? "DISPONIBLE" : "AGOTADO"}</span>
                        <div style="height: 220px; background-color: #06090c; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                            <img src="${imagenProducto}" class="card-img-top img-fluid" alt="${prod.Nombre}" 
                                 style="object-fit: contain; max-height: 100%; max-width: 100%;"
                                 onerror="this.src='../shared/img/producto-placeholder.png'">
                        </div>
                        <div class="card-body p-3 d-flex flex-column">
                            <h5 class="card-title font-weight-bold mb-1">${prod.Nombre}</h5>
                            <p class="small text-muted mb-3">Cod: ${prod.Codigo}</p>
                            <div class="mt-auto">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <span class="text-muted small font-weight-bold">PRECIO:</span>
                                    <h4 class="font-weight-bold m-0" style="color: var(--fox-cyan);">S/ ${prod.PrecioVenta.toFixed(2)}</h4>
                                </div>
                                <a href="${enlaceWhatsApp}" target="_blank" class="btn btn-block btn-fox font-weight-bold py-2 ${tieneStock ? "" : "disabled btn-secondary"}">
                                    <i class="fab fa-whatsapp mr-2"></i> ${tieneStock ? "CONSULTAR STOCK" : "SIN STOCK"}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>`;
      })
      .join("");
  } catch (error) {
    console.error("Error catálogo:", error);
  }
}
