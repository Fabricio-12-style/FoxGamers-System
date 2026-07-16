const BASE_URL = "http://localhost:3000/api/reportes";

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("tokenFoxGamers")}`,
});

export const obtenerReporteInventario = async (
  fechaInicio,
  fechaFin,
  categoriaId,
  estadoStock,
  busqueda,
) => {
  try {
    let url = `${BASE_URL}/inventario?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    if (categoriaId) url += `&categoriaId=${categoriaId}`;
    if (estadoStock) url += `&estadoStock=${estadoStock}`;
    if (busqueda) url += `&busqueda=${encodeURIComponent(busqueda)}`;

    const res = await fetch(url, { method: "GET", headers: getHeaders() });
    if (!res.ok) throw new Error("Error en el servidor");
    return await res.json();
  } catch (error) {
    return { success: false, mensaje: "Error de conexión." };
  }
};