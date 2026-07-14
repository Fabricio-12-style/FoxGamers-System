// Archivo: frontend/modules/categorias/categoriasApi.js

const BASE_URL = "http://localhost:3000";

const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
const getAuthHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const getAuthHeadersJson = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export const categoriasApi = {
  obtenerCategorias: async (terminoBusqueda = "") => {
    const url =
      terminoBusqueda.trim() !== ""
        ? `${BASE_URL}/api/categorias?q=${encodeURIComponent(terminoBusqueda)}`
        : `${BASE_URL}/api/categorias`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    return await res.json();
  },

  crearCategoria: async (data) => {
    const res = await fetch(`${BASE_URL}/api/categorias`, {
      method: "POST",
      headers: getAuthHeadersJson(),
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  actualizarCategoria: async (id, data) => {
    const res = await fetch(`${BASE_URL}/api/categorias/${id}`, {
      method: "PUT",
      headers: getAuthHeadersJson(),
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  cambiarEstado: async (id, nuevoEstado) => {
    const res = await fetch(`${BASE_URL}/api/categorias/estado/${id}`, {
      method: "PATCH",
      headers: getAuthHeadersJson(),
      body: JSON.stringify({ nuevoEstado }),
    });
    return await res.json();
  },

  eliminarCategoria: async (id) => {
    const res = await fetch(`${BASE_URL}/api/categorias/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  },
};