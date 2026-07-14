const BASE_URL = "http://localhost:3000/api/clientes";

const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
const getAuthHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const getAuthHeadersJson = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export const clientesApi = {
  obtenerClientes: async (terminoBusqueda = "") => {
    const url =
      terminoBusqueda.trim() !== ""
        ? `${BASE_URL}?q=${encodeURIComponent(terminoBusqueda)}`
        : BASE_URL;
    const res = await fetch(url, { headers: getAuthHeaders() });
    return await res.json();
  },

  consultarDocumento: async (tipo, documento) => {
    const res = await fetch(
      `${BASE_URL}/consulta/${tipo.toLowerCase()}/${documento}`,
      { headers: getAuthHeaders() },
    );
    return await res.json();
  },

  crearCliente: async (data) => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: getAuthHeadersJson(),
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  actualizarCliente: async (id, data) => {
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

  eliminarCliente: async (id) => {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  },
};