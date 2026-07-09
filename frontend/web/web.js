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
    configurarModoOscuro();
    sincronizarConfiguracionWeb();
    cargarDatosEmpresaWeb();
    cargarCatalogoPublico();
    configurarBuscador();
  });

  function configurarModoOscuro() {
    const themeBtns = document.querySelectorAll(".theme-toggle-btn");
    if (themeBtns.length === 0) return;

    const currentTheme = localStorage.getItem("fox_theme") || "dark";
    document.body.setAttribute("data-theme", currentTheme);
    actualizarIconos(currentTheme);

    themeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        let theme = document.body.getAttribute("data-theme");
        let nuevoTema = theme === "dark" ? "light" : "dark";

        document.body.setAttribute("data-theme", nuevoTema);
        localStorage.setItem("fox_theme", nuevoTema);
        actualizarIconos(nuevoTema);
      });
    });

    function actualizarIconos(theme) {
      themeBtns.forEach((btn) => {
        const icon = btn.querySelector("i");
        if (theme === "light") {
          icon.classList.remove("fa-sun");
          icon.classList.add("fa-moon");
          btn.style.color = "#475569";
          btn.style.background = "rgba(0, 0, 0, 0.05)";
        } else {
          icon.classList.remove("fa-moon");
          icon.classList.add("fa-sun");
          btn.style.color = "#facc15";
          btn.style.background = "rgba(255, 255, 255, 0.05)";
        }
      });
    }
  }

  async function cargarDatosEmpresaWeb() {
    try {
      const res = await fetch(`${BASE_URL}/api/empresa/publica`);
      const resJson = await res.json();

      if (resJson.success && resJson.data) {
        const emp = resJson.data;
        document.getElementById("footerDireccion").textContent =
          emp.Direccion || "Av. Francisco Bolognesi 536, Chiclayo 14001";
        document.getElementById("footerTelefono").textContent =
          emp.Telefono || "+51 961 460 326";
        document.getElementById("footerCorreo").textContent =
          emp.Correo || "ventas@foxgamers.pe";
        document.getElementById("footerNombreEmpresa").textContent =
          emp.NombreComercial || "FOX GAMERS";
        document.getElementById("footerYear").textContent =
          new Date().getFullYear();
      }
    } catch (e) {
      console.error("Error al sincronizar datos del footer:", e);
    }
  }

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

        // Actualiza TODOS los logos del Navbar (Móvil y PC)
        const logosNav = document.querySelectorAll(".webLogoImg");
        logosNav.forEach((img) => (img.src = urlImagenReal));

        const webFavicon = document.getElementById("webFavicon");
        if (webFavicon) webFavicon.href = urlImagenReal;

        const footerLogo = document.getElementById("footerLogo");
        if (footerLogo) footerLogo.src = urlImagenReal;
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
                <img src="${getUrl(slider.ImagenURL)}" class="d-block w-100" alt="Promoción">
              </div>`;
            htmlIndicadores += `
              <li data-target="#sliderPromociones" data-slide-to="${index}" class="${activeClass}"></li>`;
          });

          contenedorBanners.innerHTML = htmlBanners;
          indicadoresBanners.innerHTML = htmlIndicadores;
        } else {
          contenedorBanners.innerHTML = `
            <div class="carousel-item active text-center py-5 d-flex flex-column align-items-center justify-content-center" style="height: 100%;">
              <i class="fas fa-gamepad fa-3x mb-3" style="color: var(--fox-accent);"></i>
              <p class="font-weight-bold fox-subtitle" style="font-size: 1.2rem;">¡Próximamente nuevas promociones!</p>
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
                <div class="spinner-border" style="color: var(--fox-accent); width: 3rem; height: 3rem;" role="status"></div>
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
                <h5 class="font-weight-bold fox-title">¡Un error ha ocurrido en la Matrix!</h5>
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
        <button class="btn btn-categoria ${ocultarAgotados ? "active" : ""} ml-md-auto" id="btnToggleStock" style="${ocultarAgotados ? "background: linear-gradient(135deg, var(--fox-orange) 0%, #ff2200 100%) !important; color: white !important; border-color: var(--fox-orange) !important;" : ""}">
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
        badgeHTML = `<span class="badge position-absolute m-2 px-2 py-1" style="z-index:2; top:0; left:0; background: #ef4444; color:#fff; font-size:10px; border-radius:4px; font-weight:700;">AGOTADO</span>`;
      } else if (esStockCritico) {
        badgeHTML = `<span class="badge position-absolute m-2 px-2 py-1" style="z-index:2; top:0; left:0; background: #f97316; color:#fff; font-size:10px; border-radius:4px; font-weight:700; box-shadow: 0 0 10px rgba(249,115,22,0.4);">ÚLTIMAS ${p.StockActual} UNIDADES</span>`;
      } else {
        badgeHTML = `<span class="badge position-absolute m-2 px-2 py-1" style="z-index:2; top:0; left:0; background: #10b981; color:#fff; font-size:10px; border-radius:4px; font-weight:700;">DISPONIBLE</span>`;
      }

      const dsc = buscarDescuento(p.ProductoID, p.CategoriaID);
      let bloquePreciosHTML = "";

      if (!dsc) {
        bloquePreciosHTML = `
          <div class="d-flex align-items-baseline mb-3 mt-2">
            <span class="price-tag">S/ ${p.PrecioVenta.toFixed(2)}</span>
          </div>`;
      } else {
        const montoDesc =
          dsc.TipoDescuento === "PORCENTAJE"
            ? p.PrecioVenta * (dsc.Valor / 100)
            : Math.min(dsc.Valor, p.PrecioVenta);
        const precioFinal = (p.PrecioVenta - montoDesc).toFixed(2);
        const tagAhorro =
          dsc.TipoDescuento === "PORCENTAJE"
            ? `-${dsc.Valor}%`
            : `S/ -${dsc.Valor}`;

        bloquePreciosHTML = `
          <div class="mb-3 mt-2">
            <div class="d-flex align-items-center flex-wrap gap-2 mb-1">
              <span class="price-tag">S/ ${precioFinal}</span>
              <span style="text-decoration: line-through; color: var(--fox-price-old); font-size: 1rem; font-weight: 600;">S/ ${p.PrecioVenta.toFixed(2)}</span>
              <span class="badge ml-2 font-weight-bold" style="background: #ef4444; color: #ffffff; font-size: 11px; padding: 4px 8px; border-radius: 4px;">AHORRA ${tagAhorro}</span>
            </div>
            <div style="font-size: 12px; color: #10b981; font-weight: 700; margin-top: 4px;"><i class="fas fa-tag mr-1"></i> ${dsc.Nombre || "Oferta Especial"}</div>
          </div>`;
      }

      contenedorGrid.innerHTML += `
            <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
                <div class="card h-100 border-0 shadow-sm web-card">
                    <div class="position-relative p-3 img-container">
                        ${badgeHTML}
                        <img src="${imagenSrc}" alt="${p.Nombre}" style="max-height: 100%; max-width: 100%; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.1));">
                    </div>
                    <div class="card-body">
                        <div>
                            <h6 class="mb-1">${p.Nombre}</h6>
                            <p class="font-weight-bold mb-2" style="color: var(--fox-card-sku); font-size: 11px; letter-spacing: 0.5px;">SKU: ${p.Codigo}</p>
                        </div>
                        
                        <div class="mt-auto">
                            ${bloquePreciosHTML}
                            
                            <a href="${tieneStock ? linkWhatsApp : "#"}" target="_blank" class="btn btn-block font-weight-bold d-flex align-items-center justify-content-center text-uppercase" 
                               style="${tieneStock ? "background: #2563eb; color: #ffffff; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);" : "background: var(--fox-btn-disabled-bg) !important; color: var(--fox-btn-disabled-text) !important; pointer-events: none; border: none;"} border-radius: 6px; font-size: 12px; padding: 12px 0; transition: all 0.3s ease;" >
                                <i class="${tieneStock ? "fab fa-whatsapp" : "fas fa-times-circle"} mr-2" style="font-size: 16px;"></i> ${tieneStock ? "Consultar por WhatsApp" : "Agotado"}
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
