const repository = require("../repositories/empresaRepository");

class EmpresaService {
  async obtenerEmpresa() {
    const empresa = await repository.obtenerConfiguracion();
    if (!empresa) throw new Error("Configuración no encontrada.");
    return empresa;
  }

  async guardarEmpresa(data) {
    if (!data.RUC || data.RUC.length !== 11) {
      throw new Error(
        "El RUC de la empresa es obligatorio y debe tener 11 dígitos.",
      );
    }
    await repository.upsertEmpresa(data);
  }
}
module.exports = new EmpresaService();
