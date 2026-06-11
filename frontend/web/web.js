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

  // 1. SINCRONIZACIÓN DE VITRINA Y LOGO DINÁMICO
  
  async function sincronizarConfiguracionWeb() {
    try {
      const res = await fetch(API_CONFIG_URL);
      const datos = await res.json();
      if (!datos) return;

      const webLogoNav = document.getElementById("webLogoNav");
      if (webLogoNav) {
        const logoActivo = datos.logos
          ? datos.logos.find((l) => l.Activo == 1 || l.Activo === true)
          : null;
        if (logoActivo) webLogoNav.src = getUrl(logoActivo.ImagenURL);
      }

      const contenedorBanners = document.getElementById("contenedorBannersWeb");
      const indicadoresBanners = document.getElementById("indicadoresBanners");

      if (contenedorBanners && indicadoresBanners) {
        const slidersActivos = datos.sliders
          ? datos.sliders.filter(
              (s) => s.ImagenURL && (s.Activo === 1 || s.Activo === true),
            )
          : [];

        if (slidersActivos.length > 0) {
          let htmlBanners = "";
          let htmlIndicadores = "";

          slidersActivos.forEach((slider, index) => {
            const activeClass = index === 0 ? "active" : "";

            htmlBanners += `
              <div class="carousel-item ${activeClass}">
                <img src="${getUrl(slider.ImagenURL)}" class="d-block w-100 img-fluid" alt="Promoción Fox Gamers" style="object-fit: cover; max-height: 500px;">
              </div>`;

            htmlIndicadores += `
              <li data-target="#sliderPromociones" data-slide-to="${index}" class="${activeClass}"></li>`;
          });

          contenedorBanners.innerHTML = htmlBanners;
          indicadoresBanners.innerHTML = htmlIndicadores;
        } else {
          contenedorBanners.innerHTML = `
            <div class="carousel-item active text-center py-5" style="background-color: var(--fox-surface);">
              <i class="fas fa-gamepad fa-3x mb-3" style="color: var(--fox-cyan);"></i>
              <p class="font-weight-bold" style="color: var(--fox-text-light); font-size: 1.2rem;">¡Próximamente nuevas promociones exclusivas!</p>
            </div>`;
          indicadoresBanners.innerHTML = "";
        }
      }
    } catch (e) {
      console.error(
        "Error al sincronizar la configuración pública de la web:",
        e,
      );
    }
  }

  
  // 2. CARGA DEL CATÁLOGO PÚBLICO EN TIEMPO REAL

  async function cargarCatalogoPublico() {
    const grid = document.getElementById("contenedorGridWeb");
    if (!grid) return;

    try {
      const [resProductos, resDescuentos] = await Promise.all([
        fetch(API_URL),
        fetch("http://localhost:3000/api/descuentos/vigentes"),
      ]);
      const productos = await resProductos.json();
      const descuentos = await resDescuentos.json();
      const productosActivos = productos.filter(
        (p) => p.Activo === true || p.Activo === 1,
      );

      const buscarDescuento = (productoID, categoriaID) => {
        const porProducto = descuentos.find(
          (d) => d.AplicaA === "PRODUCTO" && d.ReferenciaID === productoID,
        );
        if (porProducto) return porProducto;
        const porCategoria = descuentos.find(
          (d) => d.AplicaA === "CATEGORIA" && d.ReferenciaID === categoriaID,
        );
        if (porCategoria) return porCategoria;
        const general = descuentos.find((d) => d.AplicaA === "GENERAL");
        if (general) return general;
        return null;
      };

      grid.innerHTML = productosActivos
        .map((prod) => {
          const tieneStock = prod.StockActual > 0;
          const img =
            getUrl(prod.ImagenURL) || "../shared/img/producto-placeholder.png";
          const wapp = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(`¡Hola! Me interesa: ${prod.Nombre}`)}`;

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
                            ${(() => {
                              const dsc = buscarDescuento(
                                prod.ProductoID,
                                prod.CategoriaID,
                              );
                              if (!dsc)
                                return `
                              <div class="d-flex justify-content-between align-items-center mb-3">
                                <span class="text-uppercase small font-weight-bold" style="color:var(--fox-text-gray)">Precio:</span>
                                <span class="price-tag">S/ ${prod.PrecioVenta.toFixed(2)}</span>
                              </div>`;

                              const montoDesc =
                                dsc.TipoDescuento === "PORCENTAJE"
                                  ? prod.PrecioVenta * (dsc.Valor / 100)
                                  : Math.min(dsc.Valor, prod.PrecioVenta);
                              const precioFinal = (
                                prod.PrecioVenta - montoDesc
                              ).toFixed(2);
                              const badgeDesc =
                                dsc.TipoDescuento === "PORCENTAJE"
                                  ? `-${dsc.Valor}%`
                                  : `-S/ ${dsc.Valor}`;

                              return `
                              <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center">
                                  <span class="text-uppercase small font-weight-bold" style="color:var(--fox-text-gray)">Precio:</span>
                                  <div class="text-right">
                                    <span style="text-decoration:line-through;color:#64748b;font-size:13px;">S/ ${prod.PrecioVenta.toFixed(2)}</span>
                                    <span class="badge ml-1" style="background:#ff6a00;color:#fff;font-size:11px;">${badgeDesc}</span>
                                    <br>
                                    <span class="price-tag" style="color:var(--fox-green);">S/ ${precioFinal}</span>
                                  </div>
                                </div>
                                <div class="mt-1 text-right">
                                  <span class="badge" style="background:#d1fae5;color:#065f46;font-size:10px;">
                                    <i class="fas fa-tag mr-1"></i>${dsc.Nombre || "Descuento"}
                                  </span>
                                </div>
                              </div>`;
                            })()}
                            <a href="${tieneStock ? wapp : "#"}" target="_blank" 
                               class="btn btn-fox btn-block font-weight-bold py-2 ${tieneStock ? "" : "btn-secondary"}" 
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
      console.error("Error al cargar el catálogo público de productos:", e);
    }
  }
})();