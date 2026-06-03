(() => {
  const API_URL = "http://localhost:3000/api/productos";
  const API_CONFIG_URL = "http://localhost:3000/api/config-web/publica";
  const WHATSAPP_NUMERO = "51961460326";
  const BASE_URL = "http://localhost:3000";

  const getUrl = (path) =>
    !path ? null : path.startsWith("http") ? path : `${BASE_URL}${path}`;

  document.addEventListener("DOMContentLoaded", () => {
    sincronizarConfiguracionWeb();
    cargarCatalogoPublico();
  });

  async function sincronizarConfiguracionWeb() {
    try {
      const res = await fetch(API_CONFIG_URL);
      const datos = await res.json();
      if (!datos) return;

      const webLogoNav = document.getElementById("webLogoNav");
      if (webLogoNav) {
        const logoActivo = datos.logos
          ? datos.logos.find((l) => l.Activo == 1)
          : null;
        if (logoActivo) webLogoNav.src = getUrl(logoActivo.ImagenURL);
      }

      const contenedorBanners = document.getElementById("contenedorBannersWeb");
      const indicadoresBanners = document.getElementById("indicadoresBanners");

      if (contenedorBanners && indicadoresBanners) {
        let htmlBanners = "",
          htmlIndicadores = "",
          contadorActivos = 0;
        for (let i = 1; i <= 3; i++) {
          const urlBanner = datos[`Banner${i}URL`];
          if (urlBanner) {
            const activeClass = contadorActivos === 0 ? "active" : "";
            htmlBanners += `<div class="carousel-item ${activeClass}"><img src="${getUrl(urlBanner)}" class="d-block w-100 img-fluid"></div>`;
            htmlIndicadores += `<li data-target="#sliderPromociones" data-slide-to="${contadorActivos}" class="${activeClass}"></li>`;
            contadorActivos++;
          }
        }
        if (contadorActivos > 0) {
          contenedorBanners.innerHTML = htmlBanners;
          indicadoresBanners.innerHTML = htmlIndicadores;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function cargarCatalogoPublico() {
    const grid = document.getElementById("contenedorGridWeb");
    if (!grid) return;

    try {
      const res = await fetch(API_URL);
      const productos = await res.json();
      const productosActivos = productos.filter(
        (p) => p.Activo === true || p.Activo === 1,
      );

      grid.innerHTML = productosActivos
        .map((prod) => {
          const tieneStock = prod.StockActual > 0;
          const img =
            getUrl(prod.ImagenURL) || "../shared/img/producto-placeholder.png";
          const wapp = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(`¡Hola! Me interesa: ${prod.Nombre}`)}`;
          // Dentro de tu .map() en web.js
          return `
<div class="col-xl-3 col-lg-4 col-sm-6 mb-4">
    <div class="card h-100 shadow-sm web-card">
        <div class="position-relative">
            <span class="badge ${tieneStock ? "badge-stock" : "badge-soldout"} position-absolute m-3" style="z-index:2;">
                ${tieneStock ? "DISPONIBLE" : "AGOTADO"}
            </span>
            <div class="img-container">
                <img src="${img}" class="card-img-top img-fluid" alt="${prod.Nombre}" style="max-height:100%; object-fit:contain;">
            </div>
        </div>
        <div class="card-body d-flex flex-column">
            <h5 class="card-title">${prod.Nombre}</h5>
            <p class="small text-muted font-weight-bold mb-3">SKU: ${prod.Codigo}</p>
            <div class="mt-auto">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="text-uppercase small font-weight-bold" style="color:var(--fox-text-gray)">Precio:</span>
                    <span class="price-tag">S/ ${prod.PrecioVenta.toFixed(2)}</span>
                </div>
                <a href="${tieneStock ? wapp : "#"}" target="_blank" 
                   class="btn btn-block font-weight-bold py-2 ${tieneStock ? "btn-fox" : "btn-secondary"}" 
                   style="border-radius: 8px;">
                    <i class="fab fa-whatsapp mr-2"></i> ${tieneStock ? "CONSULTAR AHORA" : "AGOTADO"}
                </a>
            </div>
        </div>
    </div>
</div>`;
        })
        .join("");
    } catch (e) {
      console.error(e);
    }
  }
})();
