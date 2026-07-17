const API = "http://localhost:3000/api";

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("tokenFoxGamers") || ""}`,
});
const getAuthHeadersJson = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("tokenFoxGamers") || ""}`,
});

export const descuentosApi = {
  obtenerDescuentos: async () =>
    await (
      await fetch(`${API}/descuentos`, { headers: getAuthHeaders() })
    ).json(),
  obtenerDescuentoById: async (id) =>
    await (
      await fetch(`${API}/descuentos/${id}`, { headers: getAuthHeaders() })
    ).json(),
  obtenerCategorias: async () =>
    await (
      await fetch(`${API}/categorias`, { headers: getAuthHeaders() })
    ).json(),
  buscarProductos: async (q) =>
    await (
      await fetch(`${API}/descuentos/buscar-producto?q=${q}`, {
        headers: getAuthHeaders(),
      })
    ).json(),
  guardarDescuento: async (payload, id = null) => {
    const url = id ? `${API}/descuentos/${id}` : `${API}/descuentos`;
    return await (
      await fetch(url, {
        method: id ? "PUT" : "POST",
        headers: getAuthHeadersJson(),
        body: JSON.stringify(payload),
      })
    ).json();
  },
  eliminarDescuento: async (id) =>
    await (
      await fetch(`${API}/descuentos/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
    ).json(),
};
