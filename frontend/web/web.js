const API_URL = "http://localhost:3000/api/productos";
const API_CONFIG_URL = "http://localhost:3000/api/config-web/publica";
const WHATSAPP_NUMERO = "51961460326";

document.addEventListener("DOMContentLoaded", () => {
  sincronizarConfiguracionWeb();
  cargarCatalogoPublico();
});

// // 1 Flujo A: Sincronizar Identidad y Sliders Adaptables
async function sincronizarConfiguracionWeb() {
  try {
    const respuesta = await fetch(API_CONFIG_URL);
    const datos = await respuesta.json();
    if (!datos) return;
    const webLogoNav = document.getElementById("webLogoNav");
    if (webLogoNav && datos.LogoURL) {
      webLogoNav.src = datos.LogoURL;
    }
    const contenedorBanners = document.getElementById("contenedorBannersWeb");
    const indicadoresBanners = document.getElementById("indicadoresBanners");

    if (contenedorBanners && indicadoresBanners) {
      let htmlBanners = "";
      let htmlIndicadores = "";
      let contadorActivos = 0;

      for (let i = 1; i <= 3; i++) {
        const urlBanner = datos[`Banner${i}URL`];

        if (urlBanner && urlBanner.startsWith("http")) {
          const activeClass = contadorActivos === 0 ? "active" : "";
          htmlBanners += `
                        <div class="carousel-item ${activeClass}">
                            <img src="${urlBanner}" class="d-block w-100 img-fluid" alt="Promo ${i}" style="object-fit: cover; height: auto;">
                        </div>`;

          htmlIndicadores += `
                        <li data-target="#sliderPromociones" data-slide-to="${contadorActivos}" class="${activeClass}"></li>`;

          contadorActivos++;
        }
      }

      if (contadorActivos === 0) {
        htmlBanners = `
                    <div class="carousel-item active">
                        <img src="https://dummyimage.com/1200x400/0f172a/00d2ff&text=CONFIGURA+TUS+BANNERS+AQUÍ" class="d-block w-100 img-fluid" alt="FOX GAMERS">
                    </div>`;
        htmlIndicadores = `<li data-target="#sliderPromociones" data-slide-to="0" class="active"></li>`;
      }

      indicadoresBanners.innerHTML = htmlIndicadores;
      contenedorBanners.innerHTML = htmlBanners;
      $("#sliderPromociones").carousel({
        interval: 3000,
      });
    }
  } catch (error) {
    console.error("Error visual:", error);
  }
}

// // 2 Flujo B: Catálogo de Productos en Tiempo Real
async function cargarCatalogoPublico() {
  const grid = document.getElementById("contenedorGridWeb");
  if (!grid) return;

  try {
    const respuesta = await fetch(API_URL);
    const productos = await respuesta.json();

    const productosActivos = productos.filter(
      (p) => p.Activo === true || p.Activo === 1,
    );

    if (productosActivos.length === 0) {
      grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="text-muted mb-0">Por el momento no hay stock disponible. ¡Regresa pronto!</p>
                </div>`;
      return;
    }

    grid.innerHTML = "";

    productosActivos.forEach((prod) => {
      const tieneStock = prod.StockActual > 0;
      const badgeStock = tieneStock
        ? `<span class="badge badge-success position-absolute m-3" style="top:0; right:0; z-index:2;">DISPONIBLE</span>`
        : `<span class="badge badge-danger position-absolute m-3" style="top:0; right:0; z-index:2;">AGOTADO</span>`;

      const imagenProducto =
        prod.ImagenURL ||
        `https://dummyimage.com/400x400/0f172a/00d2ff&text=${encodeURIComponent(prod.ModeloBase || "FOX")}`;
      const textoMensaje = encodeURIComponent(
        `¡Hola FOX GAMERS! Estoy interesado en el producto: ${prod.Nombre} (Código: ${prod.Codigo}). ¿Tienen disponibilidad en tienda?`,
      );
      const enlaceWhatsApp = `https://wa.me/${WHATSAPP_NUMERO}?text=${textoMensaje}`;

      grid.innerHTML += `
                <div class="col-xl-3 col-lg-4 col-sm-6 mb-4">
                    <div class="card h-100 border-0 shadow-sm position-relative text-white web-card" style="overflow: hidden; transition: transform 0.2s;">
                        ${badgeStock}
                        <div style="height: 220px; background-color: #06090c; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                            <img src="${imagenProducto}" class="card-img-top img-fluid" alt="${prod.Nombre}" style="object-fit: contain; max-height: 100%; max-width: 100%;">
                        </div>
                        <div class="card-body p-3" style="display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <h5 class="card-title font-weight-bold mb-1" style="font-size: 1.05rem; line-height: 1.3;">${prod.Nombre}</h5>
                                <p class="small text-muted mb-3">Cod: ${prod.Codigo}</p>
                            </div>
                            <div class="mt-auto">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <span class="text-muted small font-weight-bold">PRECIO:</span>
                                    <h4 class="font-weight-bold m-0" style="font-size: 1.35rem; color: var(--fox-cyan);">S/ ${prod.PrecioVenta.toFixed(2)}</h4>
                                </div>
                                <a href="${enlaceWhatsApp}" target="_blank" class="btn btn-block btn-fox font-weight-bold py-2 ${tieneStock ? "" : "disabled btn-secondary"}" style="font-size: 0.9rem;">
                                    <i class="fab fa-whatsapp mr-2"></i> ${tieneStock ? "CONSULTAR STOCK" : "SIN STOCK"}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>`;
    });
  } catch (error) {
    console.error("Error catálogo:", error);
    grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle text-warning display-4 mb-3"></i>
                <p class="text-muted">No se pudo sincronizar el catálogo en este momento.</p>
            </div>`;
  }
}
