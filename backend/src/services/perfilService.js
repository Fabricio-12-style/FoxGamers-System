const repository = require("../repositories/perfilRepository");

const ROLES_PERMITIDOS = [
  "Administrador",
  "Supervisor",
  "Vendedor",
  "Almacenero",
  "Soporte Tecnico",
];

class PerfilService {
  validarRaiz(id, accion) {
    if (parseInt(id) === 1)
      throw new Error(`El perfil Administrador Raíz no puede ser ${accion}.`);
  }

  validarDatos(nombre, descripcion) {
    if (!nombre || !nombre.trim())
      throw new Error("El nombre del perfil es obligatorio.");
    if (!ROLES_PERMITIDOS.includes(nombre.trim()))
      throw new Error("Designación de rol comercial inválida o no autorizada.");
    if (!descripcion || descripcion.trim().length < 10)
      throw new Error(
        "La descripción analítica es obligatoria (Mínimo 10 caracteres).",
      );
  }

  async listar() {
    return await repository.listar();
  }

  async crearPerfil(data) {
    this.validarDatos(data.Nombre, data.Descripcion);
    const existe = await repository.buscarPorNombre(data.Nombre.trim());
    if (existe)
      throw new Error("Ya existe un perfil con ese nombre en los registros.");
    await repository.crear({
      Nombre: data.Nombre.trim(),
      Descripcion: data.Descripcion.trim(),
    });
  }

  async actualizarPerfil(id, data) {
    this.validarRaiz(id, "modificado");
    this.validarDatos(data.Nombre, data.Descripcion);
    await repository.actualizar(id, {
      Nombre: data.Nombre.trim(),
      Descripcion: data.Descripcion.trim(),
    });
  }

  async alternarEstado(id, estado) {
    this.validarRaiz(id, "desactivado");
    await repository.cambiarEstado(id, estado);
  }

  async eliminarPerfil(id) {
    this.validarRaiz(id, "eliminado");
    try {
      await repository.eliminar(id);
    } catch (error) {
      if (error.number === 547)
        throw new Error(
          "Existen usuarios vinculados a este perfil. Primero cámbialos de rol o elimínalos.",
        );
      throw new Error("Error interno al intentar eliminar el perfil.");
    }
  }

  async obtenerPermisos(id) {
    return await repository.obtenerPermisos(id);
  }

  async guardarPermisos(perfilId, modulos) {
    if (!perfilId || !Array.isArray(modulos))
      throw new Error("Estructura de datos para permisos inválida.");

    if (parseInt(perfilId) === 1 && !modulos.includes("configuracionWeb")) {
      modulos.push("configuracionWeb");
    }
    await repository.guardarPermisosTransaction(perfilId, modulos);
  }
}
module.exports = new PerfilService();
