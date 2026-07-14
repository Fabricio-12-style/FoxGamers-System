import { descuentosApi } from './descuentosApi.js';
import { descuentosState } from './descuentosState.js';

let descuentoEditandoId = null;
let debounceBuscador = null;

const inicializarModulo = async () => {
    const usuarioString = localStorage.getItem("usuarioFoxGamers");
    if (!usuarioString) return (window.location.href = "../../login/login.html");
    await listarDescuentos();
    configurarEventosBasicos();
};

function calcularEstado(d) {
    if (d.ModoControl === "FORZAR_OFF") return "forzado_off";
    if (d.Activo) return "activo";
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const ini = new Date(d.FechaInicio); ini.setHours(0, 0, 0, 0);
    const fin = new Date(d.FechaFin); fin.setHours(23, 59, 59, 999);
    if (hoy < ini) return "proximo";
    if (hoy > fin) return "expirado";
    return "inactivo";
}

function badgeEstado(estado) {
    const m = {
        activo: '<span class="badge" style="background:#d1fae5;color:#065f46;">Activo</span>',
        proximo: '<span class="badge" style="background:#cffafe;color:#164e63;">Próximo</span>',
        expirado: '<span class="badge badge-secondary">Expirado</span>',
        forzado_off: '<span class="badge" style="background:#fee2e2;color:#9f1239;">Forzado off</span>',
        inactivo: '<span class="badge badge-secondary">Inactivo</span>',
    };
    return m[estado] || "";
}

function renderizarTabla(datos) {
    const tabla = document.getElementById("tablaDescuentos");
    if (!tabla) return;
    tabla.innerHTML = "";
    if (datos.length === 0) {
        tabla.innerHTML = '<tr><td colspan="9" class="text-center py-4 font-weight-bold" style="color:var(--fox-text-gray);">No hay descuentos registrados.</td></tr>';
        return;
    }
    datos.forEach((d) => {
        const estado = calcularEstado(d);
        const rowStyle = ["expirado", "forzado_off", "inactivo"].includes(estado) ? "opacity:0.55;filter:grayscale(0.4);" : "";
        const tipoBadge = d.TipoDescuento === "PORCENTAJE" ? '<span class="badge" style="background:#fef3c7;color:#92400e;">%</span>' : '<span class="badge" style="background:#ede9fe;color:#4c1d95;">S/</span>';
        const aplicaTxt = d.AplicaA === "GENERAL" ? '<span class="badge badge-light border">General</span>' : d.AplicaA === "CATEGORIA" ? `<span class="badge badge-info">${d.NombreReferencia || "Categoría"}</span>` : `<span class="badge badge-warning" style="color:#000;">${d.NombreReferencia || "Producto"}</span>`;

        tabla.innerHTML += `
        <tr style="${rowStyle}">
            <td class="font-weight-bold" style="color:var(--fox-text-gray);">${d.DescuentoID}</td>
            <td class="text-left" style="padding-left:15px;">
                <span class="dato-critico">${d.Nombre}</span>
                ${d.Descripcion ? `<br><small style="color:var(--fox-text-gray);">${d.Descripcion}</small>` : ""}
            </td>
            <td>${tipoBadge}</td>
            <td>${d.TipoDescuento === "PORCENTAJE" ? `<span class="dato-critico">${parseFloat(d.Valor).toFixed(0)}%</span>` : `<span class="dato-critico">S/ ${parseFloat(d.Valor).toFixed(2)}</span>`}</td>
            <td>${aplicaTxt}</td>
            <td class="font-weight-bold" style="color:var(--fox-text-gray);font-size:0.82rem;">${new Date(d.FechaInicio).toLocaleDateString()} <br>→ ${new Date(d.FechaFin).toLocaleDateString()}</td>
            <td><span class="badge bg-light border">${d.ModoControl}</span></td>
            <td>${badgeEstado(estado)}</td>
            <td>
                <div class="btn-group">
                    <button onclick="prepararEdicionDsc(${d.DescuentoID})" class="btn btn-sm btn-fox mx-1" style="width:34px;height:34px;" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                    <button onclick="eliminarDescuento(${d.DescuentoID})" class="btn btn-sm btn-fox-danger mx-1" style="width:34px;height:34px;" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    });
}

async function listarDescuentos() {
    try {
        const data = await descuentosApi.obtenerDescuentos();
        descuentosState.setLista(data);
        aplicarFiltros();
        document.getElementById("totalDescuentos").textContent = data.length;
        document.getElementById("descuentosActivos").textContent = data.filter(d => d.Activo).length;
        document.getElementById("descuentosProximos").textContent = data.filter(d => calcularEstado(d) === "proximo").length;
    } catch (e) { console.error(e); }
}

function aplicarFiltros() {
    const txt = (document.getElementById("buscarDescuento")?.value || "").toLowerCase();
    const estado = document.getElementById("filtroEstado")?.value || "";
    const aplica = document.getElementById("filtroAplicaA")?.value || "";
    const filtrados = descuentosState.listaGlobal.filter(d => (!txt || d.Nombre.toLowerCase().includes(txt)) && (!estado || calcularEstado(d) === estado) && (!aplica || d.AplicaA === aplica));
    renderizarTabla(filtrados);
}

function configurarEventosBasicos() {
    ["buscarDescuento", "filtroEstado", "filtroAplicaA"].forEach(id => { document.getElementById(id)?.addEventListener("input", aplicarFiltros); });

    document.getElementById("dscTipo")?.addEventListener("change", (e) => {
        document.getElementById("labelValor").textContent = e.target.value === "PORCENTAJE" ? "%" : "S/";
    });

    document.getElementById("dscAplicaA")?.addEventListener("change", async (e) => {
        const val = e.target.value;
        const grupo = document.getElementById("grupoReferencia");
        const selectCat = document.getElementById("dscReferenciaCategoria");
        const boxProd = document.getElementById("boxBuscarProducto");
        const label = document.getElementById("labelReferencia");

        document.getElementById("dscReferenciaID_Oculto").value = "";

        if (val === "GENERAL") {
            grupo.style.display = "none";
        } else if (val === "CATEGORIA") {
            grupo.style.display = "";
            label.textContent = "Selecciona la Categoría *";
            selectCat.style.display = ""; boxProd.style.display = "none";
            const data = await descuentosApi.obtenerCategorias();
            selectCat.innerHTML = '<option value="">-- Seleccionar Categoría --</option>' + data.filter(c => c.Activo).map(c => `<option value="${c.CategoriaID}">${c.Nombre}</option>`).join("");
        } else if (val === "PRODUCTO") {
            grupo.style.display = "";
            label.textContent = "Busca el Producto *";
            selectCat.style.display = "none"; boxProd.style.display = "";
            document.getElementById("inputBuscarProdDsc").value = "";
        }
    });

    // 🚀 LÓGICA DEL BUSCADOR AUTOCOMPLETADO
    document.getElementById("inputBuscarProdDsc")?.addEventListener("input", (e) => {
        clearTimeout(debounceBuscador);
        const q = e.target.value.trim();
        const box = document.getElementById("resultadosProdDsc");
        document.getElementById("dscReferenciaID_Oculto").value = "";

        if (q.length < 2) { box.style.display = "none"; return; }

        debounceBuscador = setTimeout(async () => {
            const res = await descuentosApi.buscarProductos(q);
            box.innerHTML = "";
            if (res.length === 0) {
                box.innerHTML = '<div class="list-group-item text-muted text-center py-3">No se encontraron productos</div>';
            } else {
                res.forEach(p => {
                    const a = document.createElement("a");
                    a.href = "#";
                    a.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2";
                    a.innerHTML = `<div><strong>${p.Nombre}</strong><br><small class="text-muted">Cod: ${p.Codigo}</small></div><span class="badge badge-success">S/ ${p.PrecioVenta.toFixed(2)}</span>`;
                    a.onclick = (ev) => {
                        ev.preventDefault();
                        document.getElementById("dscReferenciaID_Oculto").value = p.ProductoID;
                        document.getElementById("inputBuscarProdDsc").value = p.Nombre;
                        box.style.display = "none";
                    };
                    box.appendChild(a);
                });
            }
            box.style.display = "block";
        }, 300);
    });

    // Cerrar buscador al hacer clic afuera
    document.addEventListener("click", (e) => {
        if (!e.target.closest("#boxBuscarProducto")) document.getElementById("resultadosProdDsc").style.display = "none";
    });

    document.getElementById("dscReferenciaCategoria")?.addEventListener("change", (e) => {
        document.getElementById("dscReferenciaID_Oculto").value = e.target.value;
    });

    document.getElementById("btnCrearDescuentoModal")?.addEventListener("click", () => {
        descuentoEditandoId = null;
        document.getElementById("tituloModalDescuento").textContent = "Nuevo Descuento";
        limpiarFormulario();
        $("#modalDescuento").modal("show");
    });

    document.getElementById("formDescuento")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const aplicaA = document.getElementById("dscAplicaA").value;
        const refID = document.getElementById("dscReferenciaID_Oculto").value;

        if (aplicaA !== 'GENERAL' && !refID) {
            return Swal.fire("Aviso", "Por favor, selecciona correctamente el producto o categoría de la lista.", "warning");
        }

        const payload = {
            Nombre: document.getElementById("dscNombre").value.trim(),
            Descripcion: document.getElementById("dscDescripcion").value.trim(),
            TipoDescuento: document.getElementById("dscTipo").value,
            Valor: parseFloat(document.getElementById("dscValor").value),
            FechaInicio: document.getElementById("dscFechaInicio").value,
            FechaFin: document.getElementById("dscFechaFin").value,
            AplicaA: aplicaA,
            ReferenciaID: aplicaA !== "GENERAL" ? parseInt(refID) : null,
            ModoControl: document.getElementById("dscModoControl").value,
        };

        if (descuentosState.existeConflicto(payload, descuentoEditandoId)) {
            return Swal.fire({ icon: "error", title: "Cruce de Fechas", text: "Ya existe un descuento vigente para este Producto/Categoría en el rango de fechas seleccionado." });
        }

        try {
            const data = await descuentosApi.guardarDescuento(payload, descuentoEditandoId);
            if (!data.success) return Swal.fire({ icon: "error", title: "Error", text: data.mensaje });

            Swal.fire({ icon: "success", title: "¡Listo!", text: data.mensaje, timer: 1800, showConfirmButton: false });
            $("#modalDescuento").modal("hide");
            listarDescuentos();
        } catch { Swal.fire({ icon: "error", title: "Error", text: "No se pudo conectar con el servidor." }); }
    });
}

function limpiarFormulario() {
    ["dscNombre", "dscValor", "dscDescripcion", "dscReferenciaID_Oculto", "inputBuscarProdDsc"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    document.getElementById("dscTipo").value = "";
    document.getElementById("dscAplicaA").value = "GENERAL";
    document.getElementById("grupoReferencia").style.display = "none";
    document.getElementById("labelValor").textContent = "%";
    const toISO = (d) => d.toISOString().split("T")[0];
    const hoy = new Date(), fin = new Date(); fin.setDate(hoy.getDate() + 30);
    document.getElementById("dscFechaInicio").value = toISO(hoy);
    document.getElementById("dscFechaFin").value = toISO(fin);
    window.seleccionarModo("AUTO");
}

window.seleccionarModo = (modo) => {
    const configs = { AUTO: { border: "#00d2ff", bg: "#f0fdff", icon: "#0891b2" }, FORZAR_ON: { border: "#10b981", bg: "#f0fdf4", icon: "#10b981" }, FORZAR_OFF: { border: "#ef4444", bg: "#fef2f2", icon: "#ef4444" } };
    ["AUTO", "FORZAR_ON", "FORZAR_OFF"].forEach((m) => {
        const card = document.getElementById(`card-${m}`);
        if (!card) return;
        if (m === modo) { card.style.borderColor = configs[m].border; card.style.background = configs[m].bg; card.querySelector("i").style.color = configs[m].icon; }
        else { card.style.borderColor = "#e2e8f0"; card.style.background = "#fff"; card.querySelector("i").style.color = "#94a3b8"; }
    });
    document.getElementById("dscModoControl").value = modo;
};

window.prepararEdicionDsc = async (id) => {
    try {
        const d = await descuentosApi.obtenerDescuentoById(id);
        descuentoEditandoId = id;
        document.getElementById("tituloModalDescuento").textContent = "Editar Descuento";
        document.getElementById("dscNombre").value = d.Nombre;
        document.getElementById("dscTipo").value = d.TipoDescuento;
        document.getElementById("dscValor").value = d.Valor;
        document.getElementById("dscDescripcion").value = d.Descripcion || "";
        document.getElementById("labelValor").textContent = d.TipoDescuento === "PORCENTAJE" ? "%" : "S/";
        document.getElementById("dscFechaInicio").value = new Date(d.FechaInicio).toISOString().split("T")[0];
        document.getElementById("dscFechaFin").value = new Date(d.FechaFin).toISOString().split("T")[0];

        const aplicaSelect = document.getElementById("dscAplicaA");
        aplicaSelect.value = d.AplicaA;

        // Simular el cambio para que aparezcan los cuadros correctos
        aplicaSelect.dispatchEvent(new Event('change'));

        setTimeout(() => {
            document.getElementById("dscReferenciaID_Oculto").value = d.ReferenciaID || "";
            if (d.AplicaA === "CATEGORIA") {
                document.getElementById("dscReferenciaCategoria").value = d.ReferenciaID || "";
            } else if (d.AplicaA === "PRODUCTO") {
                document.getElementById("inputBuscarProdDsc").value = d.NombreReferencia || "";
            }
        }, 300); // Pequeña espera para que cargue la lista de categorías si es necesario

        window.seleccionarModo(d.ModoControl || "AUTO");
        $("#modalDescuento").modal("show");
    } catch (e) { console.error(e); }
};

window.eliminarDescuento = async (id) => {
    const c = await Swal.fire({ title: "¿Eliminar descuento?", text: "Esta acción no se puede deshacer.", icon: "warning", showCancelButton: true, confirmButtonText: "Sí, eliminar", confirmButtonColor: "var(--fox-red)" });
    if (!c.isConfirmed) return;
    try {
        const data = await descuentosApi.eliminarDescuento(id);
        if (!data.success) return Swal.fire({ icon: "error", title: "Error", text: data.mensaje });
        Swal.fire({ icon: "success", title: "Eliminado", text: data.mensaje, timer: 1600, showConfirmButton: false });
        listarDescuentos();
    } catch { Swal.fire({ icon: "error", title: "Error", text: "No se pudo conectar." }); }
};

inicializarModulo();