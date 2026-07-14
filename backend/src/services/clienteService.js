const repository = require("../repositories/clienteRepository");

const regexDNI = /^\d{8}$/;
const regexRUC = /^\d{11}$/;
const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ClienteService {
  async listar(terminoBusqueda) {
    return await repository.listar(terminoBusqueda);
  }

  async buscarLigeroPOS(terminoBusqueda) {
    return await repository.buscarLigeroPOS(terminoBusqueda);
  }

  validarDatos(data) {
    if (data.TipoDocumento === "DNI" && !regexDNI.test(data.Documento))
      throw new Error("DNI inválido. Deben ser 8 números.");
    if (data.TipoDocumento === "RUC" && !regexRUC.test(data.Documento))
      throw new Error("RUC inválido. Deben ser 11 números.");
    if (
      data.Correo &&
      data.Correo.trim() !== "" &&
      !regexCorreo.test(data.Correo)
    )
      throw new Error("Formato de correo electrónico no válido.");
    if (!data.NombreRazonSocial || data.NombreRazonSocial.trim() === "")
      throw new Error("El Nombre o Razón Social es obligatorio.");
  }

  async crearCliente(data) {
    this.validarDatos(data);
    const existe = await repository.buscarPorDocumento(data.Documento);
    if (existe) throw new Error("Este número de documento ya está registrado.");
    await repository.crear(data);
  }

  async actualizarCliente(id, data) {
    this.validarDatos(data);
    const existe = await repository.buscarPorDocumento(data.Documento, id);
    if (existe)
      throw new Error(
        "El documento ingresado pertenece a otro cliente registrado.",
      );
    await repository.actualizar(id, data);
  }

  async alternarEstado(id, estado) {
    await repository.cambiarEstado(id, estado);
  }

  async eliminarCliente(id) {
    try {
      await repository.eliminar(id);
    } catch (error) {
      if (error.number === 547) {
        throw new Error(
          "Este cliente ya tiene historial de ventas o cotizaciones en el sistema. Utilice la opción 'Suspender'.",
        );
      }
      throw new Error("Error interno al intentar eliminar el cliente.");
    }
  }

  async consultarDocumento(tipo, documento) {
    if (tipo === "dni" && !regexDNI.test(documento))
      throw new Error("El DNI debe tener exactamente 8 dígitos numéricos.");
    if (tipo === "ruc" && !regexRUC.test(documento))
      throw new Error("El RUC debe tener exactamente 11 dígitos numéricos.");

    const token = process.env.DECOLECTA_TOKEN;
    const url =
      tipo === "dni"
        ? `https://api.decolecta.com/v1/reniec/dni?numero=${documento}`
        : `https://api.decolecta.com/v1/sunat/ruc?numero=${documento}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const dataApi = await response.json();

    if (!response.ok)
      throw new Error(
        dataApi.message || "Documento no válido en RENIEC/SUNAT.",
      );

    const payload = dataApi.data ? dataApi.data : dataApi;
    return {
      nombreCompleto:
        payload.full_name ||
        payload.razon_social ||
        payload.company_name ||
        "Nombre no disponible",
      direccion:
        payload.address || payload.direccion || payload.domicilio_fiscal || "",
    };
  }
}
module.exports = new ClienteService();