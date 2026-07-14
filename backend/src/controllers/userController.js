const userService = require("../services/userService");

const getUsers = async (req, res) => {
  try {
    res.json(await userService.listar());
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al listar usuarios." });
  }
};

const createUser = async (req, res) => {
  try {
    await userService.crearUsuario(req.body);
    res.json({ success: true, mensaje: "Usuario creado correctamente." });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    await userService.actualizarUsuario(req.params.id, req.body);
    res.json({
      success: true,
      mensaje: "Usuario actualizado de manera segura.",
    });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const toggleBlockUser = async (req, res) => {
  try {
    await userService.alternarEstado(req.params.id, req.body.estado);
    res.json({
      success: true,
      mensaje: req.body.estado
        ? "Acceso desbloqueado."
        : "Acceso bloqueado temporalmente.",
    });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    await userService.eliminarUsuario(req.params.id);
    res.json({
      success: true,
      mensaje: "Perfil de usuario eliminado permanentemente.",
    });
  } catch (error) {
    const isConstraint = error.message.includes("vinculados");
    if (isConstraint)
      return res.json({ success: false, mensaje: error.message });
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  toggleBlockUser,
  deleteUser,
  updateUser,
};