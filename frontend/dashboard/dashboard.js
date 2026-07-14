(() => {
  // 🚀 ESTRUCTURA POR BLOQUES: Menú visualmente limpio y agrupado
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
        }
      ]
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
        }
      ]
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
        }
      ]
    },
    {
      header: "Reportes",
      items: [
        {
          id: "reportes",
          nombre: "Reportes y Analítica",
          icono: "fas fa-chart-pie",
          vista: "../modules/reportes/reportes_vista.html",
          js: "../modules/reportes/reportes.js",
        }
      ]
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
        }
      ]
    }
  ];

  document.addEventListener("DOMContentLoaded", () => {

    // 🚀 ANESTESIA PARA ADMINLTE: Apagar la expansión automática por Hover
    if (typeof $ !== 'undefined' && $.fn.PushMenu) {
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

    document.getElementById("welcomeMessage").textContent = `Hola, ${usuario.Nombre || "Usuario"}`;
    document.getElementById("userRole").textContent = rolMayuscula;

    // Cargar favicon dinámico desde la BD
    (async () => {
      try {
        const res = await fetch("http://localhost:3000/api/config-web/publica");
        const datos = await res.json();
        const logoActivo = datos?.logos?.find((l) => l.Activo == 1 || l.Activo === true);
        if (logoActivo) {
          const BASE_URL = "http://localhost:3000";
          const urlFavicon = logoActivo.ImagenURL.startsWith("http") ? logoActivo.ImagenURL : `${BASE_URL}${logoActivo.ImagenURL}`;
          const sysFavicon = document.getElementById("sysFavicon");
          if (sysFavicon) sysFavicon.href = urlFavicon;
        }
      } catch (e) { console.error("Error cargando favicon:", e); }
    })();

    const sidebar = document.getElementById("menuDinamico");
    sidebar.innerHTML = "";
    const permisosUsuario = usuario.permisos || [];
    let moduloInicial = null;

    // Renderizar Menú Dinámico con Cabeceras
    menuAgrupado.forEach((grupo) => {
      let itemsPermitidosHTML = "";

      grupo.items.forEach((item) => {
        const tieneAcceso = permisosUsuario.includes(item.id) || rolMayuscula === "ADMINISTRADOR";

        if (tieneAcceso) {
          if (!moduloInicial) moduloInicial = item;

          itemsPermitidosHTML += `
            <li class="nav-item">
                <a href="#" onclick="cargarModulo('${item.vista}', '${item.js}')" class="nav-link" id="nav-${item.id}">
                    <i class="nav-icon ${item.icono}"></i>
                    <p>${item.nombre}</p>
                </a>
            </li>`;
        }
      });

      // Solo pintamos la cabecera si el usuario tiene acceso a algún módulo de este bloque
      if (itemsPermitidosHTML !== "") {
        if (grupo.header) {
          sidebar.innerHTML += `<li class="nav-header font-weight-bold mt-2 pb-1" style="color: #64748b; font-size: 0.75rem; letter-spacing: 1px; text-transform: uppercase;">${grupo.header}</li>`;
        }
        sidebar.innerHTML += itemsPermitidosHTML;
      }
    });

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

// Función global que carga el HTML y el JS del módulo seleccionado
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

      // Aseguramos que los nuevos módulos en 3 capas se carguen como 'module'
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
  const enlaces = document.querySelectorAll(".nav-sidebar .nav-link");
  enlaces.forEach((enlace) => {
    enlace.classList.remove("active");
    const onclickAttr = enlace.getAttribute("onclick");
    if (onclickAttr && onclickAttr.includes(urlActual)) {
      enlace.classList.add("active");
    }
  });
}