(function () {
  const BASE_URL = "http://localhost:3000";
  const API_URL = `${BASE_URL}/api/productos/publicos`;
  const API_CONFIG_URL = `${BASE_URL}/api/config-web/publica`;
  const WHATSAPP_NUMERO = "51961460326";

  let cacheProductos = [];
  let cacheDescuentos = [];
  let categoriaActiva = "TODOS";
  let textoBusqueda = "";
  let ocultarAgotados = false;

  const getUrl = (path) =>
    !path ? null : path.startsWith("http") ? path : `${BASE_URL}${path}`;

  document.addEventListener("DOMContentLoaded", () => {
    sincronizarConfiguracionWeb();
    cargarCatalogoPublico();
    configurarBuscador();
  });

  async function sincronizarConfiguracionWeb() {
    try {
      const res = await fetch(API_CONFIG_URL);
      const datos = await res.json();
      if (!datos) return;

      const logoActivo = datos.logos
        ? datos.logos.find((l) => l.Activo == 1 || l.Activo === true)
        : null;

      if (logoActivo) {
        const urlImagenReal = getUrl(logoActivo.ImagenURL);

        const webLogoNav = document.getElementById("webLogoNav");
        if (webLogoNav) webLogoNav.src = urlImagenReal;

        const webFavicon = document.getElementById("webFavicon");
        if (webFavicon) {
          webFavicon.href = urlImagenReal;
        }
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
                <img src="${getUrl(slider.ImagenURL)}" class="d-block w-100 img-fluid" alt="Promoción" style="object-fit: cover; max-height: 450px;">
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
      console.error("Error al sincronizar la configuración pública:", e);
    }
  }

  async function cargarCatalogoPublico() {
    const contenedorGrid = document.getElementById("contenedorGridWeb");

    try {
      contenedorGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-info" role="status" style="width: 3rem; height: 3rem;"></div>
                <p class="mt-3 font-weight-bold text-muted">Sincronizando el arsenal gaming...</p>
            </div>
        `;

      const [resProductos, resDescuentos] = await Promise.all([
        fetch(API_URL),
        fetch(`${BASE_URL}/api/descuentos/vigentes`),
      ]);

      cacheProductos = await resProductos.json();
      cacheDescuentos = await resDescuentos.json();

      renderizarBotoneraCategorias();
      filtrarYRenderizarProductos();
    } catch (error) {
      console.error("Error crítico en frontend:", error);
      contenedorGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle text-warning display-4 mb-3"></i>
                <h5 class="text-white font-weight-bold">¡Un error ha ocurrido en la Matrix!</h5>
                <p class="text-muted">No pudimos conectar con el inventario. Por favor, reintente más tarde.</p>
            </div>
        `;
    }
  }

  function renderizarBotoneraCategorias() {
    const contenedorCategorias = document.getElementById(
      "contenedorCategoriasWeb",
    );
    if (!contenedorCategorias) return;

    const categoriasUnicas = [
      ...new Set(cacheProductos.map((p) => p.CategoriaNombre).filter(Boolean)),
    ];

    let htmlBotones = `
        <button class="btn btn-categoria ${categoriaActiva === "TODOS" ? "active" : ""}" data-id="TODOS">
            TODOS LOS PRODUCTOS
        </button>
    `;

    categoriasUnicas.forEach((cat) => {
      htmlBotones += `
            <button class="btn btn-categoria ${categoriaActiva === cat ? "active" : ""}" data-id="${cat}">
                ${cat.toUpperCase()}
            </button>
        `;
    });

    htmlBotones += `
        <button class="btn btn-categoria ${ocultarAgotados ? "active" : ""} ml-md-auto" id="btnToggleStock" style="${ocultarAgotados ? "background: linear-gradient(135deg, var(--fox-orange) 0%, #ff2200 100%) !important; color: white !important; border-color: var(--fox-orange) !important; box-shadow: 0 8px 20px var(--fox-orange-glow);" : ""}">
            <i class="fas ${ocultarAgotados ? "fa-eye-slash" : "fa-eye"} mr-2"></i> SOLO DISPONIBLES
        </button>
    `;

    contenedorCategorias.innerHTML = htmlBotones;

    contenedorCategorias
      .querySelectorAll(".btn-categoria:not(#btnToggleStock)")
      .forEach((boton) => {
        boton.addEventListener("click", (e) => {
          contenedorCategorias
            .querySelectorAll(".btn-categoria:not(#btnToggleStock)")
            .forEach((b) => b.classList.remove("active"));
          e.target.classList.add("active");
          categoriaActiva = e.target.getAttribute("data-id");
          filtrarYRenderizarProductos();
        });
      });

    const btnToggleStock = document.getElementById("btnToggleStock");
    if (btnToggleStock) {
      btnToggleStock.addEventListener("click", () => {
        ocultarAgotados = !ocultarAgotados;
        renderizarBotoneraCategorias();
        filtrarYRenderizarProductos();
      });
    }
  }

  function filtrarYRenderizarProductos() {
    const contenedorGrid = document.getElementById("contenedorGridWeb");
    if (!contenedorGrid) return;

    let productosFiltrados = cacheProductos;

    if (categoriaActiva !== "TODOS") {
      productosFiltrados = productosFiltrados.filter(
        (p) => p.CategoriaNombre === categoriaActiva,
      );
    }

    if (textoBusqueda.trim() !== "") {
      productosFiltrados = productosFiltrados.filter(
        (p) =>
          (p.Nombre && p.Nombre.toLowerCase().includes(textoBusqueda)) ||
          (p.Codigo && p.Codigo.toLowerCase().includes(textoBusqueda)) ||
          (p.ModeloBase && p.ModeloBase.toLowerCase().includes(textoBusqueda)),
      );
    }

    if (ocultarAgotados) {
      productosFiltrados = productosFiltrados.filter((p) => p.StockActual > 0);
    }

    if (productosFiltrados.length === 0) {
      contenedorGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-folder-open text-muted display-4 mb-3"></i>
                <p class="text-muted font-weight-bold">No hay artículos disponibles para esta búsqueda o filtros.</p>
            </div>
        `;
      return;
    }

    const buscarDescuento = (productoID, categoriaID) => {
      const porProducto = cacheDescuentos.find(
        (d) => d.AplicaA === "PRODUCTO" && d.ReferenciaID === productoID,
      );
      if (porProducto) return porProducto;
      const porCategoria = cacheDescuentos.find(
        (d) => d.AplicaA === "CATEGORIA" && d.ReferenciaID === categoriaID,
      );
      if (porCategoria) return porCategoria;
      const general = cacheDescuentos.find((d) => d.AplicaA === "GENERAL");
      return general || null;
    };

    contenedorGrid.innerHTML = "";
    productosFiltrados.forEach((p) => {
      const imagenSrc = p.ImagenURL
        ? getUrl(p.ImagenURL)
        : "../shared/img/producto-placeholder.png";
      const tieneStock = p.StockActual > 0;

      const esStockCritico = tieneStock && p.StockActual <= 3;

      const mensajeWhatsApp = encodeURIComponent(
        `¡Hola FOX GAMERS! Estoy interesado en adquirir el producto: ${p.Nombre} (Código: ${p.Codigo}).`,
      );
      const linkWhatsApp = `https://wa.me/${WHATSAPP_NUMERO}?text=${mensajeWhatsApp}`;

      let badgeHTML = "";
      if (!tieneStock) {
        badgeHTML = `<span class="badge position-absolute m-3 badge-soldout" style="z-index:2;">AGOTADO</span>`;
      } else if (esStockCritico) {
        badgeHTML = `<span class="badge position-absolute m-3 badge-soldout" style="z-index:2; background: rgba(255, 85, 0, 0.95) !important; border-color: #ff5500 !important; box-shadow: 0 0 12px rgba(255, 85, 0, 0.6) !important;">¡SOLO ${p.StockActual} EN STOCK! 🔥</span>`;
      } else {
        badgeHTML = `<span class="badge position-absolute m-3 badge-stock" style="z-index:2;">DISPONIBLE</span>`;
      }

      contenedorGrid.innerHTML += `
            <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
                <div class="card web-card shadow-sm">
                    <div class="position-relative">
                        ${badgeHTML}
                        <div class="img-container">
                            <img src="${imagenSrc}" alt="${p.Nombre}" class="img-fluid" style="max-height: 100%; object-fit: contain;">
                        </div>
                    </div>
                    <div class="card-body d-flex flex-column justify-content-between p-3">
                        <div>
                            <h5 class="card-title">${p.Nombre}</h5>
                            <p class="small font-weight-bold mb-3" style="color: var(--fox-text-gray); font-size: 11px;">SKU: ${p.Codigo}</p>
                        </div>
                        
                        <div class="mt-auto">
                            ${(() => {
                              const dsc = buscarDescuento(
                                p.ProductoID,
                                p.CategoriaID,
                              );
                              if (!dsc)
                                return `
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                  <span class="text-uppercase small font-weight-bold" style="color: var(--fox-text-gray); font-size: 11px;">Precio:</span>
                                  <span class="price-tag">S/ ${p.PrecioVenta.toFixed(2)}</span>
                                </div>`;

                              const montoDesc =
                                dsc.TipoDescuento === "PORCENTAJE"
                                  ? p.PrecioVenta * (dsc.Valor / 100)
                                  : Math.min(dsc.Valor, p.PrecioVenta);
                              const precioFinal = (
                                p.PrecioVenta - montoDesc
                              ).toFixed(2);
                              const badgeDesc =
                                dsc.TipoDescuento === "PORCENTAJE"
                                  ? `-${dsc.Valor}%`
                                  : `-S/ ${dsc.Valor}`;

                              return `
                                <div class="mb-3">
                                  <div class="d-flex justify-content-between align-items-center">
                                    <span class="text-uppercase small font-weight-bold" style="color: var(--fox-text-gray); font-size: 11px;">Precio:</span>
                                    <div class="text-right">
                                      <span style="text-decoration:line-through; color: #94a3b8; font-size:12px; font-weight: 500;">S/ ${p.PrecioVenta.toFixed(2)}</span>
                                      <span class="badge ml-1 font-weight-bold" style="background:#ff6a00; color:#fff; font-size:10px; border-radius: 4px; padding: 2px 6px !important;">${badgeDesc}</span>
                                      <br>
                                      <span class="price-tag" style="color: var(--fox-cyan);">S/ ${precioFinal}</span>
                                    </div>
                                  </div>
                                  <div class="mt-1 text-right">
                                    <span class="badge badge-info font-weight-bold">
                                      <i class="fas fa-tag mr-1"></i>${dsc.Nombre || "Descuento"}
                                    </span>
                                  </div>
                                </div>`;
                            })()}
                            
                            <a href="${tieneStock ? linkWhatsApp : "#"}" target="_blank" class="btn btn-fox btn-block font-weight-bold py-2" style="${tieneStock ? "" : "background-color: #cbd5e1 !important; color: #94a3b8 !important; pointer-events: none;"}" >
                                <i class="${tieneStock ? "fab fa-whatsapp" : "fas fa-times-circle"} mr-2"></i> ${tieneStock ? "CONSULTAR AHORA" : "AGOTADO"}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
  }

  function configurarBuscador() {
    const inputBusqueda = document.getElementById("busquedaWeb");
    if (!inputBusqueda) return;

    inputBusqueda.addEventListener("input", (e) => {
      textoBusqueda = e.target.value.toLowerCase().trim();
      filtrarYRenderizarProductos();
    });
  }
})();
