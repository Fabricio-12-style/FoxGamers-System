const repository = require("../repositories/proveedorRepository");

const regexRUC = /^\d{11}$/;
const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ProveedorService {
  async listar() {
    return await repository.listar();
  }

  validarDatos(data) {
    if (!data.RUC || !regexRUC.test(data.RUC)) {
      throw new Error(
        "El RUC debe estar compuesto exactamente por 11 números.",
      );
    }
    if (
      data.Correo &&
      data.Correo.trim() !== "" &&
      !regexCorreo.test(data.Correo)
    ) {
      throw new Error("El formato del correo electrónico es incorrecto.");
    }
    if (!data.RazonSocial || data.RazonSocial.trim() === "") {
      throw new Error("La Razón Social es obligatoria.");
    }
  }

  async crearProveedor(data) {
    this.validarDatos(data);
    await repository.crear(data);
  }

  async actualizarProveedor(id, data) {
    this.validarDatos(data);
    await repository.actualizar(id, data);
  }

  async alternarEstado(id, estado) {
    await repository.cambiarEstado(id, estado);
  }

  async eliminarProveedor(id) {
    try {
      await repository.eliminar(id);
    } catch (error) {
      if (error.number === 547) {
        throw new Error(
          "No se puede eliminar este proveedor porque ya tiene compras o productos vinculados. Considere desactivarlo para mantener el historial.",
        );
      }
      throw new Error("Error interno al intentar eliminar el proveedor.");
    }
  }

  async consultarRUC(ruc) {
    if (!regexRUC.test(ruc))
      throw new Error("El RUC debe tener exactamente 11 números.");

    const token = process.env.DECOLECTA_TOKEN;
    const url = `https://api.decolecta.com/v1/sunat/ruc?numero=${ruc}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    const dataApi = await response.json();

    if (!response.ok) {
      throw new Error(
        dataApi.message || "RUC no válido o error de API externa.",
      );
    }

    const payload = dataApi.data ? dataApi.data : dataApi;
    return {
      razonSocial:
        payload.razon_social ||
        payload.company_name ||
        payload.nombre_o_razon_social ||
        "Nombre no disponible",
      direccion:
        payload.address ||
        payload.direccion ||
        payload.domicilio_fiscal ||
        payload.direccion_completa ||
        "",
    };
  }
}

module.exports = new ProveedorService();