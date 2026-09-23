const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const BASE_URL = `${API_URL}/api/reportes`;

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("tokenFoxGamers")}`,
});

export const obtenerFlujoCaja = async (fecha, usuarioId) => {
  try {
    let url = `${BASE_URL}/flujo-caja?fecha=${fecha}`;
    if (usuarioId) url += `&usuarioId=${usuarioId}`;

    const res = await fetch(url, { method: "GET", headers: getHeaders() });
    if (!res.ok) throw new Error("Error en el servidor");
    return await res.json();
  } catch (error) {
    return { success: false, mensaje: "Error de conexión." };
  }
};