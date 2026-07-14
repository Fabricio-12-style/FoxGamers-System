const BASE_URL = "http://localhost:3000/api/empresa";
const API_CLIENTES_URL = "http://localhost:3000/api/clientes";

const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
const getAuthHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const getAuthHeadersJson = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export const empresaApi = {
  obtenerEmpresa: async () => {
    const res = await fetch(`${BASE_URL}/publica`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  consultarRucSunat: async (ruc) => {
    const res = await fetch(`${API_CLIENTES_URL}/consultar/ruc/${ruc}`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  guardarEmpresa: async (datosEmpresa) => {
    const res = await fetch(`${BASE_URL}/guardar`, {
      method: "POST",
      headers: getAuthHeadersJson(),
      body: JSON.stringify(datosEmpresa),
    });
    return await res.json();
  },
};