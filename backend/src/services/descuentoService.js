const repository = require("../repositories/descuentoRepository");

class DescuentoService {
  async listar() { return await repository.getAll(); }
  async obtenerPorId(id) { return await repository.getById(id); }
  async listarVigentes() { return await repository.getVigentes(); }
  async eliminar(id) { return await repository.delete(id); }
  async buscarProductos(q) { return await repository.buscarProductos(q); } // 🚀 Nuevo

  async validarYGuardar(data, id = null) {
    if (new Date(data.FechaInicio) >= new Date(data.FechaFin))
      throw new Error("La fecha de inicio debe ser anterior a la fecha fin.");

    const existentes = await repository.getAll();
    const conflicto = existentes.find(d =>
      d.DescuentoID !== parseInt(id) &&
      d.AplicaA === data.AplicaA &&
      (d.ReferenciaID === data.ReferenciaID || data.AplicaA === 'GENERAL') &&
      new Date(data.FechaInicio) <= new Date(d.FechaFin) &&
      new Date(data.FechaFin) >= new Date(d.FechaInicio)
    );

    if (conflicto) throw new Error(`Conflicto: Ya existe un descuento (${conflicto.Nombre}) en esas fechas para esta referencia.`);

    if (id) await repository.update(id, data);
    else await repository.create(data);
  }
}
module.exports = new DescuentoService();