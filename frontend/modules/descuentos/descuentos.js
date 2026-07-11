(() => {
  const API = "http://localhost:3000/api";
  let descuentoEditandoId = null;
  let listaDescuentosGlobal = [];

  // INYECCIÓN DE SEGURIDAD
  const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
  const authHeaders = { Authorization: `Bearer ${getToken()}` };
  const authHeadersJson = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const usuarioString = localStorage.getItem("usuarioFoxGamers");
  if (!usuarioString) return (window.location.href = "../../login/login.html");

  listarDescuentos();

  // ── HELPERS ──────────────────────────────────────────────

  function calcularEstado(d) {
    if (d.ModoControl === "FORZAR_OFF") return "forzado_off";
    if (d.Activo) return "activo";
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ini = new Date(d.FechaInicio);
    ini.setHours(0, 0, 0, 0);
    const fin = new Date(d.FechaFin);
    fin.setHours(23, 59, 59, 999);
    if (hoy < ini) return "proximo";
    if (hoy > fin) return "expirado";
    return "inactivo";
  }

  function badgeEstado(estado) {
    const m = {
      activo:
        '<span class="badge" style="background:#d1fae5;color:#065f46;">Activo</span>',
      proximo:
        '<span class="badge" style="background:#cffafe;color:#164e63;">Próximo</span>',
      expirado: '<span class="badge badge-secondary">Expirado</span>',
      forzado_off:
        '<span class="badge" style="background:#fee2e2;color:#9f1239;">Forzado off</span>',
      inactivo: '<span class="badge badge-secondary">Inactivo</span>',
    };
    return m[estado] || "";
  }

  function badgeModo(modo) {
    const m = {
      AUTO: '<span class="badge" style="background:#cffafe;color:#164e63;"><i class="fas fa-calendar-alt mr-1"></i>Auto</span>',
      FORZAR_ON:
        '<span class="badge" style="background:#d1fae5;color:#065f46;"><i class="fas fa-play-circle mr-1"></i>Forzado on</span>',
      FORZAR_OFF:
        '<span class="badge" style="background:#fee2e2;color:#9f1239;"><i class="fas fa-stop-circle mr-1"></i>Forzado off</span>',
    };
    return m[modo] || "";
  }

  function formatFecha(f) {
    if (!f) return "-";
    return new Date(f).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatValor(tipo, valor) {
    return tipo === "PORCENTAJE"
      ? `<span class="dato-critico">${parseFloat(valor).toFixed(0)}%</span>`
      : `<span class="dato-critico">S/ ${parseFloat(valor).toFixed(2)}</span>`;
  }

  // ── TABLA ─────────────────────────────────────────────────

  function renderizarTabla(datos) {
    const tabla = document.getElementById("tablaDescuentos");
    if (!tabla) return;
    tabla.innerHTML = "";
    if (datos.length === 0) {
      tabla.innerHTML =
        '<tr><td colspan="9" class="text-center py-4 font-weight-bold" style="color:var(--fox-text-gray);">No hay descuentos registrados.</td></tr>';
      return;
    }
    datos.forEach((d) => {
      const estado = calcularEstado(d);
      const rowStyle = ["expirado", "forzado_off", "inactivo"].includes(estado)
        ? "opacity:0.55;filter:grayscale(0.4);"
        : "";
      const tipoBadge =
        d.TipoDescuento === "PORCENTAJE"
          ? '<span class="badge" style="background:#fef3c7;color:#92400e;">%</span>'
          : '<span class="badge" style="background:#ede9fe;color:#4c1d95;">S/</span>';
      const aplicaTxt =
        d.AplicaA === "GENERAL"
          ? '<span class="badge badge-light border">General</span>'
          : d.AplicaA === "CATEGORIA"
            ? `<span class="badge badge-info">${d.NombreReferencia || "Categoría"}</span>`
            : `<span class="badge badge-warning" style="color:#000;">${d.NombreReferencia || "Producto"}</span>`;

      tabla.innerHTML += `
        <tr style="${rowStyle}">
          <td class="font-weight-bold" style="color:var(--fox-text-gray);">${d.DescuentoID}</td>
          <td class="text-left" style="padding-left:15px;">
            <span class="dato-critico">${d.Nombre}</span>
            ${d.Descripcion ? `<br><small style="color:var(--fox-text-gray);">${d.Descripcion}</small>` : ""}
          </td>
          <td>${tipoBadge}</td>
          <td>${formatValor(d.TipoDescuento, d.Valor)}</td>
          <td>${aplicaTxt}</td>
          <td class="font-weight-bold" style="color:var(--fox-text-gray);font-size:0.82rem;">
            ${formatFecha(d.FechaInicio)}<br>→ ${formatFecha(d.FechaFin)}
          </td>
          <td>${badgeModo(d.ModoControl)}</td>
          <td>${badgeEstado(estado)}</td>
          <td>
            <div class="btn-group">
              <button onclick="prepararEdicionDsc(${d.DescuentoID})"
                class="btn btn-sm btn-fox mx-1" style="width:34px;height:34px;" title="Editar">
                <i class="fas fa-pencil-alt"></i>
              </button>
              <button onclick="eliminarDescuento(${d.DescuentoID})"
                class="btn btn-sm btn-fox-danger mx-1" style="width:34px;height:34px;" title="Eliminar">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>`;
    });
  }

  function actualizarResumen(datos) {
    document.getElementById("totalDescuentos").textContent = datos.length;
    document.getElementById("descuentosActivos").textContent = datos.filter(
      (d) => d.Activo,
    ).length;
    document.getElementById("descuentosProximos").textContent = datos.filter(
      (d) => calcularEstado(d) === "proximo",
    ).length;
  }

  // ── CARGAR DATOS ──────────────────────────────────────────

  async function listarDescuentos() {
    try {
      const res = await fetch(`${API}/descuentos`, { headers: authHeaders });
      listaDescuentosGlobal = await res.json();
      renderizarTabla(listaDescuentosGlobal);
      actualizarResumen(listaDescuentosGlobal);
    } catch (e) {
      console.error(e);
    }
  }

  // ── FILTROS ───────────────────────────────────────────────

  function aplicarFiltros() {
    const txt = (
      document.getElementById("buscarDescuento")?.value || ""
    ).toLowerCase();
    const estado = document.getElementById("filtroEstado")?.value || "";
    const aplica = document.getElementById("filtroAplicaA")?.value || "";
    renderizarTabla(
      listaDescuentosGlobal.filter(
        (d) =>
          (!txt || d.Nombre.toLowerCase().includes(txt)) &&
          (!estado || calcularEstado(d) === estado) &&
          (!aplica || d.AplicaA === aplica),
      ),
    );
  }

  ["buscarDescuento", "filtroEstado", "filtroAplicaA"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", aplicarFiltros);
  });

  // ── CONTROL DE MODO ───────────────────────────────────────

  window.seleccionarModo = (modo) => {
    const configs = {
      AUTO: {
        border: "#00d2ff",
        bg: "#f0fdff",
        icon: "#0891b2",
        infoBg: "#fffbeb",
        infoBorder: "#fcd34d",
        infoColor: "#92400e",
        msg: "El sistema activará y desactivará este descuento automáticamente según las fechas configuradas.",
      },
      FORZAR_ON: {
        border: "#10b981",
        bg: "#f0fdf4",
        icon: "#10b981",
        infoBg: "#f0fdf4",
        infoBorder: "#6ee7b7",
        infoColor: "#065f46",
        msg: "El descuento se mantendrá siempre activo sin importar las fechas.",
      },
      FORZAR_OFF: {
        border: "#ef4444",
        bg: "#fef2f2",
        icon: "#ef4444",
        infoBg: "#fef2f2",
        infoBorder: "#fca5a5",
        infoColor: "#9f1239",
        msg: "El descuento se mantendrá siempre inactivo. El sistema no lo activará aunque esté en fechas.",
      },
    };
    ["AUTO", "FORZAR_ON", "FORZAR_OFF"].forEach((m) => {
      const card = document.getElementById(`card-${m}`);
      if (!card) return;
      if (m === modo) {
        card.style.borderColor = configs[m].border;
        card.style.background = configs[m].bg;
        card.querySelector("i").style.color = configs[m].icon;
      } else {
        card.style.borderColor = "#e2e8f0";
        card.style.background = "#fff";
        card.querySelector("i").style.color = "#94a3b8";
      }
    });
    document.getElementById("dscModoControl").value = modo;
    const box = document.getElementById("dscModoInfo");
    if (box) {
      const c = configs[modo];
      box.style.background = c.infoBg;
      box.style.borderColor = c.infoBorder;
      box.style.color = c.infoColor;
      box.innerHTML = `<i class="fas fa-info-circle mr-1"></i>${c.msg}`;
    }
  };

  // ── OPCIONES DE REFERENCIA ────────────────────────────────

  async function cargarOpciones(tipo) {
    const sel = document.getElementById("dscReferenciaID");
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleccionar --</option>';
    try {
      const endpoint = tipo === "CATEGORIA" ? "/categorias" : "/productos";
      const data = await (
        await fetch(`${API}${endpoint}`, { headers: authHeaders })
      ).json();
      if (tipo === "CATEGORIA") {
        data
          .filter((c) => c.Activo)
          .forEach((c) => {
            sel.innerHTML += `<option value="${c.CategoriaID}">${c.Nombre}</option>`;
          });
      } else {
        data.forEach((p) => {
          sel.innerHTML += `<option value="${p.ProductoID}">${p.Nombre}</option>`;
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  // ── EVENTOS DEL FORMULARIO ────────────────────────────────

  document.getElementById("dscTipo")?.addEventListener("change", () => {
    const label = document.getElementById("labelValor");
    if (label)
      label.textContent =
        document.getElementById("dscTipo").value === "PORCENTAJE" ? "%" : "S/";
  });

  document.getElementById("dscAplicaA")?.addEventListener("change", () => {
    const val = document.getElementById("dscAplicaA").value;
    const grupo = document.getElementById("grupoReferencia");
    const label = document.getElementById("labelReferencia");
    if (val !== "GENERAL") {
      grupo.style.display = "";
      label.textContent = val === "CATEGORIA" ? "Categoría *" : "Producto *";
      cargarOpciones(val);
    } else {
      grupo.style.display = "none";
    }
  });

  // ── LIMPIAR FORMULARIO ────────────────────────────────────

  function limpiarFormulario() {
    ["dscNombre", "dscValor", "dscDescripcion"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    document.getElementById("dscTipo").value = "";
    document.getElementById("dscAplicaA").value = "GENERAL";
    document.getElementById("grupoReferencia").style.display = "none";
    document.getElementById("labelValor").textContent = "%";
    const toISO = (d) => d.toISOString().split("T")[0];
    const hoy = new Date(),
      fin = new Date();
    fin.setDate(hoy.getDate() + 30);
    document.getElementById("dscFechaInicio").value = toISO(hoy);
    document.getElementById("dscFechaFin").value = toISO(fin);
    seleccionarModo("AUTO");
  }

  // ── ABRIR MODAL CREAR ─────────────────────────────────────

  document
    .getElementById("btnCrearDiscountModal")
    ?.addEventListener("click", () => {
      descuentoEditandoId = null;
      document.getElementById("tituloModalDescuento").textContent =
        "Nuevo Descuento";
      limpiarFormulario();
      $("#modalDescuento").modal("show");
    });

  // ── EDITAR ────────────────────────────────────────────────

  window.prepararEdicionDsc = async (id) => {
    try {
      const d = await (
        await fetch(`${API}/descuentos/${id}`, { headers: authHeaders })
      ).json();
      if (!d || d.success === false) return;
      descuentoEditandoId = id;
      document.getElementById("tituloModalDescuento").textContent =
        "Editar Descuento";
      document.getElementById("dscNombre").value = d.Nombre;
      document.getElementById("dscTipo").value = d.TipoDescuento;
      document.getElementById("dscValor").value = d.Valor;
      document.getElementById("dscDescripcion").value = d.Descripcion || "";
      document.getElementById("labelValor").textContent =
        d.TipoDescuento === "PORCENTAJE" ? "%" : "S/";
      const toISO = (s) => new Date(s).toISOString().split("T")[0];
      document.getElementById("dscFechaInicio").value = toISO(d.FechaInicio);
      document.getElementById("dscFechaFin").value = toISO(d.FechaFin);
      document.getElementById("dscAplicaA").value = d.AplicaA;
      const grupo = document.getElementById("grupoReferencia");
      if (d.AplicaA !== "GENERAL") {
        grupo.style.display = "";
        document.getElementById("labelReferencia").textContent =
          d.AplicaA === "CATEGORIA" ? "Categoría *" : "Producto *";
        await cargarOpciones(d.AplicaA);
        document.getElementById("dscReferenciaID").value = d.ReferenciaID || "";
      } else {
        grupo.style.display = "none";
      }
      seleccionarModo(d.ModoControl || "AUTO");
      $("#modalDescuento").modal("show");
    } catch (e) {
      console.error(e);
    }
  };

  // ── GUARDAR ───────────────────────────────────────────────

  document
    .getElementById("formDescuento")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const aplicaA = document.getElementById("dscAplicaA").value;
      const refID = document.getElementById("dscReferenciaID").value;
      const payload = {
        Nombre: document.getElementById("dscNombre").value.trim(),
        Descripcion: document.getElementById("dscDescripcion").value.trim(),
        TipoDescuento: document.getElementById("dscTipo").value,
        Valor: parseFloat(document.getElementById("dscValor").value),
        FechaInicio: document.getElementById("dscFechaInicio").value,
        FechaFin: document.getElementById("dscFechaFin").value,
        AplicaA: aplicaA,
        ReferenciaID: aplicaA !== "GENERAL" && refID ? parseInt(refID) : null,
        ModoControl: document.getElementById("dscModoControl").value,
      };
      const url = descuentoEditandoId
        ? `${API}/descuentos/${descuentoEditandoId}`
        : `${API}/descuentos`;
      const method = descuentoEditandoId ? "PUT" : "POST";
      try {
        const res = await fetch(url, {
          method,
          headers: authHeadersJson,
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success)
          return Swal.fire({
            icon: "error",
            title: "Error",
            text: data.mensaje,
          });
        Swal.fire({
          icon: "success",
          title: "¡Listo!",
          text: data.mensaje,
          timer: 1800,
          showConfirmButton: false,
        });
        $("#modalDescuento").modal("hide");
        listarDescuentos();
      } catch {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo conectar con el servidor.",
        });
      }
    });

  // ── ELIMINAR ──────────────────────────────────────────────

  window.eliminarDescuento = async (id) => {
    const c = await Swal.fire({
      title: "¿Eliminar descuento?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "var(--fox-red)",
    });
    if (!c.isConfirmed) return;
    try {
      const data = await (
        await fetch(`${API}/descuentos/${id}`, {
          method: "DELETE",
          headers: authHeaders,
        })
      ).json();
      if (!data.success)
        return Swal.fire({ icon: "error", title: "Error", text: data.mensaje });
      Swal.fire({
        icon: "success",
        title: "Eliminado",
        text: data.mensaje,
        timer: 1600,
        showConfirmButton: false,
      });
      listarDescuentos();
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo conectar.",
      });
    }
  };
})();