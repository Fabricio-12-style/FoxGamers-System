const BASE_URL = "http://localhost:3000/api/perfiles";

const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
const getAuthHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const getAuthHeadersJson = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export const perfilesApi = {
  obtenerPerfiles: async () => {
    const res = await fetch(BASE_URL, { headers: getAuthHeaders() });
    return await res.json();
  },

  crearPerfil: async (data) => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: getAuthHeadersJson(),
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  actualizarPerfil: async (id, data) => {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PUT",
      headers: getAuthHeadersJson(),
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  cambiarEstado: async (id, estado) => {
    const res = await fetch(`${BASE_URL}/bloquear/${id}`, {
      method: "PUT",
      headers: getAuthHeadersJson(),
      body: JSON.stringify({ estado }),
    });
    return await res.json();
  },

  eliminarPerfil: async (id) => {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  obtenerPermisos: async (id) => {
    const res = await fetch(`${BASE_URL}/${id}`, { headers: getAuthHeaders() });
    return await res.json();
  },

  guardarPermisos: async (perfilId, modulos) => {
    const res = await fetch(`${BASE_URL}/guardar`, {
      method: "POST",
      headers: getAuthHeadersJson(),
      body: JSON.stringify({ perfilId, modulos }),
    });
    return await res.json();
  },
};