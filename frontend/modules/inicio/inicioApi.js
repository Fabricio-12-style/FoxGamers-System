const BASE_URL = "http://localhost:3000/api/dashboard";

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