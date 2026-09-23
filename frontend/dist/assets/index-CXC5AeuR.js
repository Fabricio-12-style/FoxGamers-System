import"./global-C1mSI1C2.js";(function(){const g="http://localhost:3000",A=`${g}/api/productos/publicos`,E=`${g}/api/config-web/publica`,L="51961460326";let h=[],b=[],m="TODOS",u="",f=!1;const x=o=>o?o.startsWith("http")?o:`${g}${o}`:null;document.addEventListener("DOMContentLoaded",()=>{S(),I(),w(),C(),$()});function S(){const o=document.querySelectorAll(".theme-toggle-btn");if(o.length===0)return;const a=localStorage.getItem("fox_theme")||"dark";document.body.setAttribute("data-theme",a),r(a),o.forEach(e=>{e.addEventListener("click",()=>{let t=document.body.getAttribute("data-theme")==="dark"?"light":"dark";document.body.setAttribute("data-theme",t),localStorage.setItem("fox_theme",t),r(t)})});function r(e){o.forEach(n=>{const t=n.querySelector("i");e==="light"?(t.classList.remove("fa-sun"),t.classList.add("fa-moon"),n.style.color="#475569",n.style.background="rgba(0, 0, 0, 0.05)"):(t.classList.remove("fa-moon"),t.classList.add("fa-sun"),n.style.color="#facc15",n.style.background="rgba(255, 255, 255, 0.05)")})}}async function w(){try{const a=await(await fetch(`${g}/api/empresa/publica`)).json();if(a.success&&a.data){const r=a.data;document.getElementById("footerDireccion").textContent=r.Direccion||"Av. Francisco Bolognesi 536, Chiclayo 14001",document.getElementById("footerTelefono").textContent=r.Telefono||"+51 961 460 326",document.getElementById("footerCorreo").textContent=r.Correo||"ventas@foxgamers.pe",document.getElementById("footerNombreEmpresa").textContent=r.NombreComercial||"FOX GAMERS",document.getElementById("footerYear").textContent=new Date().getFullYear()}}catch(o){console.error("Error al sincronizar datos del footer:",o)}}async function I(){try{const a=await(await fetch(E)).json();if(!a)return;const r=a.logos?a.logos.find(t=>t.Activo==1||t.Activo===!0):null;if(r){const t=x(r.ImagenURL);document.querySelectorAll(".webLogoImg").forEach(l=>l.src=t);const d=document.getElementById("webFavicon");d&&(d.href=t);const i=document.getElementById("footerLogo");i&&(i.src=t)}const e=document.getElementById("contenedorBannersWeb"),n=document.getElementById("indicadoresBanners");if(e&&n){const t=a.sliders?a.sliders.filter(s=>s.ImagenURL&&(s.Activo===1||s.Activo===!0)):[];if(t.length>0){let s="",d="";t.forEach((i,l)=>{const c=l===0?"active":"";s+=`
              <div class="carousel-item ${c}">
                <img src="${x(i.ImagenURL)}" class="d-block w-100" alt="Promoción">
              </div>`,d+=`
              <li data-target="#sliderPromociones" data-slide-to="${l}" class="${c}"></li>`}),e.innerHTML=s,n.innerHTML=d}else e.innerHTML=`
            <div class="carousel-item active text-center py-5 d-flex flex-column align-items-center justify-content-center" style="height: 100%;">
              <i class="fas fa-gamepad fa-3x mb-3" style="color: var(--fox-accent);"></i>
              <p class="font-weight-bold fox-subtitle" style="font-size: 1.2rem;">¡Próximamente nuevas promociones!</p>
            </div>`,n.innerHTML=""}}catch(o){console.error("Error al sincronizar la configuración pública:",o)}}async function C(){const o=document.getElementById("contenedorGridWeb");try{o.innerHTML=`
            <div class="col-12 text-center py-5">
                <div class="spinner-border" style="color: var(--fox-accent); width: 3rem; height: 3rem;" role="status"></div>
                <p class="mt-3 font-weight-bold text-muted">Sincronizando el arsenal gaming...</p>
            </div>
        `;const[a,r]=await Promise.all([fetch(A),fetch(`${g}/api/descuentos/vigentes`)]),e=await a.json(),n=await r.json();h=Array.isArray(e)?e:[],b=Array.isArray(n)?n:[],y(),p()}catch(a){console.error("Error crítico en frontend:",a),o.innerHTML=`
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle text-warning display-4 mb-3"></i>
                <h5 class="font-weight-bold fox-title">¡Un error ha ocurrido en la Matrix!</h5>
                <p class="text-muted">No pudimos conectar con el inventario. Por favor, reintente más tarde.</p>
            </div>
        `}}function y(){const o=document.getElementById("contenedorCategoriasWeb");if(!o)return;const a=[...new Set(h.map(n=>n.CategoriaNombre).filter(Boolean))];let r=`
        <button class="btn btn-categoria ${m==="TODOS"?"active":""}" data-id="TODOS">
            TODOS LOS PRODUCTOS
        </button>
    `;a.forEach(n=>{r+=`
            <button class="btn btn-categoria ${m===n?"active":""}" data-id="${n}">
                ${n.toUpperCase()}
            </button>
        `}),r+=`
        <button class="btn btn-categoria ${f?"active":""} ml-md-auto" id="btnToggleStock" style="${f?"background: linear-gradient(135deg, var(--fox-orange) 0%, #ff2200 100%) !important; color: white !important; border-color: var(--fox-orange) !important;":""}">
            <i class="fas ${f?"fa-eye-slash":"fa-eye"} mr-2"></i> SOLO DISPONIBLES
        </button>
    `,o.innerHTML=r,o.querySelectorAll(".btn-categoria:not(#btnToggleStock)").forEach(n=>{n.addEventListener("click",t=>{o.querySelectorAll(".btn-categoria:not(#btnToggleStock)").forEach(s=>s.classList.remove("active")),t.target.classList.add("active"),m=t.target.getAttribute("data-id"),p()})});const e=document.getElementById("btnToggleStock");e&&e.addEventListener("click",()=>{f=!f,y(),p()})}function p(){const o=document.getElementById("contenedorGridWeb");if(!o)return;let a=h;if(m!=="TODOS"&&(a=a.filter(e=>e.CategoriaNombre===m)),u.trim()!==""&&(a=a.filter(e=>e.Nombre&&e.Nombre.toLowerCase().includes(u)||e.Codigo&&e.Codigo.toLowerCase().includes(u)||e.ModeloBase&&e.ModeloBase.toLowerCase().includes(u))),f&&(a=a.filter(e=>e.StockActual>0)),a.length===0){o.innerHTML=`
            <div class="col-12 text-center py-5">
                <i class="fas fa-folder-open text-muted display-4 mb-3"></i>
                <p class="text-muted font-weight-bold">No hay artículos disponibles para esta búsqueda o filtros.</p>
            </div>
        `;return}const r=(e,n)=>{const t=b.find(i=>i.AplicaA==="PRODUCTO"&&i.ReferenciaID===e);if(t)return t;const s=b.find(i=>i.AplicaA==="CATEGORIA"&&i.ReferenciaID===n);return s||b.find(i=>i.AplicaA==="GENERAL")||null};o.innerHTML="",a.forEach(e=>{const n=e.ImagenURL?x(e.ImagenURL):"/img/foxGamers.jpeg",t=e.StockActual>0,s=t&&e.StockActual<=3,d=encodeURIComponent(`¡Hola FOX GAMERS! Estoy interesado en adquirir el producto: ${e.Nombre} (Código: ${e.Codigo}).`),i=`https://wa.me/${L}?text=${d}`;let l="";t?s?l=`<span class="badge position-absolute m-2 px-2 py-1" style="z-index:2; top:0; left:0; background: #f97316; color:#fff; font-size:10px; border-radius:4px; font-weight:700; box-shadow: 0 0 10px rgba(249,115,22,0.4);">ÚLTIMAS ${e.StockActual} UNIDADES</span>`:l='<span class="badge position-absolute m-2 px-2 py-1" style="z-index:2; top:0; left:0; background: #10b981; color:#fff; font-size:10px; border-radius:4px; font-weight:700;">DISPONIBLE</span>':l='<span class="badge position-absolute m-2 px-2 py-1" style="z-index:2; top:0; left:0; background: #ef4444; color:#fff; font-size:10px; border-radius:4px; font-weight:700;">AGOTADO</span>';const c=r(e.ProductoID,e.CategoriaID);let v="";if(!c)v=`
          <div class="d-flex align-items-baseline mb-3 mt-2">
            <span class="price-tag">S/ ${e.PrecioVenta.toFixed(2)}</span>
          </div>`;else{const T=c.TipoDescuento==="PORCENTAJE"?e.PrecioVenta*(c.Valor/100):Math.min(c.Valor,e.PrecioVenta),B=(e.PrecioVenta-T).toFixed(2),O=c.TipoDescuento==="PORCENTAJE"?`-${c.Valor}%`:`S/ -${c.Valor}`;v=`
          <div class="mb-3 mt-2">
            <div class="d-flex align-items-center flex-wrap gap-2 mb-1">
              <span class="price-tag">S/ ${B}</span>
              <span style="text-decoration: line-through; color: var(--fox-price-old); font-size: 1rem; font-weight: 600;">S/ ${e.PrecioVenta.toFixed(2)}</span>
              <span class="badge ml-2 font-weight-bold" style="background: #ef4444; color: #ffffff; font-size: 11px; padding: 4px 8px; border-radius: 4px;">AHORRA ${O}</span>
            </div>
            <div style="font-size: 12px; color: #10b981; font-weight: 700; margin-top: 4px;"><i class="fas fa-tag mr-1"></i> ${c.Nombre||"Oferta Especial"}</div>
          </div>`}o.innerHTML+=`
            <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
                <div class="card h-100 border-0 shadow-sm web-card">
                    <div class="position-relative p-3 img-container">
                        ${l}
                        <img src="${n}" alt="${e.Nombre}" style="max-height: 100%; max-width: 100%; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.1));">
                    </div>
                    <div class="card-body">
                        <div>
                            <h6 class="mb-1">${e.Nombre}</h6>
                            <p class="font-weight-bold mb-2" style="color: var(--fox-card-sku); font-size: 11px; letter-spacing: 0.5px;">SKU: ${e.Codigo}</p>
                        </div>
                        
                        <div class="mt-auto">
                            ${v}
                            
                            <a href="${t?i:"#"}" target="_blank" class="btn btn-block font-weight-bold d-flex align-items-center justify-content-center text-uppercase" 
                               style="${t?"background: #2563eb; color: #ffffff; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);":"background: var(--fox-btn-disabled-bg) !important; color: var(--fox-btn-disabled-text) !important; pointer-events: none; border: none;"} border-radius: 6px; font-size: 12px; padding: 12px 0; transition: all 0.3s ease;" >
                                <i class="${t?"fab fa-whatsapp":"fas fa-times-circle"} mr-2" style="font-size: 16px;"></i> ${t?"Consultar por WhatsApp":"Agotado"}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `})}function $(){const o=document.getElementById("busquedaWeb");o&&o.addEventListener("input",a=>{u=a.target.value.toLowerCase().trim(),p()})}})();
