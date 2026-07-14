const service = require("../services/descuentoService");

const getDescuentos = async (req, res) => {
  try { res.json(await service.listar()); }
  catch (e) { res.status(500).json({ success: false, mensaje: "Error al listar." }); }
};

const getDescuentosVigentes = async (req, res) => {
  try { res.json(await service.listarVigentes()); }
  catch (e) { res.status(500).json({ success: false, mensaje: "Error al listar vigentes." }); }
};

const getDescuentoById = async (req, res) => {
  try {
    const data = await service.obtenerPorId(req.params.id);
    if (!data) return res.status(404).json({ success: false, mensaje: "No encontrado" });
    res.json(data);
  } catch (e) { res.status(500).json({ success: false, mensaje: "Error al obtener descuento." }); }
};

const createDescuento = async (req, res) => {
  try {
    await service.validarYGuardar(req.body);
    res.status(201).json({ success: true, mensaje: "Creado con éxito." });
  } catch (e) { res.status(400).json({ success: false, mensaje: e.message }); }
};

const updateDescuento = async (req, res) => {
  try {
    await service.validarYGuardar(req.body, req.params.id);
    res.json({ success: true, mensaje: "Actualizado con éxito." });
  } catch (e) { res.status(400).json({ success: false, mensaje: e.message }); }
};

const deleteDescuento = async (req, res) => {
  try {
    await service.eliminar(req.params.id);
    res.json({ success: true, mensaje: "Eliminado con éxito." });
  } catch (e) { res.status(500).json({ success: false, mensaje: "Error al eliminar." }); }
};

const buscarProductosDsc = async (req, res) => {
  try { res.json(await service.buscarProductos(req.query.q || "")); }
  catch (e) { res.status(500).json({ success: false, mensaje: "Error en la búsqueda." }); }
};

module.exports = {
  getDescuentos, getDescuentosVigentes, getDescuentoById,
  createDescuento, updateDescuento, deleteDescuento, buscarProductosDsc
};