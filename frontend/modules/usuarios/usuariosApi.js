const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const BASE_URL = `${API_URL}/api/usuarios`;
const PERFILES_URL = `${API_URL}/api/perfiles`;

const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
const getAuthHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const getAuthHeadersJson = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export const usuariosApi = {
  obtenerUsuarios: async () => {
    const res = await fetch(BASE_URL, { headers: getAuthHeaders() });
    return await res.json();
  },
  obtenerPerfiles: async () => {
    const res = await fetch(PERFILES_URL, { headers: getAuthHeaders() });
    return await res.json();
  },
  crearUsuario: async (data) => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: getAuthHeadersJson(),
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  actualizarUsuario: async (id, data) => {
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
  eliminarUsuario: async (id) => {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  },
};