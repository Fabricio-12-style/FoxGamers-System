const API_URL = "http://localhost:3000/api/config-web";

const getToken = () => localStorage.getItem("tokenFoxGamers") || "";
const getAuthHeaders = () => ({ "Authorization": `Bearer ${getToken()}` });
const getAuthHeadersJson = () => ({ 
    "Content-Type": "application/json", 
    "Authorization": `Bearer ${getToken()}` 
});

export const configApi = {
    obtenerPublica: async () => {
        const res = await fetch(`${API_URL}/publica`);
        return await res.json();
    },
    
    subirLogo: async (formData) => {
        const res = await fetch(`${API_URL}/logo`, { method: "POST", headers: getAuthHeaders(), body: formData });
        return await res.json();
    },
    activarLogo: async (id) => {
        const res = await fetch(`${API_URL}/logo/activo/${id}`, { method: "PUT", headers: getAuthHeaders() });
        return await res.json();
    },
    eliminarLogo: async (id) => {
        const res = await fetch(`${API_URL}/logo/${id}`, { method: "DELETE", headers: getAuthHeaders() });
        return await res.json();
    },

    crearSlider: async (formData) => {
        const res = await fetch(`${API_URL}/slider`, { method: "POST", headers: getAuthHeaders(), body: formData });
        return await res.json();
    },
    actualizarSlider: async (id, formData) => {
        const res = await fetch(`${API_URL}/slider/${id}`, { method: "PUT", headers: getAuthHeaders(), body: formData });
        return await res.json();
    },
    cambiarEstadoSlider: async (id, estado) => {
        const res = await fetch(`${API_URL}/slider/estado/${id}`, { method: "PUT", headers: getAuthHeadersJson(), body: JSON.stringify({ estado }) });
        return await res.json();
    },
    eliminarSlider: async (id) => {
        const res = await fetch(`${API_URL}/slider/${id}`, { method: "DELETE", headers: getAuthHeaders() });
        return await res.json();
    }
};