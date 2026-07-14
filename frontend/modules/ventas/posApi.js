const BASE_URL = "http://localhost:3000/api";

const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
const getHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const getHeadersJson = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export const posApi = {
  obtenerDatosEmpresa: async () =>
    await (await fetch(`${BASE_URL}/empresa/publica`)).json(),
  obtenerConfigWeb: async () =>
    await (await fetch(`${BASE_URL}/config-web/publica`)).json(),
  obtenerProductosPOS: async () =>
    await (
      await fetch(`${BASE_URL}/productos/pos?t=${new Date().getTime()}`, {
        headers: getHeaders(),
      })
    ).json(),
  obtenerDescuentos: async () =>
    await (
      await fetch(`${BASE_URL}/descuentos/vigentes?t=${new Date().getTime()}`, {
        headers: getHeaders(),
      })
    ).json(),

  buscarCliente: async (q) =>
    await (
      await fetch(`${BASE_URL}/clientes/buscar?q=${q}`, {
        headers: getHeaders(),
      })
    ).json(),
  consultarDniRuc: async (tipo, doc) =>
    await (
      await fetch(`${BASE_URL}/clientes/consultar/${tipo}/${doc}`, {
        headers: getHeaders(),
      })
    ).json(),

  finalizarVenta: async (data) =>
    await (
      await fetch(`${BASE_URL}/ventas/finalizar`, {
        method: "POST",
        headers: getHeadersJson(),
        body: JSON.stringify(data),
      })
    ).json(),
  obtenerVentas: async (q = "") =>
    await (
      await fetch(
        `${BASE_URL}/ventas${q ? `?q=${encodeURIComponent(q)}` : ""}`,
        { headers: getHeaders() },
      )
    ).json(),
  obtenerDetalleVenta: async (id) =>
    await (
      await fetch(`${BASE_URL}/ventas/${id}`, { headers: getHeaders() })
    ).json(),
  anularVenta: async (id, uid) =>
    await (
      await fetch(`${BASE_URL}/ventas/anular/${id}`, {
        method: "PATCH",
        headers: getHeadersJson(),
        body: JSON.stringify({ UsuarioID: uid }),
      })
    ).json(),
  enviarTicket: async (id, correo) =>
    await (
      await fetch(`${BASE_URL}/ventas/enviar-ticket/${id}`, {
        method: "POST",
        headers: getHeadersJson(),
        body: JSON.stringify({ correoDestino: correo }),
      })
    ).json(),
};
