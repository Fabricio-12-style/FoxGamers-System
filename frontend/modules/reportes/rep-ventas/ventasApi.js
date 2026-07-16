const BASE_URL = "http://localhost:3000/api/reportes";

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("tokenFoxGamers")}`,
});

export const obtenerReporteVentas = async (
  fechaInicio,
  fechaFin,
  estado,
  metodoPago,
  busqueda,
) => {
  try {
    let url = `${BASE_URL}/general?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    if (estado) url += `&estado=${estado}`;
    if (metodoPago) url += `&metodoPago=${metodoPago}`;
    if (busqueda) url += `&busqueda=${encodeURIComponent(busqueda)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!res.ok) throw new Error("Error en la respuesta del servidor");
    return await res.json();
  } catch (error) {
    return { success: false, mensaje: "Error de conexión con el servidor." };
  }
};