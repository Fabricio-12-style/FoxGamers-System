(() => {
  const menuDefinicion = [
    {
      id: "dashboard",
      nombre: "Dashboard",
      icono: "fas fa-tachometer-alt",
      vista: "../modules/inicio/inicio_vista.html",
      js: "../modules/inicio/inicio.js",
    },
    {
      id: "pos",
      nombre: "Punto de Venta",
      icono: "fas fa-cash-register",
      vista: "../modules/ventas/pos_vista.html",
      js: "../modules/ventas/pos.js",
    },
    {
      id: "inventario",
      nombre: "Inventario",
      icono: "fas fa-box-open",
      vista: "../modules/inventario/inventario_vista.html",
      js: "../modules/inventario/inventario.js",
    },
    {
      id: "productos",
      nombre: "Productos",
      icono: "fas fa-boxes",
      vista: "../modules/productos/productos_vista.html",
      js: "../modules/productos/productos.js",
    },
    {
      id: "categorias",
      nombre: "Categorías",
      icono: "fas fa-tags",
      vista: "../modules/categorias/categorias_vista.html",
      js: "../modules/categorias/categorias.js",
    },
    {
      id: "clientes",
      nombre: "Clientes",
      icono: "fas fa-users",
      vista: "../modules/clientes/clientes_vista.html",
      js: "../modules/clientes/clientes.js",
    },
    {
      id: "proveedores",
      nombre: "Proveedores",
      icono: "fas fa-truck",
      vista: "../modules/proveedores/proveedores_vista.html",
      js: "../modules/proveedores/proveedores.js",
    },
    {
      id: "descuentos",
      nombre: "Descuentos",
      icono: "fas fa-percentage",
      vista: "../modules/descuentos/descuentos_vista.html",
      js: "../modules/descuentos/descuentos.js",
    },
    {
      id: "usuarios",
      nombre: "Usuarios",
      icono: "fas fa-users",
      vista: "../modules/usuarios/usuarios_vista.html",
      js: "../modules/usuarios/usuarios.js",
    },
    {
      id: "perfiles",
      nombre: "Perfiles y Accesos",
      icono: "fas fa-users-cog",
      vista: "../modules/perfiles/perfiles_vista.html",
      js: "../modules/perfiles/perfiles.js",
    },
    {
      id: "reportes",
      nombre: "Reportes y Analítica",
      icono: "fas fa-chart-pie",
      vista: "../modules/reportes/reportes_vista.html",
      js: "../modules/reportes/reportes.js",
    },
    {
      id: "configuracion",
      nombre: "Configuración Web",
      icono: "fas fa-sliders-h",
      vista: "../modules/configuracion/config_vista.html",
      js: "../modules/configuracion/configuracion.js",
    },
    {
      id: "empresa",
      nombre: "Empresa",
      icono: "fas fa-building",
      vista: "../modules/empresa/empresa_vista.html",
      js: "../modules/empresa/empresa.js",
    },
  ];

  document.addEventListener("DOMContentLoaded", () => {
    const usuarioString = localStorage.getItem("usuarioFoxGamers");
    const token = localStorage.getItem("tokenFoxGamers");

    if (!usuarioString || !token) {
      localStorage.clear();
      window.location.replace("../login/login.html");
      return;
    }

    const usuario = JSON.parse(usuarioString);
    const rolMayuscula = (usuario.Rol || "Sin Rol").toUpperCase();

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
        console.error("Error cargando favicon del sistema:", e);
      }
    })();

    const sidebar = document.querySelector(".nav-sidebar");
    sidebar.innerHTML = "";
    const permisosUsuario = usuario.permisos || [];
    const menuPermitidos = [];

    menuDefinicion.forEach((item) => {
      const tieneAcceso =
        permisosUsuario.includes(item.id) || rolMayuscula === "ADMINISTRADOR";

      if (tieneAcceso) {
        menuPermitidos.push(item);
        sidebar.innerHTML += `
          <li class="nav-item">
              <a href="#" onclick="cargarModulo('${item.vista}', '${item.js}')" class="nav-link" id="nav-${item.id}">
                  <i class="nav-icon ${item.icono}"></i>
                  <p>${item.nombre}</p>
              </a>
          </li>`;
      }
    });

    const btnCerrarSesion = document.getElementById("btnCerrarSesion");
    if (btnCerrarSesion) {
      btnCerrarSesion.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "/frontend/login/login.html";
      });
    }

    const moduloInicial =
      menuPermitidos.find((m) => m.id === "dashboard") || menuPermitidos[0];

    if (moduloInicial) {
      cargarModulo(moduloInicial.vista, moduloInicial.js);
    } else {
      document.getElementById("app-content").innerHTML = `
        <div class="alert alert-warning m-4 p-4 text-center">
          <i class="fas fa-exclamation-triangle style="font-size: 2rem;"></i>
          <h4 class="mt-2 font-weight-bold">Sin Accesos Asignados</h4>
          <p class="mb-0">Su perfil actual no cuenta con módulos asignados en el sistema. Contacte a un administrador.</p>
        </div>`;
    }
  });
})();

async function cargarModulo(urlHtml, urlJs = null) {
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
      document.body.appendChild(scriptNuevo);
    }

    actualizarMenuActivo(urlHtml);
  } catch (error) {
    console.error("Error cargando módulo:", error);
    contenedor.innerHTML = `<div class="alert alert-danger p-4">Error al cargar módulo. Verifica que la ruta exista.</div>`;
  }
}

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
