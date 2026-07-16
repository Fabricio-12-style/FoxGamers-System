(() => {
  const menuAgrupado = [
    {
      header: null,
      items: [
        {
          id: "dashboard",
          nombre: "Dashboard",
          icono: "fas fa-tachometer-alt",
          vista: "../modules/inicio/inicio_vista.html",
          js: "../modules/inicio/inicioUI.js",
        },
      ],
    },
    {
      header: "Ventas y Clientes",
      items: [
        {
          id: "pos",
          nombre: "Punto de Venta",
          icono: "fas fa-cash-register",
          vista: "../modules/ventas/pos_vista.html",
          js: "../modules/ventas/posUI.js",
        },
        {
          id: "clientes",
          nombre: "Clientes",
          icono: "fas fa-users",
          vista: "../modules/clientes/clientes_vista.html",
          js: "../modules/clientes/clientesUI.js",
        },
        {
          id: "descuentos",
          nombre: "Descuentos",
          icono: "fas fa-percentage",
          vista: "../modules/descuentos/descuentos_vista.html",
          js: "../modules/descuentos/descuentosUI.js",
        },
      ],
    },
    {
      header: "Catálogo e Inventario",
      items: [
        {
          id: "productos",
          nombre: "Productos",
          icono: "fas fa-boxes",
          vista: "../modules/productos/productos_vista.html",
          js: "../modules/productos/productosUI.js",
        },
        {
          id: "categorias",
          nombre: "Categorías",
          icono: "fas fa-tags",
          vista: "../modules/categorias/categorias_vista.html",
          js: "../modules/categorias/categoriasUI.js",
        },
        {
          id: "inventario",
          nombre: "Inventario",
          icono: "fas fa-box-open",
          vista: "../modules/inventario/inventario_vista.html",
          js: "../modules/inventario/inventarioUI.js",
        },
        {
          id: "proveedores",
          nombre: "Proveedores",
          icono: "fas fa-truck",
          vista: "../modules/proveedores/proveedores_vista.html",
          js: "../modules/proveedores/proveedoresUI.js",
        },
      ],
    },
    {
      header: "Reportes",
      items: [
        {
          id: "reportes",
          nombre: "Reportes y Analítica",
          icono: "fas fa-chart-pie",
          esDesplegable: true,
          subItems: [
            {
              id: "rep_ventas",
              nombre: "Ventas Generales",
              icono: "far fa-circle",
              vista: "../modules/reportes/rep-ventas/ventas_vista.html",
              js: "../modules/reportes/rep-ventas/ventasUI.js",
            },
            {
              id: "rep_cajero",
              nombre: "Cierre de Cajero",
              icono: "far fa-circle",
              vista: "../modules/reportes/cajeros/cajeros_vista.html",
              js: "../modules/reportes/cajeros/cajerosUI.js",
            },
            {
              id: "rep_productos",
              nombre: "Top Productos",
              icono: "far fa-circle",
              vista: "../modules/reportes/productos/productos_vista.html",
              js: "../modules/reportes/productos/productosUI.js",
            },
            {
              id: "rep_flujo",
              nombre: "Flujo de Caja",
              icono: "far fa-circle", // Puedes usar "far fa-circle" si prefieres mantener los iconos de submenú circulares
              vista: "../modules/reportes/rep-flujo/flujo_vista.html",
              js: "../modules/reportes/rep-flujo/flujoUI.js",
            },
            {
              id: "rep_utilidades",
              nombre: "Utilidades",
              icono: "far fa-circle",
              vista: "../modules/reportes/utilidades/utilidades_vista.html",
              js: "../modules/reportes/utilidades/utilidadesUI.js",
            },
          ],
        },
      ],
    },
    {
      header: "Administración",
      items: [
        {
          id: "usuarios",
          nombre: "Usuarios",
          icono: "fas fa-user-shield",
          vista: "../modules/usuarios/usuarios_vista.html",
          js: "../modules/usuarios/usuariosUI.js",
        },
        {
          id: "perfiles",
          nombre: "Perfiles y Accesos",
          icono: "fas fa-users-cog",
          vista: "../modules/perfiles/perfiles_vista.html",
          js: "../modules/perfiles/perfilesUI.js",
        },
        {
          id: "empresa",
          nombre: "Empresa",
          icono: "fas fa-building",
          vista: "../modules/empresa/empresa_vista.html",
          js: "../modules/empresa/empresaUI.js",
        },
        {
          id: "configuracion",
          nombre: "Configuración Web",
          icono: "fas fa-sliders-h",
          vista: "../modules/configuracion/config_vista.html",
          js: "../modules/configuracion/configUI.js",
        },
      ],
    },
  ];

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof $ !== "undefined" && $.fn.PushMenu) {
      $('[data-widget="pushmenu"]').PushMenu({ expandSidebarHover: false });
    }

    const usuarioString = localStorage.getItem("usuarioFoxGamers");
    const token = localStorage.getItem("tokenFoxGamers");

    if (!usuarioString || !token) {
      localStorage.clear();
      window.location.replace("../login/login.html");
      return;
    }

    const usuario = JSON.parse(usuarioString);
    const rolMayuscula = (usuario.Rol || "Sin Rol").toUpperCase();
    const permisosUsuario = usuario.permisos || [];

    document.getElementById("welcomeMessage").textContent =
      `Hola, ${usuario.Nombre || "Usuario"}`;
    document.getElementById("userRole").textContent = rolMayuscula;

    (async () => {
      try {
        const res = await fetch("http://localhost:3000/api/config-web/publica");
        const datos = await res.json();
        const logoActivo = datos?.logos?.find(
          (l) => l.Activo == 1 || l.Activo === true,
        );
        if (logoActivo) {
          const BASE_URL = "http://localhost:3000";
          const urlFavicon = logoActivo.ImagenURL.startsWith("http")
            ? logoActivo.ImagenURL
            : `${BASE_URL}${logoActivo.ImagenURL}`;
          const sysFavicon = document.getElementById("sysFavicon");
          if (sysFavicon) sysFavicon.href = urlFavicon;
        }
      } catch (e) {
        console.error("Error cargando favicon:", e);
      }
    })();

    const sidebar = document.getElementById("menuDinamico");
    sidebar.innerHTML = "";
    let moduloInicial = null;

    menuAgrupado.forEach((grupo) => {
      let itemsPermitidosHTML = "";

      grupo.items.forEach((item) => {
        const tieneAccesoPadre =
          permisosUsuario.includes(item.id) || rolMayuscula === "ADMINISTRADOR";

        if (tieneAccesoPadre) {
          if (item.esDesplegable) {
            let subItemsHTML = "";
            let tieneAlMenosUnSubmenu = false;

            item.subItems.forEach((sub) => {
              const tieneAccesoHijo =
                permisosUsuario.includes(sub.id) ||
                rolMayuscula === "ADMINISTRADOR";

              if (tieneAccesoHijo) {
                tieneAlMenosUnSubmenu = true;
                if (!moduloInicial) moduloInicial = sub;

                subItemsHTML += `
                  <li class="nav-item">
                      <a href="#" onclick="cargarModulo('${sub.vista}', '${sub.js}')" class="nav-link sub-nav-link" id="nav-${sub.id}">
                          <i class="${sub.icono} nav-icon" style="font-size: 0.8rem; margin-left: 10px;"></i>
                          <p>${sub.nombre}</p>
                      </a>
                  </li>`;
              }
            });

            if (tieneAlMenosUnSubmenu) {
              itemsPermitidosHTML += `
                <li class="nav-item has-treeview menu-item-acordeon">
                    <a href="#" class="nav-link" id="nav-${item.id}">
                        <i class="nav-icon ${item.icono}"></i>
                        <p>
                            ${item.nombre}
                            <i class="right fas fa-angle-left"></i>
                        </p>
                    </a>
                    <ul class="nav nav-treeview" style="display: none; background-color: rgba(0,0,0,0.1);">
                        ${subItemsHTML}
                    </ul>
                </li>`;
            }
          } else {
            if (!moduloInicial) moduloInicial = item;

            itemsPermitidosHTML += `
              <li class="nav-item">
                  <a href="#" onclick="cargarModulo('${item.vista}', '${item.js}')" class="nav-link" id="nav-${item.id}">
                      <i class="nav-icon ${item.icono}"></i>
                      <p>${item.nombre}</p>
                  </a>
              </li>`;
          }
        }
      });

      if (itemsPermitidosHTML !== "") {
        if (grupo.header) {
          sidebar.innerHTML += `<li class="nav-header font-weight-bold mt-2 pb-1" style="color: #64748b; font-size: 0.75rem; letter-spacing: 1px; text-transform: uppercase;">${grupo.header}</li>`;
        }
        sidebar.innerHTML += itemsPermitidosHTML;
      }
    });

    setTimeout(() => {
      if (typeof $ !== "undefined" && $.fn.Treeview) {
        $('[data-widget="treeview"]').Treeview("init");
      }
    }, 100);

    const btnCerrarSesion = document.getElementById("btnCerrarSesion");
    if (btnCerrarSesion) {
      btnCerrarSesion.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "../login/login.html";
      });
    }

    if (moduloInicial) {
      cargarModulo(moduloInicial.vista, moduloInicial.js);
    } else {
      document.getElementById("app-content").innerHTML = `
        <div class="alert alert-warning m-4 p-4 text-center shadow-sm">
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
          <h4 class="mt-2 font-weight-bold">Sin Accesos Asignados</h4>
          <p class="mb-0">Su perfil actual no cuenta con módulos asignados en el sistema. Contacte a un administrador.</p>
        </div>`;
    }
  });
})();

window.cargarModulo = async function (urlHtml, urlJs = null) {
  const contenedor = document.getElementById("app-content");
  try {
    const response = await fetch(urlHtml + "?t=" + new Date().getTime());
    if (!response.ok) throw new Error("Vista no encontrada");

    contenedor.innerHTML = await response.text();

    if (urlJs) {
      const scriptViejo = document.getElementById("script-modulo-dinamico");
      if (scriptViejo) scriptViejo.remove();

      const scriptNuevo = document.createElement("script");
      scriptNuevo.id = "script-modulo-dinamico";
      scriptNuevo.src = urlJs + "?v=" + new Date().getTime();

      if (urlJs.includes("UI.js")) {
        scriptNuevo.type = "module";
      }
      document.body.appendChild(scriptNuevo);
    }

    actualizarMenuActivo(urlHtml);
  } catch (error) {
    console.error("Error cargando módulo:", error);
    contenedor.innerHTML = `<div class="alert alert-danger m-4 p-4 shadow-sm"><i class="fas fa-bug mr-2"></i>Error al cargar el módulo. Verifica la consola.</div>`;
  }
};

function actualizarMenuActivo(urlActual) {
  document
    .querySelectorAll(".nav-sidebar .nav-link")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelectorAll(".has-treeview")
    .forEach((el) => el.classList.remove("menu-open"));

  const enlaces = document.querySelectorAll(".nav-sidebar a");
  enlaces.forEach((enlace) => {
    const onclickAttr = enlace.getAttribute("onclick");
    if (onclickAttr && onclickAttr.includes(urlActual)) {
      enlace.classList.add("active");

      const arbolPadre = enlace.closest(".has-treeview");
      if (arbolPadre) {
        arbolPadre.classList.add("menu-open");
        const enlacePadre = arbolPadre.querySelector("a.nav-link");
        if (enlacePadre) enlacePadre.classList.add("active");
      }
    }
  });
}
