const repository = require("../repositories/userRepository");
const bcrypt = require("bcryptjs");

const regexPwdFuerte =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&._-]{8,}$/;
const regexBasura = /([a-zA-Z0-9])\1\1/;
const regexUsuarioValido = /^[a-zA-Z]+$/;

class UserService {
  validarRaiz(id, accion) {
    if (parseInt(id) === 1)
      throw new Error(
        `Infracción de seguridad: La cuenta raíz no puede ser ${accion}.`,
      );
  }

  validarDatos(data, esEdicion = false) {
    if (!data.Nombre || !data.Usuario || !data.Correo || !data.PerfilID)
      throw new Error("Los datos principales son obligatorios.");
    if (
      regexBasura.test(data.Nombre.trim()) ||
      regexBasura.test(data.Usuario.trim())
    )
      throw new Error("Registro bloqueado por detección de texto ilógico.");
    if (!regexUsuarioValido.test(data.Usuario.trim()))
      throw new Error(
        "El usuario no es válido. No se permiten números ni espacios.",
      );

    if (
      !esEdicion ||
      (esEdicion && data.Password && data.Password.trim() !== "")
    ) {
      if (!regexPwdFuerte.test(data.Password.trim()))
        throw new Error(
          "La contraseña es débil. Requiere mayúscula, minúscula, número y 8 caracteres.",
        );
    }
  }

  async listar() {
    return await repository.listar();
  }

  async crearUsuario(data) {
    this.validarDatos(data, false);
    const existe = await repository.buscarPorUsuario(data.Usuario.trim());
    if (existe)
      throw new Error("El nombre de usuario ya está registrado en el sistema.");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.Password.trim(), salt);

    await repository.crear({
      PerfilID: data.PerfilID,
      Usuario: data.Usuario.trim(),
      Nombre: data.Nombre.trim(),
      Correo: data.Correo.trim(),
      PasswordHash: passwordHash,
    });
  }

  async actualizarUsuario(id, data) {
    this.validarDatos(data, true);
    const existe = await repository.buscarPorUsuario(data.Usuario.trim(), id);
    if (existe)
      throw new Error("El nombre de usuario ya pertenece a otra cuenta.");

    let perfilFinal = data.PerfilID;
    if (parseInt(id) === 1) perfilFinal = 1; 

    let passwordHash = null;
    if (data.Password && data.Password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(data.Password.trim(), salt);
    }

    await repository.actualizar(id, {
      PerfilID: perfilFinal,
      Usuario: data.Usuario.trim(),
      Nombre: data.Nombre.trim(),
      Correo: data.Correo.trim(),
      PasswordHash: passwordHash,
    });
  }

  async alternarEstado(id, estado) {
    this.validarRaiz(id, "bloqueada");
    await repository.cambiarEstado(id, estado);
  }

  async eliminarUsuario(id) {
    this.validarRaiz(id, "eliminada");
    try {
      await repository.eliminar(id);
    } catch (error) {
      if (error.number === 547)
        throw new Error(
          "Existen registros vinculados a este usuario. Inactívelo en lugar de eliminarlo.",
        );
      throw new Error("Error al eliminar el usuario de la base de datos.");
    }
  }
}
module.exports = new UserService();