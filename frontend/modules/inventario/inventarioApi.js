const BASE_URL = "http://localhost:3000/api";

const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
const getAuthHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const getAuthHeadersJson = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export const inventarioApi = {
  obtenerInventario: async (termino = "") => {
    // Usamos cache-busting con timestamp igual que tu código original
    const urlBase =
      termino.trim() !== ""
        ? `${BASE_URL}/productos?q=${encodeURIComponent(termino)}`
        : `${BASE_URL}/productos`;
    const urlFresca =
      urlBase +
      (urlBase.includes("?") ? "&" : "?") +
      "t=" +
      new Date().getTime();
    const res = await fetch(urlFresca, {
      headers: { ...getAuthHeaders(), "Cache-Control": "no-cache" },
    });
    return await res.json();
  },

  obtenerProveedores: async () => {
    const res = await fetch(`${BASE_URL}/proveedores`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  ajustarStock: async (data) => {
    const res = await fetch(`${BASE_URL}/productos/ajuste`, {
      method: "POST",
      headers: getAuthHeadersJson(),
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  obtenerKardex: async (id) => {
    const urlFresca = `${BASE_URL}/productos/kardex/${id}?t=${new Date().getTime()}`;
    const res = await fetch(urlFresca, {
      headers: { ...getAuthHeaders(), "Cache-Control": "no-cache" },
    });
    return await res.json();
  },
};