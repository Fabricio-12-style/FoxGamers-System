const BASE_URL = "http://localhost:3000/api/proveedores";

const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
const getAuthHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const getAuthHeadersJson = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export const proveedoresApi = {
  obtenerProveedores: async () => {
    const res = await fetch(BASE_URL, { headers: getAuthHeaders() });
    return await res.json();
  },

  consultarRUC: async (ruc) => {
    const res = await fetch(`${BASE_URL}/consulta/${ruc}`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  crearProveedor: async (data) => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: getAuthHeadersJson(),
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  actualizarProveedor: async (id, data) => {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PUT",
      headers: getAuthHeadersJson(),
      body: JSON.stringify(data),
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

  eliminarProveedor: async (id) => {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  },
};