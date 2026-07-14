const repository = require("../repositories/categoriasRepository");

const regexBasura = /([a-zA-Z0-9])\1\1/;
const regexNombre = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-&]+$/;

class CategoriasService {
  async listar(terminoBusqueda) {
    return await repository.listar(terminoBusqueda);
  }

  validarNombre(nombre) {
    if (!nombre || nombre.trim() === "")
      throw new Error("El nombre de la categoría es obligatorio.");
    if (!regexNombre.test(nombre) || regexBasura.test(nombre)) {
      throw new Error(
        "El nombre contiene caracteres no permitidos o texto sin sentido.",
      );
    }
  }

  async crearCategoria(data) {
    this.validarNombre(data.Nombre);
    const existe = await repository.buscarPorNombre(data.Nombre.trim());
    if (existe)
      throw new Error(
        "Ya existe una categoría con ese nombre en la base de datos.",
      );

    await repository.crear(
      data.Nombre.trim(),
      data.Descripcion ? data.Descripcion.trim() : "",
    );
  }

  async actualizarCategoria(id, data) {
    this.validarNombre(data.Nombre);
    const existe = await repository.buscarPorNombre(data.Nombre.trim());

    if (existe && existe.CategoriaID != id) {
      throw new Error("El nombre ingresado ya le pertenece a otra categoría.");
    }

    await repository.actualizar(
      id,
      data.Nombre.trim(),
      data.Descripcion ? data.Descripcion.trim() : "",
    );
  }

  async alternarEstado(id, estado) {
    await repository.cambiarEstado(id, estado);
  }

  async eliminarCategoria(id) {
    try {
      await repository.eliminar(id);
    } catch (error) {
      if (error.number === 547) {
        throw new Error(
          "No se puede eliminar la categoría porque hay productos asociados a ella.",
        );
      }
      throw new Error("Error interno al intentar eliminar la categoría.");
    }
  }
}

module.exports = new CategoriasService();