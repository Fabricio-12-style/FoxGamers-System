const BASE_URL = "http://localhost:3000/api/productos";
const CAT_URL = "http://localhost:3000/api/categorias";

const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
const getAuthHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const getAuthHeadersJson = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export const productosApi = {
  obtenerCategorias: async () => {
    const res = await fetch(`${CAT_URL}/activas`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  },
  obtenerProductos: async (termino = "") => {
    const url =
      termino.trim() !== ""
        ? `${BASE_URL}?q=${encodeURIComponent(termino)}`
        : BASE_URL;
    const res = await fetch(url, { headers: getAuthHeaders() });
    return await res.json();
  },
  crearProducto: async (formData) => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });
    return await res.json();
  },
  actualizarProducto: async (id, formData) => {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: formData,
    });
    return await res.json();
  },
  cambiarEstado: async (id, nuevoEstado) => {
    const res = await fetch(`${BASE_URL}/estado/${id}`, {
      method: "PATCH",
      headers: getAuthHeadersJson(),
      body: JSON.stringify({ nuevoEstado }),
    });
    return await res.json();
  },
  eliminarProducto: async (id) => {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  },
};
