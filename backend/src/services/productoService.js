const repository = require("../repositories/productoRepository");

class ProductoService {
  validarProducto(data) {
    if (!data.Codigo || !data.ModeloBase || !data.CategoriaID)
      throw new Error("Código, Modelo y Categoría son obligatorios.");
    if (parseFloat(data.PrecioCompra) < 0 || parseFloat(data.PrecioVenta) < 0)
      throw new Error("Los precios no pueden ser negativos.");
    if (parseInt(data.StockMinimo) < 0)
      throw new Error("El stock mínimo no puede ser negativo.");
  }

  async crearProducto(data, filename) {
    this.validarProducto(data);
    const nombreFamilia = await repository.obtenerNombreCategoria(
      data.CategoriaID,
    );
    const nombreFinal =
      `${nombreFamilia} ${data.ModeloBase.trim()} ${data.Atributo ? "- " + data.Atributo.trim() : ""}`.trim();

    const payload = {
      ...data,
      NombreFinal: nombreFinal,
      Descripcion: data.Descripcion ? data.Descripcion.trim() : "",
      ImagenURL: filename ? `/uploads/productos/${filename}` : null,
    };
    await repository.crear(payload);
  }

  async actualizarProducto(id, data, filename) {
    this.validarProducto(data);
    const nombreFamilia = await repository.obtenerNombreCategoria(
      data.CategoriaID,
    );
    const nombreFinal =
      `${nombreFamilia} ${data.ModeloBase.trim()} ${data.Atributo ? "- " + data.Atributo.trim() : ""}`.trim();

    const payload = {
      ...data,
      NombreFinal: nombreFinal,
      Descripcion: data.Descripcion ? data.Descripcion.trim() : "",
      ImagenURL: filename
        ? `/uploads/productos/${filename}`
        : data.ImagenURL || null,
    };
    await repository.actualizar(id, payload);
  }

  async ajustarStock(data) {
    const cantAjuste = parseInt(data.cantidad);
    if (cantAjuste <= 0)
      throw new Error("La cantidad a ajustar debe ser mayor a 0.");

    try {
      await repository.ajustarStockTransaction({
        ...data,
        cantAjuste,
        motivo: data.motivo.trim(),
      });
    } catch (err) {
      if (err.message === "INSUFFICIENT_STOCK")
        throw new Error("Stock insuficiente para realizar esta salida.");
      throw new Error("Error crítico al procesar el ajuste de almacén.");
    }
  }

  async eliminarProducto(id) {
    try {
      await repository.eliminar(id);
    } catch (error) {
      if (error.number === 547)
        throw new Error(
          "No se puede eliminar porque existen movimientos en el Kardex. Desactívelo en su lugar.",
        );
      throw new Error("Error interno al eliminar el producto.");
    }
  }
}
module.exports = new ProductoService();