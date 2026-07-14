const webConfigService = require("../services/webConfigService");

const getConfigPublica = async (req, res) => {
  try {
    const data = await webConfigService.obtenerPublica();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

const actualizarLogo = async (req, res) => {
  try {
    const url = await webConfigService.agregarLogo(req.file);
    res.json({
      success: true,
      mensaje: "Logo agregado con éxito.",
      logoURL: url,
    });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const establecerLogoPrincipal = async (req, res) => {
  try {
    await webConfigService.activarLogo(req.params.id);
    res.json({ success: true, mensaje: "Logo principal actualizado." });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const eliminarLogo = async (req, res) => {
  try {
    await webConfigService.eliminarLogo(req.params.id);
    res.json({ success: true, mensaje: "Logo eliminado correctamente." });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const crearSlider = async (req, res) => {
  try {
    await webConfigService.crearSlider(
      req.body.Titulo,
      req.body.Descripcion,
      req.file,
    );
    res.json({
      success: true,
      mensaje: "Banner publicitario creado con éxito.",
    });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const actualizarSlider = async (req, res) => {
  try {
    await webConfigService.actualizarSlider(
      req.params.id,
      req.body.Titulo,
      req.body.Descripcion,
      req.file,
    );
    res.json({ success: true, mensaje: "Banner actualizado con éxito." });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const toggleSliderEstado = async (req, res) => {
  try {
    await webConfigService.cambiarEstadoSlider(req.params.id, req.body.estado);
    res.json({ success: true, mensaje: "Visibilidad del banner actualizada." });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const eliminarSlider = async (req, res) => {
  try {
    await webConfigService.eliminarSlider(req.params.id);
    res.json({ success: true, mensaje: "Banner eliminado permanentemente." });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

module.exports = {
  getConfigPublica,
  actualizarLogo,
  establecerLogoPrincipal,
  eliminarLogo,
  crearSlider,
  actualizarSlider,
  toggleSliderEstado,
  eliminarSlider,
};