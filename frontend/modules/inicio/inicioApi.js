const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const BASE_URL = `${API_URL}/api/dashboard`;

const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
const getAuthHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

export const inicioApi = {
  obtenerResumen: async () => {
    const res = await fetch(`${BASE_URL}/resumen`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  },
};