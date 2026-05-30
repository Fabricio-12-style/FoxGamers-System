// 1. DEFINICIÓN MAESTRA DE MÓDULOS
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
    id: "configuracion",
    nombre: "Configuración Web",
    icono: "fas fa-sliders-h",
    vista: "../modules/configuracion/config_vista.html",
    js: "../modules/configuracion/configuracion.js",
  },
];

document.addEventListener("DOMContentLoaded", () => {
  const usuarioString = localStorage.getItem("usuarioFoxGamers");
  if (!usuarioString) {
    window.location.href = "../login/login.html";
    return;
  }

  const usuario = JSON.parse(usuarioString);

  // 2. Pintar datos del usuario
  document.getElementById("welcomeMessage").textContent =
    `Hola, ${usuario.Nombre || "Usuario"}`;
  document.getElementById("userRole").textContent = (
    usuario.Rol || "Sin Rol"
  ).toUpperCase();

  // 3. GENERAR SIDEBAR DINÁMICO SEGÚN PERMISOS
  const sidebar = document.querySelector(".nav-sidebar");
  sidebar.innerHTML = "";

  const permisosUsuario = usuario.permisos || [];

  menuDefinicion.forEach((item) => {
    if (permisosUsuario.includes(item.id)) {
      const activeClass = item.id === "dashboard" ? "active" : "";
      sidebar.innerHTML += `
                <li class="nav-item">
                    <a href="#" onclick="cargarModulo('${item.vista}', '${item.js}')" class="nav-link ${activeClass}">
                        <i class="nav-icon ${item.icono}"></i>
                        <p>${item.nombre}</p>
                    </a>
                </li>`;
    }
  });

  // 4. Configurar botón de cerrar sesión
  const btnCerrarSesion = document.getElementById("btnCerrarSesion");
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", () => {
      localStorage.removeItem("usuarioFoxGamers");
      window.location.href = "../login/login.html";
    });
  }

  cargarModulo(
    "../modules/inicio/inicio_vista.html",
    "../modules/inicio/inicio.js",
  );
});

// 5. MOTOR SPA
async function cargarModulo(urlHtml, urlJs = null) {
  const contenedor = document.getElementById("app-content");
  try {
    contenedor.innerHTML = `
            <div class="d-flex flex-column justify-content-center align-items-center" style="height: 70vh;">
                <i class="fas fa-spinner fa-spin fa-3x mb-3" style="color: var(--fox-cyan);"></i>
                <h5 class="text-muted font-weight-bold">Cargando interfaz...</h5>
            </div>`;

    const response = await fetch(urlHtml);
    if (!response.ok) throw new Error("No se encontró el archivo de la vista.");
    const html = await response.text();
    contenedor.innerHTML = html;

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
    console.error("Error del motor SPA:", error);
    contenedor.innerHTML = `<div class="alert alert-danger p-5 text-center">Error al cargar módulo</div>`;
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
