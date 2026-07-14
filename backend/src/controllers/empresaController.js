const empresaService = require("../services/empresaService");

const obtenerEmpresa = async (req, res) => {
  try {
    const data = await empresaService.obtenerEmpresa();
    res.json({ success: true, data });
  } catch (error) {
    res.status(404).json({ success: false, mensaje: error.message });
  }
};

const guardarEmpresa = async (req, res) => {
  try {
    await empresaService.guardarEmpresa(req.body);
    res.json({
      success: true,
      mensaje: "Datos de la empresa actualizados correctamente.",
    });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

module.exports = { obtenerEmpresa, guardarEmpresa };