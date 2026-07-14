const perfilService = require("../services/perfilService");

const getPerfiles = async (req, res) => {
  try {
    res.json(await perfilService.listar());
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al listar los perfiles." });
  }
};

const createPerfil = async (req, res) => {
  try {
    await perfilService.crearPerfil(req.body);
    res.json({ success: true, mensaje: "Perfil registrado correctamente." });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const updatePerfil = async (req, res) => {
  try {
    await perfilService.actualizarPerfil(req.params.id, req.body);
    res.json({ success: true, mensaje: "Perfil actualizado." });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const toggleBlockPerfil = async (req, res) => {
  try {
    await perfilService.alternarEstado(req.params.id, req.body.estado);
    res.json({
      success: true,
      mensaje: req.body.estado ? "Perfil activado." : "Perfil desactivado.",
    });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const deletePerfil = async (req, res) => {
  try {
    await perfilService.eliminarPerfil(req.params.id);
    res.json({ success: true, mensaje: "Perfil eliminado permanentemente." });
  } catch (error) {
    const isConstraint = error.message.includes("usuarios vinculados");
    if (isConstraint)
      return res.json({ success: false, mensaje: error.message });
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

const getPermisosPerfil = async (req, res) => {
  try {
    res.json(await perfilService.obtenerPermisos(req.params.id));
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al obtener permisos." });
  }
};

const guardarPermisosPerfil = async (req, res) => {
  try {
    await perfilService.guardarPermisos(req.body.perfilId, req.body.modulos);
    res.json({ success: true, mensaje: "Permisos actualizados con éxito." });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

module.exports = {
  getPerfiles,
  createPerfil,
  updatePerfil,
  toggleBlockPerfil,
  deletePerfil,
  getPermisosPerfil,
  guardarPermisosPerfil,
};